import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
export interface ObservabilityConstructProps {
    environment: string;
    userPool: cognito.UserPool;
    api: apigateway.HttpApi;
    lambdaFunctions: lambda.Function[];
    tables: dynamodb.Table[];
    snsTopic?: sns.Topic;
    alarmTopic?: sns.Topic;
}
export declare class ObservabilityConstruct extends Construct {
    readonly dashboardUrl: string;
    readonly alarms: cloudwatch.Alarm[];
    constructor(scope: Construct, id: string, props: ObservabilityConstructProps);
}
