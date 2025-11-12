import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface KMSConstructProps {
  environment: string;
}

/**
 * KMS construct for encryption keys
 */
export class KMSConstruct extends Construct {
  public readonly key: kms.Key;

  constructor(scope: Construct, id: string, props: KMSConstructProps) {
    super(scope, id);

    // Create CMK for encrypting all auth kit resources
    this.key = new kms.Key(this, 'AuthKitKey', {
      description: `AuthKit encryption key for ${props.environment}`,
      enableKeyRotation: true,
      removalPolicy:
        props.environment === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      alias: `alias/authkit-${props.environment}`,
      policy: new iam.PolicyDocument({
        statements: [
          // Allow root account full access
          new iam.PolicyStatement({
            sid: 'Enable IAM User Permissions',
            effect: iam.Effect.ALLOW,
            principals: [
              new iam.AccountRootPrincipal(),
            ],
            actions: ['kms:*'],
            resources: ['*'],
          }),
          // Allow CloudWatch Logs to use the key
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
          // Allow SNS to use the key
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
          // Allow SES to use the key
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

    // Output
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
