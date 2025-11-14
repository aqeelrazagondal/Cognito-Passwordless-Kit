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
exports.ObservabilityConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cloudwatch_actions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class ObservabilityConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, api, lambdaFunctions, tables, userPool, snsTopic, alarmTopic } = props;
        this.alarms = [];
        const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
            dashboardName: `AuthKit-${environment}`,
            periodOverride: cloudwatch.PeriodOverride.AUTO,
        });
        const api5xx = new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5xxError',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiId: api.apiId, Stage: '$default' },
        });
        const apiLatency = new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            statistic: 'p95',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { ApiId: api.apiId, Stage: '$default' },
        });
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'API 5xx Errors',
            left: [api5xx],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'API Latency p95 (ms)',
            left: [apiLatency],
            width: 12,
        }));
        if (lambdaFunctions.length > 0) {
            const lambdaErrors = lambdaFunctions.map((fn) => fn.metricErrors({ period: cdk.Duration.minutes(5), statistic: 'Sum' }));
            const lambdaDurations = lambdaFunctions.map((fn) => fn.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p95' }));
            dashboard.addWidgets(new cloudwatch.GraphWidget({ title: 'Lambda Errors', left: lambdaErrors }), new cloudwatch.GraphWidget({ title: 'Lambda Duration p95 (ms)', left: lambdaDurations }));
        }
        if (tables.length > 0) {
            const readCapacity = tables.map((t) => t.metricConsumedReadCapacityUnits({ period: cdk.Duration.minutes(5), statistic: 'Sum' }));
            const writeCapacity = tables.map((t) => t.metricConsumedWriteCapacityUnits({ period: cdk.Duration.minutes(5), statistic: 'Sum' }));
            const readThrottles = tables.map((t) => t.metricUserErrors({ period: cdk.Duration.minutes(5), statistic: 'Sum' }));
            const writeThrottles = tables.map((t) => t.metricSystemErrorsForOperations({
                operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.UPDATE_ITEM, dynamodb.Operation.DELETE_ITEM],
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            }));
            dashboard.addWidgets(new cloudwatch.GraphWidget({ title: 'DynamoDB Read Capacity (sum)', left: readCapacity, width: 12 }), new cloudwatch.GraphWidget({ title: 'DynamoDB Write Capacity (sum)', left: writeCapacity, width: 12 }));
            dashboard.addWidgets(new cloudwatch.GraphWidget({ title: 'DynamoDB User Errors (throttles)', left: readThrottles, width: 12 }), new cloudwatch.GraphWidget({ title: 'DynamoDB System Errors', left: writeThrottles, width: 12 }));
        }
        const cognitoSignUpSuccesses = new cloudwatch.Metric({
            namespace: 'AWS/Cognito',
            metricName: 'SignUpSuccesses',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { UserPool: userPool.userPoolId },
        });
        const cognitoSignInSuccesses = new cloudwatch.Metric({
            namespace: 'AWS/Cognito',
            metricName: 'UserAuthentication',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { UserPool: userPool.userPoolId },
        });
        const cognitoTokenRefreshSuccesses = new cloudwatch.Metric({
            namespace: 'AWS/Cognito',
            metricName: 'TokenRefreshSuccesses',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            dimensionsMap: { UserPool: userPool.userPoolId },
        });
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Cognito Sign-Ups',
            left: [cognitoSignUpSuccesses],
            width: 8,
        }), new cloudwatch.GraphWidget({
            title: 'Cognito Sign-Ins',
            left: [cognitoSignInSuccesses],
            width: 8,
        }), new cloudwatch.GraphWidget({
            title: 'Cognito Token Refreshes',
            left: [cognitoTokenRefreshSuccesses],
            width: 8,
        }));
        if (snsTopic) {
            const snsPublished = snsTopic.metricNumberOfMessagesPublished({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            });
            const snsDelivered = snsTopic.metricNumberOfNotificationsDelivered({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            });
            const snsFailed = snsTopic.metricNumberOfNotificationsFailed({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            });
            dashboard.addWidgets(new cloudwatch.GraphWidget({
                title: 'SNS Messages Published',
                left: [snsPublished],
                width: 8,
            }), new cloudwatch.GraphWidget({
                title: 'SNS Messages Delivered',
                left: [snsDelivered],
                width: 8,
            }), new cloudwatch.GraphWidget({
                title: 'SNS Delivery Failures',
                left: [snsFailed],
                width: 8,
            }));
        }
        const sesSent = new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Send',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
        });
        const sesBounces = new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Reputation.BounceRate',
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
        });
        const sesComplaints = new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Reputation.ComplaintRate',
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
        });
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'SES Emails Sent',
            left: [sesSent],
            width: 8,
        }), new cloudwatch.GraphWidget({
            title: 'SES Bounce Rate',
            left: [sesBounces],
            width: 8,
        }), new cloudwatch.GraphWidget({
            title: 'SES Complaint Rate',
            left: [sesComplaints],
            width: 8,
        }));
        if (lambdaFunctions.length > 0) {
            lambdaFunctions.forEach((fn, idx) => {
                const errorAlarm = fn
                    .metricErrors({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Sum',
                })
                    .createAlarm(this, `LambdaErrorAlarm${idx}`, {
                    alarmName: `${environment}-lambda-errors-${fn.functionName}`,
                    evaluationPeriods: 2,
                    threshold: 5,
                    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                });
                if (alarmTopic) {
                    errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
                }
                this.alarms.push(errorAlarm);
            });
        }
        const api5xxAlarm = api5xx.createAlarm(this, 'Api5xxAlarm', {
            alarmName: `${environment}-api-5xx-errors`,
            evaluationPeriods: 2,
            threshold: 10,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        if (alarmTopic) {
            api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
        }
        this.alarms.push(api5xxAlarm);
        if (tables.length > 0) {
            tables.forEach((table, idx) => {
                const throttleAlarm = table
                    .metricUserErrors({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Sum',
                })
                    .createAlarm(this, `DynamoThrottleAlarm${idx}`, {
                    alarmName: `${environment}-dynamo-throttles-${table.tableName}`,
                    evaluationPeriods: 2,
                    threshold: 5,
                    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
                });
                if (alarmTopic) {
                    throttleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
                }
                this.alarms.push(throttleAlarm);
            });
        }
        if (snsTopic) {
            const snsFailureAlarm = snsTopic
                .metricNumberOfNotificationsFailed({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            })
                .createAlarm(this, 'SnsFailureAlarm', {
                alarmName: `${environment}-sns-delivery-failures`,
                evaluationPeriods: 2,
                threshold: 5,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
            if (alarmTopic) {
                snsFailureAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
            }
            this.alarms.push(snsFailureAlarm);
        }
        new logs.QueryDefinition(this, 'FailedAuthQuery', {
            queryDefinitionName: `${environment}-failed-auth-attempts`,
            queryString: `fields @timestamp, @message, userId, identifier, reason
| filter @message like /auth.*failed/i or @message like /invalid.*otp/i
| sort @timestamp desc
| limit 100`,
            logGroups: lambdaFunctions.map((fn) => fn.logGroup).filter((lg) => lg !== undefined),
        });
        new logs.QueryDefinition(this, 'RateLimitQuery', {
            queryDefinitionName: `${environment}-rate-limit-violations`,
            queryString: `fields @timestamp, @message, identifier, ip, requestId
| filter @message like /rate.*limit/i or @message like /too.*many.*requests/i
| stats count() by identifier, ip
| sort count desc
| limit 50`,
            logGroups: lambdaFunctions.map((fn) => fn.logGroup).filter((lg) => lg !== undefined),
        });
        new logs.QueryDefinition(this, 'SuspiciousPatternQuery', {
            queryDefinitionName: `${environment}-suspicious-patterns`,
            queryString: `fields @timestamp, identifier, ip, userAgent, @message
| filter @message like /failed/i
| stats count() as attempts by identifier, ip
| filter attempts > 10
| sort attempts desc
| limit 50`,
            logGroups: lambdaFunctions.map((fn) => fn.logGroup).filter((lg) => lg !== undefined),
        });
        const region = cdk.Stack.of(this).region;
        this.dashboardUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboard.dashboardName}`;
    }
}
exports.ObservabilityConstruct = ObservabilityConstruct;
//# sourceMappingURL=observability.js.map