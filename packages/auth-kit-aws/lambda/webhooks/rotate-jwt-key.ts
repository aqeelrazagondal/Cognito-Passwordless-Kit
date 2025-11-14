/**
 * JWT Key Rotation Lambda Handler
 *
 * Automatically rotates JWT signing keys in AWS Secrets Manager
 * following AWS Secrets Manager rotation best practices.
 *
 * Rotation Steps:
 * 1. createSecret - Generate new JWT key
 * 2. setSecret - Store in Secrets Manager with AWSPENDING label
 * 3. testSecret - Validate the new key
 * 4. finishSecret - Promote to AWSCURRENT
 */

import {
  SecretsManagerClient,
  DescribeSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  UpdateSecretVersionStageCommand,
} from '@aws-sdk/client-secrets-manager';
import { randomBytes } from 'crypto';

const client = new SecretsManagerClient({});

interface RotationEvent {
  Step: 'createSecret' | 'setSecret' | 'testSecret' | 'finishSecret';
  SecretId: string;
  ClientRequestToken: string;
}

interface JWTSecret {
  secret: string;
  createdAt: string;
  keyId: string;
}

/**
 * Main rotation handler
 */
export async function handler(event: RotationEvent): Promise<{ statusCode: number }> {
  const { Step, SecretId, ClientRequestToken } = event;

  console.log(`JWT Rotation: ${Step} for secret ${SecretId}, token ${ClientRequestToken}`);

  try {
    switch (Step) {
      case 'createSecret':
        await createSecret(SecretId, ClientRequestToken);
        break;
      case 'setSecret':
        await setSecret(SecretId, ClientRequestToken);
        break;
      case 'testSecret':
        await testSecret(SecretId, ClientRequestToken);
        break;
      case 'finishSecret':
        await finishSecret(SecretId, ClientRequestToken);
        break;
      default:
        throw new Error(`Unknown step: ${Step}`);
    }

    console.log(`JWT Rotation: ${Step} completed successfully`);
    return { statusCode: 200 };
  } catch (error: any) {
    console.error(`JWT Rotation: ${Step} failed:`, error);
    throw error;
  }
}

/**
 * Step 1: Create a new secret version
 * Generates a new JWT signing key and stores it with AWSPENDING label
 */
async function createSecret(secretId: string, token: string): Promise<void> {
  // Check if the secret version already exists
  const metadata = await client.send(
    new DescribeSecretCommand({ SecretId: secretId }),
  );

  // Check if this version already has AWSPENDING stage
  const versions = metadata.VersionIdsToStages || {};
  if (versions[token]?.includes('AWSPENDING')) {
    console.log(`Secret version ${token} already exists with AWSPENDING stage`);
    return;
  }

  // Generate new JWT signing key (64 bytes, base64 encoded)
  const newSecret = randomBytes(64).toString('base64');
  const keyId = `jwt-key-${Date.now()}`;

  const secretValue: JWTSecret = {
    secret: newSecret,
    createdAt: new Date().toISOString(),
    keyId,
  };

  // Store new secret version with AWSPENDING label
  await client.send(
    new PutSecretValueCommand({
      SecretId: secretId,
      ClientRequestToken: token,
      SecretString: JSON.stringify(secretValue),
      VersionStages: ['AWSPENDING'],
    }),
  );

  console.log(`Created new JWT secret version ${token} with keyId ${keyId}`);
}

/**
 * Step 2: Set the secret in the service
 * For JWT keys, we don't need to update external services
 * The key will be picked up when AWSCURRENT is updated
 */
async function setSecret(secretId: string, token: string): Promise<void> {
  // For JWT keys, we don't need to set the secret in an external service
  // The rotation will be complete when we update AWSCURRENT
  console.log(`Set secret step - no action needed for JWT keys`);
}

/**
 * Step 3: Test the new secret
 * Validate that the new JWT key can be used for signing/verification
 */
async function testSecret(secretId: string, token: string): Promise<void> {
  // Retrieve the AWSPENDING version
  const result = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
      VersionId: token,
      VersionStage: 'AWSPENDING',
    }),
  );

  if (!result.SecretString) {
    throw new Error('Secret value is empty');
  }

  const secretValue: JWTSecret = JSON.parse(result.SecretString);

  // Validate secret structure
  if (!secretValue.secret || !secretValue.createdAt || !secretValue.keyId) {
    throw new Error('Invalid secret structure');
  }

  // Validate secret is base64
  const secretBuffer = Buffer.from(secretValue.secret, 'base64');
  if (secretBuffer.length < 32) {
    throw new Error('Secret is too short (minimum 32 bytes)');
  }

  // Test signing with the new key (basic validation)
  const testPayload = JSON.stringify({ test: true, timestamp: Date.now() });
  const crypto = await import('crypto');
  const signature = crypto
    .createHmac('sha256', secretBuffer)
    .update(testPayload)
    .digest('base64');

  if (!signature) {
    throw new Error('Failed to sign test payload with new secret');
  }

  console.log(`Test secret successful - keyId: ${secretValue.keyId}`);
}

/**
 * Step 4: Finish the rotation
 * Promote the new secret to AWSCURRENT and demote the old one to AWSPREVIOUS
 */
async function finishSecret(secretId: string, token: string): Promise<void> {
  // Get current secret metadata
  const metadata = await client.send(
    new DescribeSecretCommand({ SecretId: secretId }),
  );

  const versions = metadata.VersionIdsToStages || {};

  // Find the current version
  let currentVersion: string | undefined;
  for (const [versionId, stages] of Object.entries(versions)) {
    if (stages.includes('AWSCURRENT')) {
      currentVersion = versionId;
      break;
    }
  }

  if (!currentVersion) {
    throw new Error('No current version found');
  }

  if (currentVersion === token) {
    console.log('New version is already marked as AWSCURRENT');
    return;
  }

  // Move AWSCURRENT from old version to new version
  await client.send(
    new UpdateSecretVersionStageCommand({
      SecretId: secretId,
      VersionStage: 'AWSCURRENT',
      MoveToVersionId: token,
      RemoveFromVersionId: currentVersion,
    }),
  );

  console.log(`Promoted version ${token} to AWSCURRENT`);

  // Remove AWSPENDING from new version (if it exists)
  if (versions[token]?.includes('AWSPENDING')) {
    await client.send(
      new UpdateSecretVersionStageCommand({
        SecretId: secretId,
        VersionStage: 'AWSPENDING',
        RemoveFromVersionId: token,
      }),
    );
  }

  // Get the old secret value for logging
  const oldSecret = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
      VersionId: currentVersion,
    }),
  );

  const oldSecretValue: JWTSecret = oldSecret.SecretString
    ? JSON.parse(oldSecret.SecretString)
    : { keyId: 'unknown' };

  const newSecret = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
      VersionId: token,
    }),
  );

  const newSecretValue: JWTSecret = newSecret.SecretString
    ? JSON.parse(newSecret.SecretString)
    : { keyId: 'unknown' };

  console.log(
    `JWT rotation complete: ${oldSecretValue.keyId} → ${newSecretValue.keyId}`,
  );
}
