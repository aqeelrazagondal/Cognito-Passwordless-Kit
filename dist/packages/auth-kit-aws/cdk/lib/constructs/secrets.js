"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const constructs_1 = require("constructs");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
class SecretsConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, kmsKey } = props;
        this.jwtSecret = this.createJWTSecret(environment, kmsKey);
        const createTwilioSecret = this.node.tryGetContext('createTwilioSecret') === true;
        const createCaptchaSecret = this.node.tryGetContext('createCaptchaSecret') === true;
        const createVonageSecret = this.node.tryGetContext('createVonageSecret') === true;
        if (createTwilioSecret) {
            this.twilioSecret = this.createTwilioSecret(environment, kmsKey);
        }
        if (createCaptchaSecret) {
            this.captchaSecret = this.createCaptchaSecret(environment, kmsKey);
        }
        if (createVonageSecret) {
            this.vonageSecret = this.createVonageSecret(environment, kmsKey);
        }
        this.allSecrets = [
            this.jwtSecret,
            ...(this.twilioSecret ? [this.twilioSecret] : []),
            ...(this.captchaSecret ? [this.captchaSecret] : []),
            ...(this.vonageSecret ? [this.vonageSecret] : []),
        ];
        new cdk.CfnOutput(this, 'JWTSecretArn', {
            value: this.jwtSecret.arn,
            description: 'JWT Secret ARN in Secrets Manager',
            exportName: `AuthKit-${environment}-JWTSecretArn`,
        });
    }
    createJWTSecret(environment, kmsKey) {
        const secretName = `authkit-jwt-secret-${environment}`;
        const initialSecret = (0, crypto_1.randomBytes)(32).toString('base64');
        const secret = new secretsmanager.Secret(this, 'JWTSecret', {
            secretName,
            description: `JWT signing key for AuthKit (${environment})`,
            encryptionKey: kmsKey,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ secret: initialSecret }),
                generateStringKey: 'secret',
                excludeCharacters: '"@/\\',
                passwordLength: 32,
            },
            removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        secret.addRotationSchedule('JWTSecretRotation', {
            rotationLambda: this.createRotationLambda(secret, kmsKey),
            automaticallyAfter: cdk.Duration.days(30),
        });
        return {
            secret,
            arn: secret.secretArn,
            name: secretName,
        };
    }
    createTwilioSecret(environment, kmsKey) {
        const secretName = `authkit-twilio-${environment}`;
        const secret = new secretsmanager.Secret(this, 'TwilioSecret', {
            secretName,
            description: `Twilio API credentials for AuthKit (${environment})`,
            encryptionKey: kmsKey,
            secretObjectValue: {
                accountSid: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_ACCOUNT_SID'),
                authToken: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_AUTH_TOKEN'),
                fromNumber: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_FROM_NUMBER'),
                whatsappNumber: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_WHATSAPP_NUMBER'),
            },
            removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        return {
            secret,
            arn: secret.secretArn,
            name: secretName,
        };
    }
    createCaptchaSecret(environment, kmsKey) {
        const secretName = `authkit-captcha-${environment}`;
        const secret = new secretsmanager.Secret(this, 'CaptchaSecret', {
            secretName,
            description: `CAPTCHA credentials for AuthKit (${environment})`,
            encryptionKey: kmsKey,
            secretObjectValue: {
                provider: cdk.SecretValue.unsafePlainText('hcaptcha'),
                secretKey: cdk.SecretValue.unsafePlainText('REPLACE_WITH_CAPTCHA_SECRET_KEY'),
                siteKey: cdk.SecretValue.unsafePlainText('REPLACE_WITH_CAPTCHA_SITE_KEY'),
            },
            removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        return {
            secret,
            arn: secret.secretArn,
            name: secretName,
        };
    }
    createVonageSecret(environment, kmsKey) {
        const secretName = `authkit-vonage-${environment}`;
        const secret = new secretsmanager.Secret(this, 'VonageSecret', {
            secretName,
            description: `Vonage API credentials for AuthKit (${environment})`,
            encryptionKey: kmsKey,
            secretObjectValue: {
                apiKey: cdk.SecretValue.unsafePlainText('REPLACE_WITH_VONAGE_API_KEY'),
                apiSecret: cdk.SecretValue.unsafePlainText('REPLACE_WITH_VONAGE_API_SECRET'),
                fromNumber: cdk.SecretValue.unsafePlainText('REPLACE_WITH_VONAGE_FROM_NUMBER'),
            },
            removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        return {
            secret,
            arn: secret.secretArn,
            name: secretName,
        };
    }
    createRotationLambda(secret, kmsKey) {
        const rotationFn = new lambdaNodejs.NodejsFunction(this, 'JWTSecretRotation', {
            entry: path.join(__dirname, '../../../lambda/webhooks/rotate-jwt-key.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                SECRET_ARN: secret.secretArn,
            },
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['@aws-sdk/*'],
            },
        });
        secret.grantRead(rotationFn);
        secret.grantWrite(rotationFn);
        kmsKey.grantDecrypt(rotationFn);
        rotationFn.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'secretsmanager:DescribeSecret',
                'secretsmanager:GetSecretValue',
                'secretsmanager:PutSecretValue',
                'secretsmanager:UpdateSecretVersionStage',
            ],
            resources: [secret.secretArn],
        }));
        return rotationFn;
    }
    grantReadAccess(functions) {
        for (const secretInfo of this.allSecrets) {
            secretInfo.secret.grantRead(...functions);
        }
    }
    grantReadAccessToFunction(fn) {
        for (const secretInfo of this.allSecrets) {
            secretInfo.secret.grantRead(fn);
        }
    }
}
exports.SecretsConstruct = SecretsConstruct;
//# sourceMappingURL=secrets.js.map