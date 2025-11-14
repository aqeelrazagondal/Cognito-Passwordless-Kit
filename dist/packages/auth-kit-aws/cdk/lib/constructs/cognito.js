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
exports.CognitoConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNode = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const path = __importStar(require("path"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class CognitoConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, tables, comms, kmsKey, secrets } = props;
        const triggerEnvironment = {
            ENVIRONMENT: environment,
            CHALLENGES_TABLE: tables.challenges.tableName,
            DEVICES_TABLE: tables.devices.tableName,
            COUNTERS_TABLE: tables.counters.tableName,
            AUDIT_LOGS_TABLE: tables.auditLogs.tableName,
            SNS_TOPIC_ARN: comms.snsTopic.topicArn,
            SES_IDENTITY: comms.sesIdentity,
            AWS_REGION: cdk.Stack.of(this).region,
        };
        if (secrets) {
            triggerEnvironment.JWT_SECRET_ARN = secrets.jwtSecretArn;
            if (secrets.twilioSecretArn) {
                triggerEnvironment.TWILIO_SECRET_ARN = secrets.twilioSecretArn;
            }
            if (secrets.captchaSecretArn) {
                triggerEnvironment.CAPTCHA_SECRET_ARN = secrets.captchaSecretArn;
            }
            if (secrets.vonageSecretArn) {
                triggerEnvironment.VONAGE_SECRET_ARN = secrets.vonageSecretArn;
            }
        }
        const defineAuthChallengeFn = new lambdaNode.NodejsFunction(this, 'DefineAuthChallenge', {
            functionName: `authkit-define-auth-challenge-${environment}`,
            entry: path.join(__dirname, '../../../lambda/triggers/defineAuthChallenge.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            environment: triggerEnvironment,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['@aws-sdk/*'],
            },
        });
        const createAuthChallengeFn = new lambdaNode.NodejsFunction(this, 'CreateAuthChallenge', {
            functionName: `authkit-create-auth-challenge-${environment}`,
            entry: path.join(__dirname, '../../../lambda/triggers/createAuthChallenge.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            environment: triggerEnvironment,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['@aws-sdk/*'],
            },
        });
        const verifyAuthChallengeFn = new lambdaNode.NodejsFunction(this, 'VerifyAuthChallenge', {
            functionName: `authkit-verify-auth-challenge-${environment}`,
            entry: path.join(__dirname, '../../../lambda/triggers/verifyAuthChallengeResponse.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            environment: triggerEnvironment,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['@aws-sdk/*'],
            },
        });
        tables.challenges.grantReadWriteData(createAuthChallengeFn);
        tables.challenges.grantReadWriteData(verifyAuthChallengeFn);
        createAuthChallengeFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['sns:Publish'],
            resources: [comms.snsTopic.topicArn],
        }));
        createAuthChallengeFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'],
            conditions: {
                StringEquals: {
                    'ses:FromAddress': comms.sesIdentity,
                },
            },
        }));
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `authkit-${environment}`,
            selfSignUpEnabled: true,
            signInAliases: { email: true, phone: true, username: false, preferredUsername: false },
            autoVerify: { email: true, phone: true },
            standardAttributes: {
                email: { required: true, mutable: true },
                phoneNumber: { required: false, mutable: true },
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            mfa: cognito.Mfa.OPTIONAL,
            mfaSecondFactor: { sms: true, otp: true },
            removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            advancedSecurityMode: cognito.AdvancedSecurityMode.AUDIT,
            lambdaTriggers: {
                defineAuthChallenge: defineAuthChallengeFn,
                createAuthChallenge: createAuthChallengeFn,
                verifyAuthChallengeResponse: verifyAuthChallengeFn,
            },
        });
        this.publicClient = this.userPool.addClient('PublicClient', {
            userPoolClientName: `authkit-public-${environment}`,
            authFlows: {
                userSrp: true,
                custom: true,
            },
            oAuth: {
                flows: { implicitCodeGrant: true },
                callbackUrls: ['http://localhost/callback'],
                logoutUrls: ['http://localhost/logout'],
            },
            preventUserExistenceErrors: true,
        });
        this.triggerFunctions = [
            defineAuthChallengeFn,
            createAuthChallengeFn,
            verifyAuthChallengeFn,
        ];
    }
}
exports.CognitoConstruct = CognitoConstruct;
//# sourceMappingURL=cognito.js.map