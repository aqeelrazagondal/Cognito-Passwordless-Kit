import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayAuth from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface ApiGatewayConstructProps {
  environment: string;
  userPool: cognito.UserPool;
  tables: {
    challenges: dynamodb.Table;
    devices: dynamodb.Table;
    counters: dynamodb.Table;
  };
  comms: {
    snsTopic: sns.Topic;
    sesIdentity: string;
  };
  kmsKey: kms.Key;
  secrets?: {
    jwtSecretArn: string;
    twilioSecretArn?: string;
    captchaSecretArn?: string;
    vonageSecretArn?: string;
  };
}

export class ApiGatewayConstruct extends Construct {
  public readonly httpApi: apigateway.HttpApi;
  public readonly handlerFunctions: lambda.Function[];

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const { environment, userPool, tables, comms, kmsKey, secrets } = props;

    // Create HTTP API with CORS
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

    // Create Cognito authorizer
    const authorizer = new apigatewayAuth.HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
      userPoolClients: [], // all clients
      identitySource: ['$request.header.Authorization'],
    });

    // Lambda function base environment variables
    const baseEnv: { [key: string]: string } = {
      ENVIRONMENT: environment,
      CHALLENGES_TABLE: tables.challenges.tableName,
      DEVICES_TABLE: tables.devices.tableName,
      COUNTERS_TABLE: tables.counters.tableName,
      SNS_TOPIC_ARN: comms.snsTopic.topicArn,
      SES_IDENTITY: comms.sesIdentity,
      USER_POOL_ID: userPool.userPoolId,
    };

    // Add secret ARNs if provided
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

    // Lambda function base props
    const baseLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: baseEnv,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
      },
    };

    // Auth Handlers (Public - No Authorizer)
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

    // Token Handler (Protected - Requires Authorizer)
    const getTokensFn = new lambdaNodejs.NodejsFunction(this, 'GetTokensFunction', {
      ...baseLambdaProps,
      functionName: `authkit-get-tokens-${environment}`,
      entry: path.join(__dirname, '../../../lambda/handlers/auth/getTokens.ts'),
      handler: 'handler',
      description: 'Get JWT tokens',
    });

    // Device Handlers (Protected - Requires Authorizer)
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

    // Grant permissions to Lambda functions
    const allFunctions = [
      startAuthFn,
      verifyAuthFn,
      resendAuthFn,
      getTokensFn,
      bindDeviceFn,
      revokeDeviceFn,
    ];

    allFunctions.forEach((fn) => {
      // DynamoDB permissions
      tables.challenges.grantReadWriteData(fn);
      tables.devices.grantReadWriteData(fn);
      tables.counters.grantReadWriteData(fn);

      // SNS permissions
      comms.snsTopic.grantPublish(fn);

      // SES permissions
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['ses:SendEmail', 'ses:SendRawEmail'],
          resources: ['*'],
        }),
      );

      // KMS permissions
      kmsKey.grantEncryptDecrypt(fn);

      // Cognito permissions
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'cognito-idp:AdminGetUser',
            'cognito-idp:AdminInitiateAuth',
            'cognito-idp:AdminRespondToAuthChallenge',
          ],
          resources: [userPool.userPoolArn],
        }),
      );
    });

    // Create Lambda integrations
    const startAuthIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'StartAuthIntegration',
      startAuthFn,
    );

    const verifyAuthIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'VerifyAuthIntegration',
      verifyAuthFn,
    );

    const resendAuthIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'ResendAuthIntegration',
      resendAuthFn,
    );

    const getTokensIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'GetTokensIntegration',
      getTokensFn,
    );

    const bindDeviceIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'BindDeviceIntegration',
      bindDeviceFn,
    );

    const revokeDeviceIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'RevokeDeviceIntegration',
      revokeDeviceFn,
    );

    // Add routes - Public (No Authorizer)
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

    // Add routes - Protected (With Authorizer)
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

    // Health check (kept as simple inline function)
    const healthFn = new lambda.Function(this, 'HealthFunction', {
      functionName: `authkit-health-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(
        'exports.handler=async()=>({statusCode:200,headers:{"content-type":"application/json"},body:JSON.stringify({status:"ok"})});',
      ),
      description: 'Health check handler',
    });

    const healthIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'HealthIntegration',
      healthFn,
    );

    this.httpApi.addRoutes({
      path: '/health',
      methods: [apigateway.HttpMethod.GET],
      integration: healthIntegration,
    });

    // Export handler functions for observability
    this.handlerFunctions = [...allFunctions, healthFn];
  }
}
