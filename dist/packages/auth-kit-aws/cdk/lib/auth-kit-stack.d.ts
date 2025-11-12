import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface AuthKitStackProps extends cdk.StackProps {
    environment: string;
}
export declare class AuthKitStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AuthKitStackProps);
}
