import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface WebhooksConstructProps {
    environment: string;
    denylistTable: dynamodb.Table;
    bouncesTable: dynamodb.Table;
    kmsKey: kms.Key;
}
export declare class WebhooksConstruct extends Construct {
    readonly snsBounceHandler: lambda.Function;
    constructor(scope: Construct, id: string, props: WebhooksConstructProps);
    createSESNotificationTopic(environment: string): sns.Topic;
}
