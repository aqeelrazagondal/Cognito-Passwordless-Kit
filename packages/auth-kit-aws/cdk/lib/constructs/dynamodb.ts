import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface DynamoDBConstructProps {
  environment: string;
  kmsKey: kms.Key;
}

/**
 * DynamoDB tables for AuthKit
 */
export class DynamoDBConstruct extends Construct {
  public readonly challengesTable: dynamodb.Table;
  public readonly devicesTable: dynamodb.Table;
  public readonly countersTable: dynamodb.Table;
  public readonly auditLogsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBConstructProps) {
    super(scope, id);

    const { environment, kmsKey } = props;
    const removalPolicy =
      environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // OTP Challenges Table
    this.challengesTable = new dynamodb.Table(this, 'ChallengesTable', {
      tableName: `authkit-challenges-${environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: kmsKey,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: environment === 'prod',
      removalPolicy,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for querying by identifier hash
    this.challengesTable.addGlobalSecondaryIndex({
      indexName: 'identifierHash-createdAt-index',
      partitionKey: { name: 'identifierHash', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying by status
    this.challengesTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Devices Table
    this.devicesTable = new dynamodb.Table(this, 'DevicesTable', {
      tableName: `authkit-devices-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // USER#userId
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING }, // DEVICE#deviceId
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: kmsKey,
      pointInTimeRecovery: environment === 'prod',
      removalPolicy,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for querying devices by fingerprint hash
    this.devicesTable.addGlobalSecondaryIndex({
      indexName: 'fingerprintHash-index',
      partitionKey: { name: 'fingerprintHash', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying trusted devices
    this.devicesTable.addGlobalSecondaryIndex({
      indexName: 'userId-trusted-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'trusted', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Rate Limit Counters Table
    this.countersTable = new dynamodb.Table(this, 'CountersTable', {
      tableName: `authkit-counters-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // scope#key
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: kmsKey,
      timeToLiveAttribute: 'ttl',
      removalPolicy,
    });

    // Audit Logs Table
    this.auditLogsTable = new dynamodb.Table(this, 'AuditLogsTable', {
      tableName: `authkit-audit-logs-${environment}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // DATE#YYYY-MM-DD
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING }, // TIMESTAMP#eventId
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: kmsKey,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecovery: environment === 'prod',
      removalPolicy,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for querying by event type
    this.auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'eventType-timestamp-index',
      partitionKey: { name: 'eventType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying by identifier hash (redacted)
    this.auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'identifierHash-timestamp-index',
      partitionKey: { name: 'identifierHash', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ChallengesTableName', {
      value: this.challengesTable.tableName,
      exportName: `AuthKit-${environment}-ChallengesTable`,
    });

    new cdk.CfnOutput(this, 'DevicesTableName', {
      value: this.devicesTable.tableName,
      exportName: `AuthKit-${environment}-DevicesTable`,
    });

    new cdk.CfnOutput(this, 'CountersTableName', {
      value: this.countersTable.tableName,
      exportName: `AuthKit-${environment}-CountersTable`,
    });

    new cdk.CfnOutput(this, 'AuditLogsTableName', {
      value: this.auditLogsTable.tableName,
      exportName: `AuthKit-${environment}-AuditLogsTable`,
    });
  }
}
