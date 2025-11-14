"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChallengeRepository = getChallengeRepository;
exports.getDeviceRepository = getDeviceRepository;
exports.getCounterRepository = getCounterRepository;
exports.getDenylistRepository = getDenylistRepository;
exports.getBounceRepository = getBounceRepository;
exports.checkDenylist = checkDenylist;
exports.checkAbuse = checkAbuse;
exports.verifyCaptcha = verifyCaptcha;
exports.getRateLimiter = getRateLimiter;
exports.getCognitoClient = getCognitoClient;
exports.clearCache = clearCache;
const DynamoDBChallengeRepository_1 = require("../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBChallengeRepository");
const DynamoDBDeviceRepository_1 = require("../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDeviceRepository");
const DynamoDBCounterRepository_1 = require("../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBCounterRepository");
const DynamoDBDenylistRepository_1 = require("../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBDenylistRepository");
const DynamoDBBounceRepository_1 = require("../../../../auth-kit-core/src/infrastructure/repositories/DynamoDBBounceRepository");
const RateLimiter_1 = require("../../../../auth-kit-core/src/domain/services/RateLimiter");
const secrets_1 = require("./secrets");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const Identifier_1 = require("../../../../auth-kit-core/src/domain/value-objects/Identifier");
const crypto_1 = require("crypto");
let cachedServices = {};
function getChallengeRepository() {
    if (!cachedServices.challengeRepo) {
        cachedServices.challengeRepo = new DynamoDBChallengeRepository_1.DynamoDBChallengeRepository();
    }
    return cachedServices.challengeRepo;
}
function getDeviceRepository() {
    if (!cachedServices.deviceRepo) {
        cachedServices.deviceRepo = new DynamoDBDeviceRepository_1.DynamoDBDeviceRepository();
    }
    return cachedServices.deviceRepo;
}
function getCounterRepository() {
    if (!cachedServices.counterRepo) {
        cachedServices.counterRepo = new DynamoDBCounterRepository_1.DynamoDBCounterRepository();
    }
    return cachedServices.counterRepo;
}
function getDenylistRepository() {
    if (!cachedServices.denylistRepo) {
        cachedServices.denylistRepo = new DynamoDBDenylistRepository_1.DynamoDBDenylistRepository();
    }
    return cachedServices.denylistRepo;
}
function getBounceRepository() {
    if (!cachedServices.bounceRepo) {
        cachedServices.bounceRepo = new DynamoDBBounceRepository_1.DynamoDBBounceRepository();
    }
    return cachedServices.bounceRepo;
}
async function checkDenylist(identifier) {
    const denylistRepo = getDenylistRepository();
    const parsed = Identifier_1.Identifier.create(identifier);
    const result = await denylistRepo.isBlocked(parsed.hash);
    return result;
}
async function checkAbuse(params) {
    const counterRepo = getCounterRepository();
    const reasons = [];
    let riskScore = 0.0;
    const identifierKey = `auth:identifier:${params.identifierHash}`;
    const identifierCounter = await counterRepo.get(identifierKey);
    if (identifierCounter && identifierCounter.count > 10) {
        riskScore += 0.3;
        reasons.push(`High identifier velocity: ${identifierCounter.count} requests/hour`);
    }
    const ipHash = (0, crypto_1.createHash)('sha256').update(params.ip).digest('hex');
    const ipKey = `auth:ip:${ipHash}`;
    const ipCounter = await counterRepo.get(ipKey);
    if (ipCounter && ipCounter.count > 20) {
        riskScore += 0.4;
        reasons.push(`High IP velocity: ${ipCounter.count} requests/hour`);
    }
    if (params.geoCountry) {
        const geoKey = `auth:geo:${params.geoCountry}`;
        const geoCounter = await counterRepo.get(geoKey);
        if (geoCounter && geoCounter.count > 5) {
            riskScore += 0.2;
            reasons.push(`High geo velocity: ${geoCounter.count} requests/hour from ${params.geoCountry}`);
        }
    }
    const suspicious = riskScore > 0.5;
    let action = 'allow';
    if (riskScore >= 0.8) {
        action = 'block';
    }
    else if (riskScore >= 0.5) {
        action = 'challenge';
    }
    return { suspicious, riskScore, reasons, action };
}
async function verifyCaptcha(token, remoteIp) {
    try {
        const captchaSecret = await (0, secrets_1.getCaptchaSecret)();
        if (!captchaSecret) {
            return { success: true };
        }
        const verifyUrl = captchaSecret.provider === 'hcaptcha'
            ? 'https://hcaptcha.com/siteverify'
            : 'https://www.google.com/recaptcha/api/siteverify';
        const url = new URL(verifyUrl);
        url.searchParams.set('secret', captchaSecret.secretKey);
        url.searchParams.set('response', token);
        if (remoteIp) {
            url.searchParams.set('remoteip', remoteIp);
        }
        const response = await fetch(url.toString(), { method: 'POST' });
        const data = await response.json();
        if (captchaSecret.provider === 'hcaptcha') {
            return { success: data.success === true, error: data['error-codes']?.join(', ') };
        }
        else {
            return { success: data.success === true && (data.score || 0) >= 0.5, error: data['error-codes']?.join(', ') };
        }
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
function getRateLimiter() {
    if (!cachedServices.rateLimiter) {
        const counterRepo = getCounterRepository();
        cachedServices.rateLimiter = new RateLimiter_1.RateLimiter(counterRepo);
    }
    return cachedServices.rateLimiter;
}
function getCognitoClient() {
    if (!cachedServices.cognitoClient) {
        cachedServices.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    return cachedServices.cognitoClient;
}
function clearCache() {
    cachedServices = {};
}
//# sourceMappingURL=services.js.map