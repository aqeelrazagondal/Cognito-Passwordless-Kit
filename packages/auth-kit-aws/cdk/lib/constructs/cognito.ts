import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CognitoConstructProps {
  environment: string;
  tables: {
    challenges: dynamodb.Table;
    devices: dynamodb.Table;
    counters: dynamodb.Table;
    auditLogs: dynamodb.Table;
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

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly publicClient: cognito.UserPoolClient;
  public readonly triggerFunctions: lambda.Function[];

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    const { environment, tables, comms, kmsKey, secrets } = props;

    // Lambda trigger environment variables
    const triggerEnvironment: { [key: string]: string } = {
      ENVIRONMENT: environment,
      CHALLENGES_TABLE: tables.challenges.tableName,
      DEVICES_TABLE: tables.devices.tableName,
      COUNTERS_TABLE: tables.counters.tableName,
      AUDIT_LOGS_TABLE: tables.auditLogs.tableName,
      SNS_TOPIC_ARN: comms.snsTopic.topicArn,
      SES_IDENTITY: comms.sesIdentity,
      AWS_REGION: cdk.Stack.of(this).region,
    };

    // Add secret ARNs if provided
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

    // Define Auth Challenge Lambda
    const defineAuthChallengeFn = new lambdaNode.NodejsFunction(this, 'DefineAuthChallenge', {
      functionName: `authkit-define-auth-challenge-${environment}`,
      entry: path.join(__dirname, '../../../lambda/triggers/defineAuthChallenge.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: triggerEnvironment,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Create Auth Challenge Lambda
    const createAuthChallengeFn = new lambdaNode.NodejsFunction(this, 'CreateAuthChallenge', {
      functionName: `authkit-create-auth-challenge-${environment}`,
      entry: path.join(__dirname, '../../../lambda/triggers/createAuthChallenge.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: triggerEnvironment,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Verify Auth Challenge Response Lambda
    const verifyAuthChallengeFn = new lambdaNode.NodejsFunction(this, 'VerifyAuthChallenge', {
      functionName: `authkit-verify-auth-challenge-${environment}`,
      entry: path.join(__dirname, '../../../lambda/triggers/verifyAuthChallengeResponse.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: triggerEnvironment,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Grant permissions to Lambda functions
    tables.challenges.grantReadWriteData(createAuthChallengeFn);
    tables.challenges.grantReadWriteData(verifyAuthChallengeFn);

    // Grant SNS publish for SMS
    createAuthChallengeFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: [comms.snsTopic.topicArn],
    }));

    // Grant SES send email
    createAuthChallengeFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'ses:FromAddress': comms.sesIdentity,
        },
      },
    }));

    // Passwordless-oriented User Pool (no password required; using email/phone verification)
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
      // Wire Lambda triggers for CUSTOM_AUTH flow
      lambdaTriggers: {
        defineAuthChallenge: defineAuthChallengeFn,
        createAuthChallenge: createAuthChallengeFn,
        verifyAuthChallengeResponse: verifyAuthChallengeFn,
      },
    });

    // Public client for web/mobile apps
    this.publicClient = this.userPool.addClient('PublicClient', {
      userPoolClientName: `authkit-public-${environment}`,
      authFlows: {
        userSrp: true,
        custom: true, // Enable CUSTOM_AUTH flow
      },
      oAuth: {
        flows: { implicitCodeGrant: true },
        callbackUrls: ['http://localhost/callback'],
        logoutUrls: ['http://localhost/logout'],
      },
      preventUserExistenceErrors: true,
    });

    // Store trigger functions for observability
    this.triggerFunctions = [
      defineAuthChallengeFn,
      createAuthChallengeFn,
      verifyAuthChallengeFn,
    ];
  }
}
