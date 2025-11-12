import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface DynamoDBConstructProps {
    environment: string;
    kmsKey: kms.Key;
}
export declare class DynamoDBConstruct extends Construct {
    readonly challengesTable: dynamodb.Table;
    readonly devicesTable: dynamodb.Table;
    readonly countersTable: dynamodb.Table;
    readonly auditLogsTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: DynamoDBConstructProps);
}
