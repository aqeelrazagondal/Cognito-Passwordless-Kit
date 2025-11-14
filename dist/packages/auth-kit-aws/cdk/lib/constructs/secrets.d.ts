import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export interface SecretsConstructProps {
    environment: string;
    kmsKey: kms.Key;
}
export interface SecretInfo {
    secret: secretsmanager.Secret;
    arn: string;
    name: string;
}
export declare class SecretsConstruct extends Construct {
    readonly jwtSecret: SecretInfo;
    readonly twilioSecret?: SecretInfo;
    readonly captchaSecret?: SecretInfo;
    readonly vonageSecret?: SecretInfo;
    readonly allSecrets: SecretInfo[];
    constructor(scope: Construct, id: string, props: SecretsConstructProps);
    private createJWTSecret;
    private createTwilioSecret;
    private createCaptchaSecret;
    private createVonageSecret;
    private createRotationLambda;
    grantReadAccess(functions: lambda.Function[]): void;
    grantReadAccessToFunction(fn: lambda.Function): void;
}
