import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
export interface CommsConstructProps {
    environment: string;
    kmsKey: kms.Key;
}
export declare class CommsConstruct extends Construct {
    readonly snsTopic: sns.Topic;
    readonly sesIdentity: string;
    constructor(scope: Construct, id: string, props: CommsConstructProps);
}
