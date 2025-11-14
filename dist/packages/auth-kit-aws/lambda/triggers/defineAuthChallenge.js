"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("./shared/utils");
const handler = async (event) => {
    (0, utils_1.log)('INFO', 'DefineAuthChallenge triggered', {
        userName: event.userName,
        sessionLength: event.request.session.length,
    });
    const session = event.request.session;
    if (session.length === 0) {
        (0, utils_1.log)('INFO', 'Starting new auth flow - issuing CUSTOM_CHALLENGE');
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = false;
        event.response.failAuthentication = false;
        return event;
    }
    const lastChallenge = session[session.length - 1];
    if (lastChallenge.challengeResult === true) {
        (0, utils_1.log)('INFO', 'Challenge answered correctly - issuing tokens');
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = true;
        event.response.failAuthentication = false;
        return event;
    }
    const failedAttempts = session.filter(s => s.challengeResult === false).length;
    if (failedAttempts >= 3) {
        (0, utils_1.log)('WARN', 'Too many failed attempts - failing authentication', { failedAttempts });
        event.response.challengeName = 'CUSTOM_CHALLENGE';
        event.response.issueTokens = false;
        event.response.failAuthentication = true;
        return event;
    }
    (0, utils_1.log)('INFO', 'Challenge answered incorrectly - issuing new challenge', {
        failedAttempts,
        retriesRemaining: 3 - failedAttempts,
    });
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    return event;
};
exports.handler = handler;
//# sourceMappingURL=defineAuthChallenge.js.map