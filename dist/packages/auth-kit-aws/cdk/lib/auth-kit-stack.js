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
exports.AuthKitStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito_1 = require("./constructs/cognito");
const dynamodb_1 = require("./constructs/dynamodb");
const api_gateway_1 = require("./constructs/api-gateway");
const kms_1 = require("./constructs/kms");
const comms_1 = require("./constructs/comms");
const observability_1 = require("./constructs/observability");
class AuthKitStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment } = props;
        const kms = new kms_1.KMSConstruct(this, 'KMS', { environment });
        const dynamodb = new dynamodb_1.DynamoDBConstruct(this, 'DynamoDB', {
            environment,
            kmsKey: kms.key,
        });
        const comms = new comms_1.CommsConstruct(this, 'Comms', {
            environment,
            kmsKey: kms.key,
        });
        const cognito = new cognito_1.CognitoConstruct(this, 'Cognito', {
            environment,
            tables: {
                challenges: dynamodb.challengesTable,
                devices: dynamodb.devicesTable,
                counters: dynamodb.countersTable,
                auditLogs: dynamodb.auditLogsTable,
            },
            comms: {
                snsTopic: comms.snsTopic,
                sesIdentity: comms.sesIdentity,
            },
            kmsKey: kms.key,
        });
        const api = new api_gateway_1.ApiGatewayConstruct(this, 'API', {
            environment,
            userPool: cognito.userPool,
            tables: {
                challenges: dynamodb.challengesTable,
                devices: dynamodb.devicesTable,
                counters: dynamodb.countersTable,
            },
            comms: {
                snsTopic: comms.snsTopic,
                sesIdentity: comms.sesIdentity,
            },
            kmsKey: kms.key,
        });
        const observability = new observability_1.ObservabilityConstruct(this, 'Observability', {
            environment,
            userPool: cognito.userPool,
            api: api.httpApi,
            lambdaFunctions: [
                ...cognito.triggerFunctions,
                ...api.handlerFunctions,
            ],
            tables: [
                dynamodb.challengesTable,
                dynamodb.devicesTable,
                dynamodb.countersTable,
                dynamodb.auditLogsTable,
            ],
        });
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: cognito.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: cognito.publicClient.userPoolClientId,
            description: 'Public App Client ID',
        });
        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.httpApi.apiEndpoint,
            description: 'API Gateway endpoint URL',
        });
        new cdk.CfnOutput(this, 'DashboardUrl', {
            value: observability.dashboardUrl,
            description: 'CloudWatch Dashboard URL',
        });
    }
}
exports.AuthKitStack = AuthKitStack;
//# sourceMappingURL=auth-kit-stack.js.map