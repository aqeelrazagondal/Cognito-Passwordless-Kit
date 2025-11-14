"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const challenge_validator_1 = require("./shared/challenge-validator");
const utils_1 = require("./shared/utils");
const handler = async (event) => {
    (0, utils_1.log)('INFO', 'VerifyAuthChallengeResponse triggered', {
        userName: event.userName,
    });
    try {
        const challengeId = event.request.privateChallengeParameters?.challengeId;
        const expectedCode = event.request.privateChallengeParameters?.code;
        const userAnswer = event.request.challengeAnswer;
        if (!challengeId) {
            (0, utils_1.log)('ERROR', 'Missing challengeId in private challenge parameters');
            event.response.answerCorrect = false;
            return event;
        }
        if (!userAnswer) {
            (0, utils_1.log)('WARN', 'User provided no answer');
            event.response.answerCorrect = false;
            return event;
        }
        (0, utils_1.log)('INFO', 'Validating challenge', {
            challengeId,
            userAnswerLength: userAnswer.length,
        });
        const validation = await (0, challenge_validator_1.validateChallenge)(challengeId, userAnswer);
        if (!validation.valid) {
            (0, utils_1.log)('WARN', 'Challenge validation failed', {
                challengeId,
                reason: validation.reason,
            });
            event.response.answerCorrect = false;
            return event;
        }
        if (expectedCode && userAnswer !== expectedCode) {
            (0, utils_1.log)('WARN', 'Answer does not match expected code', { challengeId });
            event.response.answerCorrect = false;
            return event;
        }
        await (0, challenge_validator_1.consumeChallenge)(challengeId);
        (0, utils_1.log)('INFO', 'Challenge verified successfully', { challengeId });
        event.response.answerCorrect = true;
        return event;
    }
    catch (error) {
        (0, utils_1.log)('ERROR', 'Failed to verify challenge', { error });
        event.response.answerCorrect = false;
        return event;
    }
};
exports.handler = handler;
//# sourceMappingURL=verifyAuthChallengeResponse.js.map