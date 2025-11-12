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
exports.KMSConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
class KMSConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.key = new kms.Key(this, 'AuthKitKey', {
            description: `AuthKit encryption key for ${props.environment}`,
            enableKeyRotation: true,
            removalPolicy: props.environment === 'prod'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
            alias: `alias/authkit-${props.environment}`,
            policy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        sid: 'Enable IAM User Permissions',
                        effect: iam.Effect.ALLOW,
                        principals: [
                            new iam.AccountRootPrincipal(),
                        ],
                        actions: ['kms:*'],
                        resources: ['*'],
                    }),
                    new iam.PolicyStatement({
                        sid: 'Allow CloudWatch Logs',
                        effect: iam.Effect.ALLOW,
                        principals: [
                            new iam.ServicePrincipal(`logs.${cdk.Stack.of(this).region}.amazonaws.com`),
                        ],
                        actions: [
                            'kms:Encrypt',
                            'kms:Decrypt',
                            'kms:ReEncrypt*',
                            'kms:GenerateDataKey*',
                            'kms:CreateGrant',
                            'kms:DescribeKey',
                        ],
                        resources: ['*'],
                        conditions: {
                            ArnLike: {
                                'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`,
                            },
                        },
                    }),
                    new iam.PolicyStatement({
                        sid: 'Allow SNS',
                        effect: iam.Effect.ALLOW,
                        principals: [
                            new iam.ServicePrincipal('sns.amazonaws.com'),
                        ],
                        actions: [
                            'kms:Decrypt',
                            'kms:GenerateDataKey',
                        ],
                        resources: ['*'],
                    }),
                    new iam.PolicyStatement({
                        sid: 'Allow SES',
                        effect: iam.Effect.ALLOW,
                        principals: [
                            new iam.ServicePrincipal('ses.amazonaws.com'),
                        ],
                        actions: [
                            'kms:Decrypt',
                            'kms:GenerateDataKey',
                        ],
                        resources: ['*'],
                    }),
                ],
            }),
        });
        new cdk.CfnOutput(this, 'KMSKeyId', {
            value: this.key.keyId,
            description: 'KMS Key ID',
            exportName: `AuthKit-${props.environment}-KMSKeyId`,
        });
        new cdk.CfnOutput(this, 'KMSKeyArn', {
            value: this.key.keyArn,
            description: 'KMS Key ARN',
            exportName: `AuthKit-${props.environment}-KMSKeyArn`,
        });
    }
}
exports.KMSConstruct = KMSConstruct;
//# sourceMappingURL=kms.js.map