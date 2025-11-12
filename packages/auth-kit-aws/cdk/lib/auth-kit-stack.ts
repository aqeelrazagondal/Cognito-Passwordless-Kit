import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoConstruct } from './constructs/cognito';
import { DynamoDBConstruct } from './constructs/dynamodb';
import { ApiGatewayConstruct } from './constructs/api-gateway';
import { KMSConstruct } from './constructs/kms';
import { CommsConstruct } from './constructs/comms';
import { ObservabilityConstruct } from './constructs/observability';

export interface AuthKitStackProps extends cdk.StackProps {
  environment: string;
}

export class AuthKitStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuthKitStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // KMS keys for encryption
    const kms = new KMSConstruct(this, 'KMS', { environment });

    // DynamoDB tables
    const dynamodb = new DynamoDBConstruct(this, 'DynamoDB', {
      environment,
      kmsKey: kms.key,
    });

    // Communication providers (SNS, SES)
    const comms = new CommsConstruct(this, 'Comms', {
      environment,
      kmsKey: kms.key,
    });

    // Cognito User Pool with Lambda triggers
    const cognito = new CognitoConstruct(this, 'Cognito', {
      environment,
      tables: {
        challenges: dynamodb.challengesTable,
        devices: dynamodb.devicesTable,
        counters: dynamodb.countersTable,
        auditLogs: dynamodb.auditLogsTable,
      },
      comms: {
        snsTopic: comms.snsTopic,
        sesIdentity: comms.sesIdentity,
      },
      kmsKey: kms.key,
    });

    // API Gateway for auth endpoints
    const api = new ApiGatewayConstruct(this, 'API', {
      environment,
      userPool: cognito.userPool,
      tables: {
        challenges: dynamodb.challengesTable,
        devices: dynamodb.devicesTable,
        counters: dynamodb.countersTable,
      },
      comms: {
        snsTopic: comms.snsTopic,
        sesIdentity: comms.sesIdentity,
      },
      kmsKey: kms.key,
    });

    // Observability (CloudWatch dashboards, alarms)
    const observability = new ObservabilityConstruct(this, 'Observability', {
      environment,
      userPool: cognito.userPool,
      api: api.httpApi,
      lambdaFunctions: [
        ...cognito.triggerFunctions,
        ...api.handlerFunctions,
      ],
      tables: [
        dynamodb.challengesTable,
        dynamodb.devicesTable,
        dynamodb.countersTable,
        dynamodb.auditLogsTable,
      ],
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: cognito.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: cognito.publicClient.userPoolClientId,
      description: 'Public App Client ID',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.httpApi.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: observability.dashboardUrl,
      description: 'CloudWatch Dashboard URL',
    });
  }
}
