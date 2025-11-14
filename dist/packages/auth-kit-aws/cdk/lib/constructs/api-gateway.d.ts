import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
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
    secrets?: {
        jwtSecretArn: string;
        twilioSecretArn?: string;
        captchaSecretArn?: string;
        vonageSecretArn?: string;
    };
}
export declare class ApiGatewayConstruct extends Construct {
    readonly httpApi: apigateway.HttpApi;
    readonly handlerFunctions: lambda.Function[];
    constructor(scope: Construct, id: string, props: ApiGatewayConstructProps);
}
