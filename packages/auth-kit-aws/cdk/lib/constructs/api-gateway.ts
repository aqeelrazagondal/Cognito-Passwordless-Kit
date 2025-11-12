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
}

export class ApiGatewayConstruct extends Construct {
  public readonly httpApi: apigateway.HttpApi;
  public readonly handlerFunctions: lambda.Function[];

  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const { environment, userPool } = props;

    // Minimal HTTP API with CORS and Cognito authorizer prepared
    this.httpApi = new apigateway.HttpApi(this, 'HttpApi', {
      apiName: `authkit-${environment}`,
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [apigateway.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(10),
      },
      createDefaultStage: true,
      description: 'AuthKit API',
    });

    const authorizer = new apigatewayAuth.HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
      userPoolClients: [], // all clients for now
      identitySource: ['$request.header.Authorization'],
    });

    // Simple health lambda and route as an example (no table access yet)
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

    // Prepare container for future auth handlers
    this.handlerFunctions = [healthFn];
  }
}
