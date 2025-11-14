import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface ObservabilityConstructProps {
  environment: string;
  userPool: cognito.UserPool;
  api: apigateway.HttpApi;
  lambdaFunctions: lambda.Function[];
  tables: dynamodb.Table[];
  snsTopic?: sns.Topic;
  alarmTopic?: sns.Topic;
}

export class ObservabilityConstruct extends Construct {
  public readonly dashboardUrl: string;
  public readonly alarms: cloudwatch.Alarm[];

  constructor(scope: Construct, id: string, props: ObservabilityConstructProps) {
    super(scope, id);

    const { environment, api, lambdaFunctions, tables, userPool, snsTopic, alarmTopic } = props;

    this.alarms = [];

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `AuthKit-${environment}`,
      periodOverride: cloudwatch.PeriodOverride.AUTO,
    });

    // API metrics
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

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API 5xx Errors',
        left: [api5xx],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Latency p95 (ms)',
        left: [apiLatency],
        width: 12,
      }),
    );

    // Lambda error and duration metrics
    if (lambdaFunctions.length > 0) {
      const lambdaErrors = lambdaFunctions.map((fn) =>
        fn.metricErrors({ period: cdk.Duration.minutes(5), statistic: 'Sum' }),
      );
      const lambdaDurations = lambdaFunctions.map((fn) =>
        fn.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p95' }),
      );
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({ title: 'Lambda Errors', left: lambdaErrors }),
        new cloudwatch.GraphWidget({ title: 'Lambda Duration p95 (ms)', left: lambdaDurations }),
      );
    }

    // DynamoDB consumed capacity and throttles
    if (tables.length > 0) {
      const readCapacity = tables.map((t) =>
        t.metricConsumedReadCapacityUnits({ period: cdk.Duration.minutes(5), statistic: 'Sum' }),
      );
      const writeCapacity = tables.map((t) =>
        t.metricConsumedWriteCapacityUnits({ period: cdk.Duration.minutes(5), statistic: 'Sum' }),
      );
      const readThrottles = tables.map((t) =>
        t.metricUserErrors({ period: cdk.Duration.minutes(5), statistic: 'Sum' }),
      );
      const writeThrottles = tables.map((t) =>
        t.metricSystemErrorsForOperations({
          operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.UPDATE_ITEM, dynamodb.Operation.DELETE_ITEM],
          period: cdk.Duration.minutes(5),
          statistic: 'Sum',
        }),
      );

      dashboard.addWidgets(
        new cloudwatch.GraphWidget({ title: 'DynamoDB Read Capacity (sum)', left: readCapacity, width: 12 }),
        new cloudwatch.GraphWidget({ title: 'DynamoDB Write Capacity (sum)', left: writeCapacity, width: 12 }),
      );
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({ title: 'DynamoDB User Errors (throttles)', left: readThrottles, width: 12 }),
        new cloudwatch.GraphWidget({ title: 'DynamoDB System Errors', left: writeThrottles, width: 12 }),
      );
    }

    // Cognito metrics
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

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Cognito Sign-Ups',
        left: [cognitoSignUpSuccesses],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Cognito Sign-Ins',
        left: [cognitoSignInSuccesses],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'Cognito Token Refreshes',
        left: [cognitoTokenRefreshSuccesses],
        width: 8,
      }),
    );

    // SNS/SES metrics (if SNS topic provided)
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

      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'SNS Messages Published',
          left: [snsPublished],
          width: 8,
        }),
        new cloudwatch.GraphWidget({
          title: 'SNS Messages Delivered',
          left: [snsDelivered],
          width: 8,
        }),
        new cloudwatch.GraphWidget({
          title: 'SNS Delivery Failures',
          left: [snsFailed],
          width: 8,
        }),
      );
    }

    // SES metrics (account level)
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

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'SES Emails Sent',
        left: [sesSent],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'SES Bounce Rate',
        left: [sesBounces],
        width: 8,
      }),
      new cloudwatch.GraphWidget({
        title: 'SES Complaint Rate',
        left: [sesComplaints],
        width: 8,
      }),
    );

    // ============================================================
    // ALARMS
    // ============================================================

    // Lambda error rate alarm (> 5%)
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

    // API 5xx rate alarm (> 2%)
    const api5xxAlarm = api5xx.createAlarm(this, 'Api5xxAlarm', {
      alarmName: `${environment}-api-5xx-errors`,
      evaluationPeriods: 2,
      threshold: 10, // 10 errors in 5 minutes
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    if (alarmTopic) {
      api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    }

    this.alarms.push(api5xxAlarm);

    // DynamoDB throttling alarm
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

    // SNS delivery failure alarm
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

    // ============================================================
    // LOG INSIGHTS QUERIES
    // ============================================================

    // Create a query definition for failed auth attempts
    new logs.QueryDefinition(this, 'FailedAuthQuery', {
      queryDefinitionName: `${environment}-failed-auth-attempts`,
      queryString: `fields @timestamp, @message, userId, identifier, reason
| filter @message like /auth.*failed/i or @message like /invalid.*otp/i
| sort @timestamp desc
| limit 100` as any,
      logGroups: lambdaFunctions.map((fn) => fn.logGroup).filter((lg) => lg !== undefined) as logs.ILogGroup[],
    });

    // Create a query definition for rate limit violations
    new logs.QueryDefinition(this, 'RateLimitQuery', {
      queryDefinitionName: `${environment}-rate-limit-violations`,
      queryString: `fields @timestamp, @message, identifier, ip, requestId
| filter @message like /rate.*limit/i or @message like /too.*many.*requests/i
| stats count() by identifier, ip
| sort count desc
| limit 50` as any,
      logGroups: lambdaFunctions.map((fn) => fn.logGroup).filter((lg) => lg !== undefined) as logs.ILogGroup[],
    });

    // Create a query definition for suspicious patterns
    new logs.QueryDefinition(this, 'SuspiciousPatternQuery', {
      queryDefinitionName: `${environment}-suspicious-patterns`,
      queryString: `fields @timestamp, identifier, ip, userAgent, @message
| filter @message like /failed/i
| stats count() as attempts by identifier, ip
| filter attempts > 10
| sort attempts desc
| limit 50` as any,
      logGroups: lambdaFunctions.map((fn) => fn.logGroup).filter((lg) => lg !== undefined) as logs.ILogGroup[],
    });

    // Construct a direct URL to the dashboard in the current region
    const region = cdk.Stack.of(this).region;
    this.dashboardUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboard.dashboardName}`;
  }
}
