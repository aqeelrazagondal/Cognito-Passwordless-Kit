"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const crypto_1 = require("crypto");
const client = new client_secrets_manager_1.SecretsManagerClient({});
async function handler(event) {
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
    }
    catch (error) {
        console.error(`JWT Rotation: ${Step} failed:`, error);
        throw error;
    }
}
async function createSecret(secretId, token) {
    const metadata = await client.send(new client_secrets_manager_1.DescribeSecretCommand({ SecretId: secretId }));
    const versions = metadata.VersionIdsToStages || {};
    if (versions[token]?.includes('AWSPENDING')) {
        console.log(`Secret version ${token} already exists with AWSPENDING stage`);
        return;
    }
    const newSecret = (0, crypto_1.randomBytes)(64).toString('base64');
    const keyId = `jwt-key-${Date.now()}`;
    const secretValue = {
        secret: newSecret,
        createdAt: new Date().toISOString(),
        keyId,
    };
    await client.send(new client_secrets_manager_1.PutSecretValueCommand({
        SecretId: secretId,
        ClientRequestToken: token,
        SecretString: JSON.stringify(secretValue),
        VersionStages: ['AWSPENDING'],
    }));
    console.log(`Created new JWT secret version ${token} with keyId ${keyId}`);
}
async function setSecret(secretId, token) {
    console.log(`Set secret step - no action needed for JWT keys`);
}
async function testSecret(secretId, token) {
    const result = await client.send(new client_secrets_manager_1.GetSecretValueCommand({
        SecretId: secretId,
        VersionId: token,
        VersionStage: 'AWSPENDING',
    }));
    if (!result.SecretString) {
        throw new Error('Secret value is empty');
    }
    const secretValue = JSON.parse(result.SecretString);
    if (!secretValue.secret || !secretValue.createdAt || !secretValue.keyId) {
        throw new Error('Invalid secret structure');
    }
    const secretBuffer = Buffer.from(secretValue.secret, 'base64');
    if (secretBuffer.length < 32) {
        throw new Error('Secret is too short (minimum 32 bytes)');
    }
    const testPayload = JSON.stringify({ test: true, timestamp: Date.now() });
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    const signature = crypto
        .createHmac('sha256', secretBuffer)
        .update(testPayload)
        .digest('base64');
    if (!signature) {
        throw new Error('Failed to sign test payload with new secret');
    }
    console.log(`Test secret successful - keyId: ${secretValue.keyId}`);
}
async function finishSecret(secretId, token) {
    const metadata = await client.send(new client_secrets_manager_1.DescribeSecretCommand({ SecretId: secretId }));
    const versions = metadata.VersionIdsToStages || {};
    let currentVersion;
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
    await client.send(new client_secrets_manager_1.UpdateSecretVersionStageCommand({
        SecretId: secretId,
        VersionStage: 'AWSCURRENT',
        MoveToVersionId: token,
        RemoveFromVersionId: currentVersion,
    }));
    console.log(`Promoted version ${token} to AWSCURRENT`);
    if (versions[token]?.includes('AWSPENDING')) {
        await client.send(new client_secrets_manager_1.UpdateSecretVersionStageCommand({
            SecretId: secretId,
            VersionStage: 'AWSPENDING',
            RemoveFromVersionId: token,
        }));
    }
    const oldSecret = await client.send(new client_secrets_manager_1.GetSecretValueCommand({
        SecretId: secretId,
        VersionId: currentVersion,
    }));
    const oldSecretValue = oldSecret.SecretString
        ? JSON.parse(oldSecret.SecretString)
        : { keyId: 'unknown' };
    const newSecret = await client.send(new client_secrets_manager_1.GetSecretValueCommand({
        SecretId: secretId,
        VersionId: token,
    }));
    const newSecretValue = newSecret.SecretString
        ? JSON.parse(newSecret.SecretString)
        : { keyId: 'unknown' };
    console.log(`JWT rotation complete: ${oldSecretValue.keyId} → ${newSecretValue.keyId}`);
}
//# sourceMappingURL=rotate-jwt-key.js.map