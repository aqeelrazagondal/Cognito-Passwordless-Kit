import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import * as path from 'path';

export interface WebhooksConstructProps {
  environment: string;
  denylistTable: dynamodb.Table;
  bouncesTable: dynamodb.Table;
  kmsKey: kms.Key;
}

export class WebhooksConstruct extends Construct {
  public readonly snsBounceHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: WebhooksConstructProps) {
    super(scope, id);

    const { environment, denylistTable, bouncesTable, kmsKey } = props;

    // SNS Bounce Handler Lambda
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

    // Grant permissions
    denylistTable.grantReadWriteData(this.snsBounceHandler);
    bouncesTable.grantReadWriteData(this.snsBounceHandler);
    kmsKey.grantEncryptDecrypt(this.snsBounceHandler);

    // Note: SES bounce/complaint notifications will be configured manually
    // or via SES configuration set. The SNS topic subscription should be
    // set up in the SES console or via a separate SES construct.
    // This Lambda is ready to receive SNS notifications from SES.
  }

  /**
   * Create an SNS topic for SES bounce/complaint notifications
   * This topic should be subscribed to SES configuration set
   */
  createSESNotificationTopic(environment: string): sns.Topic {
    const topic = new sns.Topic(this, 'SESNotificationTopic', {
      topicName: `authkit-ses-notifications-${environment}`,
      displayName: 'AuthKit SES Bounce/Complaint Notifications',
    });

    // Subscribe the Lambda to the topic
    topic.addSubscription(
      new snsSubscriptions.LambdaSubscription(this.snsBounceHandler),
    );

    // Grant SES permission to publish to this topic
    topic.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowSESPublish',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('ses.amazonaws.com')],
        actions: ['SNS:Publish'],
        resources: [topic.topicArn],
      }),
    );

    return topic;
  }
}

