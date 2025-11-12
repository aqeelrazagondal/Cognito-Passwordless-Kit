import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CommsConstructProps {
  environment: string;
  kmsKey: kms.Key;
}

export class CommsConstruct extends Construct {
  public readonly snsTopic: sns.Topic;
  public readonly sesIdentity: string;

  constructor(scope: Construct, id: string, props: CommsConstructProps) {
    super(scope, id);

    const { environment, kmsKey } = props;

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
  }
}
