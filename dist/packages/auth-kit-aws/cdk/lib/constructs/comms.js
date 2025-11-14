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
exports.CommsConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ses = __importStar(require("aws-cdk-lib/aws-ses"));
class CommsConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, kmsKey, bounceNotificationTopic } = props;
        this.snsTopic = new sns.Topic(this, 'NotificationsTopic', {
            topicName: `authkit-notifications-${environment}`,
            masterKey: kmsKey,
            displayName: `AuthKit Notifications (${environment})`,
        });
        this.snsTopic.addToResourcePolicy(new iam.PolicyStatement({
            sid: 'AllowAccountPublish',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountPrincipal(cdk.Stack.of(this).account)],
            actions: ['SNS:Publish'],
            resources: [this.snsTopic.topicArn],
        }));
        this.sesIdentity = `noreply@${environment}.example.com`;
        if (bounceNotificationTopic) {
            const configSetName = `authkit-${environment}`;
            this.configurationSetName = configSetName;
            const configurationSet = new ses.CfnConfigurationSet(this, 'SESConfigurationSet', {
                name: configSetName,
            });
            const eventDestination = new ses.CfnConfigurationSetEventDestination(this, 'SESBounceEventDestination', {
                configurationSetName: configSetName,
                eventDestination: {
                    name: 'BounceComplaintDestination',
                    enabled: true,
                    matchingEventTypes: ['bounce', 'complaint'],
                    snsDestination: {
                        topicArn: bounceNotificationTopic.topicArn,
                    },
                },
            });
            eventDestination.addDependency(configurationSet);
            new cdk.CfnOutput(this, 'SESConfigurationSetName', {
                value: configSetName,
                description: 'SES Configuration Set name. Use this in X-SES-CONFIGURATION-SET header when sending emails.',
                exportName: `AuthKit-${environment}-SESConfigurationSet`,
            });
        }
    }
}
exports.CommsConstruct = CommsConstruct;
//# sourceMappingURL=comms.js.map