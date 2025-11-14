/**
 * LocalStack setup for integration tests
 *
 * Provides utilities for setting up and tearing down LocalStack services
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';

const LOCALSTACK_ENDPOINT = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
const REGION = process.env.AWS_REGION || 'us-east-1';

const dynamoClient = new DynamoDBClient({
  endpoint: LOCALSTACK_ENDPOINT,
  region: REGION,
});

export interface TableDefinition {
  tableName: string;
  partitionKey: { name: string; type: 'S' | 'N' | 'B' };
  sortKey?: { name: string; type: 'S' | 'N' | 'B' };
  gsis?: Array<{
    indexName: string;
    partitionKey: { name: string; type: 'S' | 'N' | 'B' };
    sortKey?: { name: string; type: 'S' | 'N' | 'B' };
  }>;
}

export const TEST_TABLES: TableDefinition[] = [
  {
    tableName: 'authkit-challenges-test',
    partitionKey: { name: 'id', type: 'S' },
    gsis: [
      {
        indexName: 'identifierHash-createdAt-index',
        partitionKey: { name: 'identifierHash', type: 'S' },
        sortKey: { name: 'createdAt', type: 'S' },
      },
    ],
  },
  {
    tableName: 'authkit-devices-test',
    partitionKey: { name: 'pk', type: 'S' },
    sortKey: { name: 'sk', type: 'S' },
  },
  {
    tableName: 'authkit-counters-test',
    partitionKey: { name: 'pk', type: 'S' },
  },
  {
    tableName: 'authkit-audit-logs-test',
    partitionKey: { name: 'pk', type: 'S' },
    sortKey: { name: 'sk', type: 'S' },
  },
  {
    tableName: 'authkit-denylist-test',
    partitionKey: { name: 'pk', type: 'S' },
  },
  {
    tableName: 'authkit-bounces-test',
    partitionKey: { name: 'pk', type: 'S' },
    sortKey: { name: 'sk', type: 'S' },
  },
];

/**
 * Create all test tables in LocalStack
 */
export async function setupTables(): Promise<void> {
  for (const table of TEST_TABLES) {
    try {
      await dynamoClient.send(
        new CreateTableCommand({
          TableName: table.tableName,
          KeySchema: [
            { AttributeName: table.partitionKey.name, KeyType: 'HASH' },
            ...(table.sortKey
              ? [{ AttributeName: table.sortKey.name, KeyType: 'RANGE' }]
              : []),
          ],
          AttributeDefinitions: [
            { AttributeName: table.partitionKey.name, AttributeType: table.partitionKey.type },
            ...(table.sortKey
              ? [{ AttributeName: table.sortKey.name, AttributeType: table.sortKey.type }]
              : []),
            ...(table.gsis || []).flatMap((gsi) => [
              { AttributeName: gsi.partitionKey.name, AttributeType: gsi.partitionKey.type },
              ...(gsi.sortKey
                ? [{ AttributeName: gsi.sortKey.name, AttributeType: gsi.sortKey.type }]
                : []),
            ]),
          ],
          GlobalSecondaryIndexes: table.gsis?.map((gsi) => ({
            IndexName: gsi.indexName,
            KeySchema: [
              { AttributeName: gsi.partitionKey.name, KeyType: 'HASH' },
              ...(gsi.sortKey
                ? [{ AttributeName: gsi.sortKey.name, KeyType: 'RANGE' }]
                : []),
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          })),
          BillingMode: 'PAY_PER_REQUEST',
        })
      );
    } catch (error: any) {
      if (error.name !== 'ResourceInUseException') {
        throw error;
      }
    }
  }
}

/**
 * Delete all test tables from LocalStack
 */
export async function teardownTables(): Promise<void> {
  for (const table of TEST_TABLES) {
    try {
      await dynamoClient.send(
        new DeleteTableCommand({
          TableName: table.tableName,
        })
      );
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }
  }
}

/**
 * Set environment variables for LocalStack
 */
export function setupLocalStackEnv(): void {
  process.env.DYNAMODB_ENDPOINT = LOCALSTACK_ENDPOINT;
  process.env.AWS_REGION = REGION;
  process.env.CHALLENGES_TABLE = 'authkit-challenges-test';
  process.env.DEVICES_TABLE = 'authkit-devices-test';
  process.env.COUNTERS_TABLE = 'authkit-counters-test';
  process.env.AUDIT_LOGS_TABLE = 'authkit-audit-logs-test';
  process.env.DENYLIST_TABLE = 'authkit-denylist-test';
  process.env.BOUNCES_TABLE = 'authkit-bounces-test';
}

