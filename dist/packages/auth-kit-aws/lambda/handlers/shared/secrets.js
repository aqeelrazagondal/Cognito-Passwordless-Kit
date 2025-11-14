"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecret = getSecret;
exports.getJWTSecret = getJWTSecret;
exports.getTwilioSecret = getTwilioSecret;
exports.getCaptchaSecret = getCaptchaSecret;
exports.getVonageSecret = getVonageSecret;
exports.clearCache = clearCache;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const CACHE_TTL = 3600000;
const cache = {};
let secretsClient = null;
function getSecretsClient() {
    if (!secretsClient) {
        secretsClient = new client_secrets_manager_1.SecretsManagerClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    return secretsClient;
}
async function getSecret(secretArn) {
    const now = Date.now();
    const cached = cache[secretArn];
    if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.value;
    }
    try {
        const client = getSecretsClient();
        const command = new client_secrets_manager_1.GetSecretValueCommand({
            SecretId: secretArn,
        });
        const response = await client.send(command);
        if (!response.SecretString) {
            throw new Error('Secret string is empty');
        }
        const value = JSON.parse(response.SecretString);
        cache[secretArn] = {
            value,
            timestamp: now,
        };
        return value;
    }
    catch (error) {
        throw new Error(`Failed to get secret ${secretArn}: ${error.message}`);
    }
}
async function getJWTSecret() {
    const secretArn = process.env.JWT_SECRET_ARN;
    if (!secretArn) {
        const envSecret = process.env.JWT_SECRET;
        if (!envSecret) {
            throw new Error('JWT_SECRET or JWT_SECRET_ARN must be set');
        }
        console.log('Using JWT_SECRET from environment variable (local development)');
        return envSecret;
    }
    try {
        const secret = await getSecret(secretArn);
        return secret.secret;
    }
    catch (error) {
        console.error('Failed to fetch JWT secret from Secrets Manager:', error);
        const envSecret = process.env.JWT_SECRET;
        if (envSecret) {
            console.log('Falling back to JWT_SECRET environment variable');
            return envSecret;
        }
        throw error;
    }
}
async function getTwilioSecret() {
    const secretArn = process.env.TWILIO_SECRET_ARN;
    if (!secretArn) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_FROM_NUMBER;
        const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
        if (accountSid && authToken && fromNumber) {
            console.log('Using Twilio credentials from environment variables');
            return {
                accountSid,
                authToken,
                fromNumber,
                whatsappNumber,
            };
        }
        return null;
    }
    try {
        return await getSecret(secretArn);
    }
    catch (error) {
        console.error('Failed to fetch Twilio secret:', error);
        return null;
    }
}
async function getCaptchaSecret() {
    const secretArn = process.env.CAPTCHA_SECRET_ARN ||
        `authkit-captcha-${process.env.ENVIRONMENT || 'dev'}`;
    try {
        return await getSecret(secretArn);
    }
    catch (error) {
        return null;
    }
}
async function getVonageSecret() {
    const secretArn = process.env.VONAGE_SECRET_ARN ||
        `authkit-vonage-${process.env.ENVIRONMENT || 'dev'}`;
    try {
        return await getSecret(secretArn);
    }
    catch (error) {
        return null;
    }
}
function clearCache(secretArn) {
    if (secretArn) {
        delete cache[secretArn];
    }
    else {
        Object.keys(cache).forEach((key) => delete cache[key]);
    }
}
//# sourceMappingURL=secrets.js.map