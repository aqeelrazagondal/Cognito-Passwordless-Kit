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
exports.ApiGatewayConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const apigatewayIntegrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const apigatewayAuth = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const path = __importStar(require("path"));
class ApiGatewayConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, userPool, tables, comms, kmsKey, secrets } = props;
        this.httpApi = new apigateway.HttpApi(this, 'HttpApi', {
            apiName: `authkit-${environment}`,
            corsPreflight: {
                allowHeaders: ['Authorization', 'Content-Type', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
                allowMethods: [apigateway.CorsHttpMethod.ANY],
                allowOrigins: ['*'],
                maxAge: cdk.Duration.days(10),
            },
            createDefaultStage: true,
            description: 'AuthKit API',
        });
        const authorizer = new apigatewayAuth.HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
            userPoolClients: [],
            identitySource: ['$request.header.Authorization'],
        });
        const baseEnv = {
            ENVIRONMENT: environment,
            CHALLENGES_TABLE: tables.challenges.tableName,
            DEVICES_TABLE: tables.devices.tableName,
            COUNTERS_TABLE: tables.counters.tableName,
            SNS_TOPIC_ARN: comms.snsTopic.topicArn,
            SES_IDENTITY: comms.sesIdentity,
            USER_POOL_ID: userPool.userPoolId,
        };
        if (secrets) {
            baseEnv.JWT_SECRET_ARN = secrets.jwtSecretArn;
            if (secrets.twilioSecretArn) {
                baseEnv.TWILIO_SECRET_ARN = secrets.twilioSecretArn;
            }
            if (secrets.captchaSecretArn) {
                baseEnv.CAPTCHA_SECRET_ARN = secrets.captchaSecretArn;
            }
            if (secrets.vonageSecretArn) {
                baseEnv.VONAGE_SECRET_ARN = secrets.vonageSecretArn;
            }
        }
        const baseLambdaProps = {
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: baseEnv,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
                sourceMap: true,
                target: 'es2020',
            },
        };
        const startAuthFn = new lambdaNodejs.NodejsFunction(this, 'StartAuthFunction', {
            ...baseLambdaProps,
            functionName: `authkit-start-auth-${environment}`,
            entry: path.join(__dirname, '../../../lambda/handlers/auth/start.ts'),
            handler: 'handler',
            description: 'Start authentication flow',
        });
        const verifyAuthFn = new lambdaNodejs.NodejsFunction(this, 'VerifyAuthFunction', {
            ...baseLambdaProps,
            functionName: `authkit-verify-auth-${environment}`,
            entry: path.join(__dirname, '../../../lambda/handlers/auth/verify.ts'),
            handler: 'handler',
            description: 'Verify OTP/magic link',
        });
        const resendAuthFn = new lambdaNodejs.NodejsFunction(this, 'ResendAuthFunction', {
            ...baseLambdaProps,
            functionName: `authkit-resend-auth-${environment}`,
            entry: path.join(__dirname, '../../../lambda/handlers/auth/resend.ts'),
            handler: 'handler',
            description: 'Resend authentication code',
        });
        const getTokensFn = new lambdaNodejs.NodejsFunction(this, 'GetTokensFunction', {
            ...baseLambdaProps,
            functionName: `authkit-get-tokens-${environment}`,
            entry: path.join(__dirname, '../../../lambda/handlers/auth/getTokens.ts'),
            handler: 'handler',
            description: 'Get JWT tokens',
        });
        const bindDeviceFn = new lambdaNodejs.NodejsFunction(this, 'BindDeviceFunction', {
            ...baseLambdaProps,
            functionName: `authkit-bind-device-${environment}`,
            entry: path.join(__dirname, '../../../lambda/handlers/device/bind.ts'),
            handler: 'handler',
            description: 'Bind device to user',
        });
        const revokeDeviceFn = new lambdaNodejs.NodejsFunction(this, 'RevokeDeviceFunction', {
            ...baseLambdaProps,
            functionName: `authkit-revoke-device-${environment}`,
            entry: path.join(__dirname, '../../../lambda/handlers/device/revoke.ts'),
            handler: 'handler',
            description: 'Revoke device access',
        });
        const allFunctions = [
            startAuthFn,
            verifyAuthFn,
            resendAuthFn,
            getTokensFn,
            bindDeviceFn,
            revokeDeviceFn,
        ];
        allFunctions.forEach((fn) => {
            tables.challenges.grantReadWriteData(fn);
            tables.devices.grantReadWriteData(fn);
            tables.counters.grantReadWriteData(fn);
            comms.snsTopic.grantPublish(fn);
            fn.addToRolePolicy(new iam.PolicyStatement({
                actions: ['ses:SendEmail', 'ses:SendRawEmail'],
                resources: ['*'],
            }));
            kmsKey.grantEncryptDecrypt(fn);
            fn.addToRolePolicy(new iam.PolicyStatement({
                actions: [
                    'cognito-idp:AdminGetUser',
                    'cognito-idp:AdminInitiateAuth',
                    'cognito-idp:AdminRespondToAuthChallenge',
                ],
                resources: [userPool.userPoolArn],
            }));
        });
        const startAuthIntegration = new apigatewayIntegrations.HttpLambdaIntegration('StartAuthIntegration', startAuthFn);
        const verifyAuthIntegration = new apigatewayIntegrations.HttpLambdaIntegration('VerifyAuthIntegration', verifyAuthFn);
        const resendAuthIntegration = new apigatewayIntegrations.HttpLambdaIntegration('ResendAuthIntegration', resendAuthFn);
        const getTokensIntegration = new apigatewayIntegrations.HttpLambdaIntegration('GetTokensIntegration', getTokensFn);
        const bindDeviceIntegration = new apigatewayIntegrations.HttpLambdaIntegration('BindDeviceIntegration', bindDeviceFn);
        const revokeDeviceIntegration = new apigatewayIntegrations.HttpLambdaIntegration('RevokeDeviceIntegration', revokeDeviceFn);
        this.httpApi.addRoutes({
            path: '/auth/start',
            methods: [apigateway.HttpMethod.POST],
            integration: startAuthIntegration,
        });
        this.httpApi.addRoutes({
            path: '/auth/verify',
            methods: [apigateway.HttpMethod.POST],
            integration: verifyAuthIntegration,
        });
        this.httpApi.addRoutes({
            path: '/auth/resend',
            methods: [apigateway.HttpMethod.POST],
            integration: resendAuthIntegration,
        });
        this.httpApi.addRoutes({
            path: '/auth/tokens',
            methods: [apigateway.HttpMethod.GET],
            integration: getTokensIntegration,
            authorizer,
        });
        this.httpApi.addRoutes({
            path: '/device/bind',
            methods: [apigateway.HttpMethod.POST],
            integration: bindDeviceIntegration,
            authorizer,
        });
        this.httpApi.addRoutes({
            path: '/device/revoke',
            methods: [apigateway.HttpMethod.DELETE],
            integration: revokeDeviceIntegration,
            authorizer,
        });
        const healthFn = new lambda.Function(this, 'HealthFunction', {
            functionName: `authkit-health-${environment}`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline('exports.handler=async()=>({statusCode:200,headers:{"content-type":"application/json"},body:JSON.stringify({status:"ok"})});'),
            description: 'Health check handler',
        });
        const healthIntegration = new apigatewayIntegrations.HttpLambdaIntegration('HealthIntegration', healthFn);
        this.httpApi.addRoutes({
            path: '/health',
            methods: [apigateway.HttpMethod.GET],
            integration: healthIntegration,
        });
        this.handlerFunctions = [...allFunctions, healthFn];
    }
}
exports.ApiGatewayConstruct = ApiGatewayConstruct;
//# sourceMappingURL=api-gateway.js.map