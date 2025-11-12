import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface KMSConstructProps {
    environment: string;
}
export declare class KMSConstruct extends Construct {
    readonly key: kms.Key;
    constructor(scope: Construct, id: string, props: KMSConstructProps);
}
