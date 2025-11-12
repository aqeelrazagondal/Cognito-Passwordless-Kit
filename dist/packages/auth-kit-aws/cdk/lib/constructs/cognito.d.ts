import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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
}
export declare class CognitoConstruct extends Construct {
    readonly userPool: cognito.UserPool;
    readonly publicClient: cognito.UserPoolClient;
    readonly triggerFunctions: lambda.Function[];
    constructor(scope: Construct, id: string, props: CognitoConstructProps);
}
