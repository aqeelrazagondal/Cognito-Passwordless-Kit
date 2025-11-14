"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
exports.userExists = userExists;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
async function getUser(userPoolId, username) {
    try {
        const result = await client.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
            UserPoolId: userPoolId,
            Username: username,
        }));
        const attributes = result.UserAttributes || [];
        const getAttribute = (name) => attributes.find(a => a.Name === name)?.Value;
        return {
            username: result.Username,
            email: getAttribute('email'),
            phoneNumber: getAttribute('phone_number'),
            emailVerified: getAttribute('email_verified') === 'true',
            phoneVerified: getAttribute('phone_number_verified') === 'true',
        };
    }
    catch (error) {
        console.error('Failed to get user:', error);
        return null;
    }
}
async function userExists(userPoolId, username) {
    const user = await getUser(userPoolId, username);
    return user !== null;
}
//# sourceMappingURL=cognito-client.js.map