#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthKitStack } from '../lib/auth-kit-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const environment = app.node.tryGetContext('environment') || 'dev';
const stackName = `AuthKit-${environment}`;

new AuthKitStack(app, stackName, {
  env,
  environment,
  description: 'Passwordless Authentication Kit - Production Ready',
  tags: {
    Project: 'AuthKit',
    Environment: environment,
    ManagedBy: 'CDK',
  },
});

app.synth();
