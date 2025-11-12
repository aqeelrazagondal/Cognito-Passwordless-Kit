import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let cachedDocClient: DynamoDBDocumentClient | null = null;

export function getDynamoDocClient(): DynamoDBDocumentClient {
  if (cachedDocClient) return cachedDocClient;

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  const config: DynamoDBClientConfig = { region };
  if (endpoint) {
    config.endpoint = endpoint;
  }

  const client = new DynamoDBClient(config);
  cachedDocClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
    unmarshallOptions: {}
  });
  return cachedDocClient;
}
