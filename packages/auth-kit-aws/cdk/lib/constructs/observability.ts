import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface ObservabilityConstructProps {
  environment: string;
  userPool: cognito.UserPool;
  api: apigateway.HttpApi;
  lambdaFunctions: lambda.Function[];
  tables: dynamodb.Table[];
}

export class ObservabilityConstruct extends Construct {
  public readonly dashboardUrl: string;

  constructor(scope: Construct, id: string, props: ObservabilityConstructProps) {
    super(scope, id);

    const { environment, api, lambdaFunctions, tables } = props;

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

    // DynamoDB consumed capacity (sum across tables)
    if (tables.length > 0) {
      const readCapacity = tables.map((t) =>
        t.metricConsumedReadCapacityUnits({ period: cdk.Duration.minutes(5), statistic: 'Sum' }),
      );
      const writeCapacity = tables.map((t) =>
        t.metricConsumedWriteCapacityUnits({ period: cdk.Duration.minutes(5), statistic: 'Sum' }),
      );
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({ title: 'DynamoDB Read Capacity (sum)', left: readCapacity }),
        new cloudwatch.GraphWidget({ title: 'DynamoDB Write Capacity (sum)', left: writeCapacity }),
      );
    }

    // Construct a direct URL to the dashboard in the current region
    const region = cdk.Stack.of(this).region;
    this.dashboardUrl = `https://console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboard.dashboardName}`;
  }
}
