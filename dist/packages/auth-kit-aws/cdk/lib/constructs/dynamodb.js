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
exports.DynamoDBConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
class DynamoDBConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, kmsKey } = props;
        const removalPolicy = environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
        this.challengesTable = new dynamodb.Table(this, 'ChallengesTable', {
            tableName: `authkit-challenges-${environment}`,
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: kmsKey,
            timeToLiveAttribute: 'ttl',
            pointInTimeRecovery: environment === 'prod',
            removalPolicy,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });
        this.challengesTable.addGlobalSecondaryIndex({
            indexName: 'identifierHash-createdAt-index',
            partitionKey: { name: 'identifierHash', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        this.challengesTable.addGlobalSecondaryIndex({
            indexName: 'status-createdAt-index',
            partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        this.devicesTable = new dynamodb.Table(this, 'DevicesTable', {
            tableName: `authkit-devices-${environment}`,
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: kmsKey,
            pointInTimeRecovery: environment === 'prod',
            removalPolicy,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });
        this.devicesTable.addGlobalSecondaryIndex({
            indexName: 'fingerprintHash-index',
            partitionKey: { name: 'fingerprintHash', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        this.devicesTable.addGlobalSecondaryIndex({
            indexName: 'userId-trusted-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'trusted', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        this.countersTable = new dynamodb.Table(this, 'CountersTable', {
            tableName: `authkit-counters-${environment}`,
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: kmsKey,
            timeToLiveAttribute: 'ttl',
            removalPolicy,
        });
        this.auditLogsTable = new dynamodb.Table(this, 'AuditLogsTable', {
            tableName: `authkit-audit-logs-${environment}`,
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: kmsKey,
            timeToLiveAttribute: 'ttl',
            pointInTimeRecovery: environment === 'prod',
            removalPolicy,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });
        this.auditLogsTable.addGlobalSecondaryIndex({
            indexName: 'eventType-timestamp-index',
            partitionKey: { name: 'eventType', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        this.auditLogsTable.addGlobalSecondaryIndex({
            indexName: 'identifierHash-timestamp-index',
            partitionKey: { name: 'identifierHash', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        new cdk.CfnOutput(this, 'ChallengesTableName', {
            value: this.challengesTable.tableName,
            exportName: `AuthKit-${environment}-ChallengesTable`,
        });
        new cdk.CfnOutput(this, 'DevicesTableName', {
            value: this.devicesTable.tableName,
            exportName: `AuthKit-${environment}-DevicesTable`,
        });
        new cdk.CfnOutput(this, 'CountersTableName', {
            value: this.countersTable.tableName,
            exportName: `AuthKit-${environment}-CountersTable`,
        });
        new cdk.CfnOutput(this, 'AuditLogsTableName', {
            value: this.auditLogsTable.tableName,
            exportName: `AuthKit-${environment}-AuditLogsTable`,
        });
    }
}
exports.DynamoDBConstruct = DynamoDBConstruct;
//# sourceMappingURL=dynamodb.js.map