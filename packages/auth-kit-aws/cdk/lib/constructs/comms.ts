import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';

export interface CommsConstructProps {
  environment: string;
  kmsKey: kms.Key;
  bounceNotificationTopic?: sns.Topic; // Optional SNS topic for bounce/complaint notifications
}

export class CommsConstruct extends Construct {
  public readonly snsTopic: sns.Topic;
  public readonly sesIdentity: string;
  public readonly configurationSetName?: string;

  constructor(scope: Construct, id: string, props: CommsConstructProps) {
    super(scope, id);

    const { environment, kmsKey, bounceNotificationTopic } = props;

    // Encrypted SNS Topic for OTP delivery notifications (SMS/email fanout, etc.)
    this.snsTopic = new sns.Topic(this, 'NotificationsTopic', {
      topicName: `authkit-notifications-${environment}`,
      masterKey: kmsKey,
      displayName: `AuthKit Notifications (${environment})`,
    });

    // Allow the account to publish by default (principals in this account)
    this.snsTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowAccountPublish',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(cdk.Stack.of(this).account)],
        actions: ['SNS:Publish'],
        resources: [this.snsTopic.topicArn],
      }),
    );

    // SES identity placeholder — in real deployments this should be a verified
    // domain or email identity. We expose a sensible default that can be overridden
    // by consumers or replaced later with a dedicated SES construct.
    this.sesIdentity = `noreply@${environment}.example.com`;

    // Create SES Configuration Set for bounce/complaint handling if topic is provided
    if (bounceNotificationTopic) {
      const configSetName = `authkit-${environment}`;
      this.configurationSetName = configSetName;

      // Create Configuration Set using CloudFormation
      const configurationSet = new ses.CfnConfigurationSet(this, 'SESConfigurationSet', {
        name: configSetName,
      });

      // Create Event Destination for bounces and complaints
      const eventDestination = new ses.CfnConfigurationSetEventDestination(
        this,
        'SESBounceEventDestination',
        {
          configurationSetName: configSetName,
          eventDestination: {
            name: 'BounceComplaintDestination',
            enabled: true,
            matchingEventTypes: ['bounce', 'complaint'],
            snsDestination: {
              topicArn: bounceNotificationTopic.topicArn,
            },
          },
        },
      );

      // Ensure event destination is created after configuration set
      eventDestination.addDependency(configurationSet);

      // Output the configuration set name
      new cdk.CfnOutput(this, 'SESConfigurationSetName', {
        value: configSetName,
        description: 'SES Configuration Set name. Use this in X-SES-CONFIGURATION-SET header when sending emails.',
        exportName: `AuthKit-${environment}-SESConfigurationSet`,
      });
    }
  }
}
