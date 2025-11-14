"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDynamoDocClient = getDynamoDocClient;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
let cachedDocClient = null;
function getDynamoDocClient() {
    if (cachedDocClient)
        return cachedDocClient;
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    const config = { region };
    if (endpoint) {
        config.endpoint = endpoint;
    }
    const client = new client_dynamodb_1.DynamoDBClient(config);
    cachedDocClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
        unmarshallOptions: {}
    });
    return cachedDocClient;
}
//# sourceMappingURL=dynamo-client.js.map