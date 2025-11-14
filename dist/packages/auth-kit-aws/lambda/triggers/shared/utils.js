"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChallengeMetadata = parseChallengeMetadata;
exports.encodeChallengeMetadata = encodeChallengeMetadata;
exports.extractIdentifier = extractIdentifier;
exports.determineChannel = determineChannel;
exports.log = log;
function parseChallengeMetadata(session) {
    if (!session || session.length === 0)
        return null;
    const lastChallenge = session[session.length - 1];
    if (!lastChallenge?.challengeMetadata)
        return null;
    try {
        return JSON.parse(lastChallenge.challengeMetadata);
    }
    catch {
        return null;
    }
}
function encodeChallengeMetadata(metadata) {
    return JSON.stringify(metadata);
}
function extractIdentifier(event) {
    return event.request.userAttributes?.email ||
        event.request.userAttributes?.phone_number ||
        event.userName;
}
function determineChannel(identifier) {
    if (identifier.startsWith('+') || /^\d+$/.test(identifier)) {
        return 'sms';
    }
    return 'email';
}
function log(level, message, context) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
    }));
}
//# sourceMappingURL=utils.js.map