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
exports.WebhooksConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNode = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const snsSubscriptions = __importStar(require("aws-cdk-lib/aws-sns-subscriptions"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
const path = __importStar(require("path"));
class WebhooksConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, denylistTable, bouncesTable, kmsKey } = props;
        this.snsBounceHandler = new lambdaNode.NodejsFunction(this, 'SNSBounceHandler', {
            functionName: `authkit-sns-bounce-handler-${environment}`,
            entry: path.join(__dirname, '../../../lambda/webhooks/sns-bounce-handler.ts'),
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(60),
            memorySize: 256,
            environment: {
                ENVIRONMENT: environment,
                DENYLIST_TABLE: denylistTable.tableName,
                BOUNCES_TABLE: bouncesTable.tableName,
                AWS_REGION: cdk.Stack.of(this).region,
            },
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['@aws-sdk/*'],
            },
        });
        denylistTable.grantReadWriteData(this.snsBounceHandler);
        bouncesTable.grantReadWriteData(this.snsBounceHandler);
        kmsKey.grantEncryptDecrypt(this.snsBounceHandler);
    }
    createSESNotificationTopic(environment) {
        const topic = new sns.Topic(this, 'SESNotificationTopic', {
            topicName: `authkit-ses-notifications-${environment}`,
            displayName: 'AuthKit SES Bounce/Complaint Notifications',
        });
        topic.addSubscription(new snsSubscriptions.LambdaSubscription(this.snsBounceHandler));
        topic.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'AllowSESPublish',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('ses.amazonaws.com')],
            actions: ['SNS:Publish'],
            resources: [topic.topicArn],
        }));
        return topic;
    }
}
exports.WebhooksConstruct = WebhooksConstruct;
//# sourceMappingURL=webhooks.js.map