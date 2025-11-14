# CI/CD Pipeline Guide

**Complete guide for setting up automated testing, security scanning, and multi-environment deployments with GitHub Actions**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [AWS OIDC Setup](#aws-oidc-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Workflow Architecture](#workflow-architecture)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Multi-Environment Strategy](#multi-environment-strategy)
- [Branch Protection Rules](#branch-protection-rules)
- [Security Scanning](#security-scanning)
- [Deployment Process](#deployment-process)
- [Rollback Strategy](#rollback-strategy)
- [Monitoring & Notifications](#monitoring--notifications)
- [Troubleshooting](#troubleshooting)

---

## Overview

The CI/CD pipeline provides:

- ✅ **Automated Testing** - Unit, integration, E2E tests on every commit
- ✅ **Security Scanning** - Vulnerability detection, secret scanning, dependency audits
- ✅ **Multi-Environment Deployments** - Dev (auto), Staging (manual), Prod (gated)
- ✅ **Infrastructure as Code** - CDK deployments with diff previews
- ✅ **Quality Gates** - Branch protection, required approvals, status checks
- ✅ **OIDC Authentication** - Secure AWS access without long-lived credentials
- ✅ **Deployment Tracking** - Release management, changelogs, notifications

### Pipeline Stages

```
┌─────────────┐
│   PR/Push   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│     CI Pipeline (Parallel Jobs)     │
├─────────────────────────────────────┤
│ • Lint (ESLint)                     │
│ • Unit Tests (Jest)                 │
│ • Integration Tests (LocalStack)    │
│ • E2E Tests (Playwright)            │
│ • Build (TypeScript + CDK Synth)    │
│ • Security Scan (Snyk, OWASP)       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────┐
│  Quality Gates  │
│  ✓ All Passed   │
└──────┬──────────┘
       │
       ├─────────────┬─────────────┬──────────────┐
       ▼             ▼             ▼              ▼
┌───────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│    Dev    │  │ Staging  │  │   Prod   │  │  Manual  │
│   Auto    │  │ Manual   │  │  Gated   │  │ Workflow │
│  Deploy   │  │ Approval │  │ 2 Approvals│ │ Dispatch │
└───────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## Prerequisites

### Required Tools

1. **AWS Account** with admin access
2. **GitHub Repository** with admin permissions
3. **AWS CLI** v2.x installed
4. **Node.js** 18+ and npm
5. **AWS CDK** CLI installed globally

### Required Knowledge

- Basic AWS services (IAM, CloudFormation, Lambda, DynamoDB)
- GitHub Actions syntax
- CDK deployment process
- AWS OIDC federation

---

## AWS OIDC Setup

### Why OIDC?

Traditional CI/CD uses long-lived AWS access keys stored as GitHub secrets. This approach has security risks:
- ❌ Keys can be leaked or stolen
- ❌ Keys need regular rotation
- ❌ Difficult to audit and track usage
- ❌ Overly broad permissions

**OIDC (OpenID Connect)** provides temporary, scoped credentials:
- ✅ No long-lived credentials
- ✅ Automatic token expiration
- ✅ Fine-grained permissions per environment
- ✅ Full audit trail in CloudTrail

### Step 1: Create OIDC Identity Provider

Run this once per AWS account:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

**Output**: Note the provider ARN (e.g., `arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com`)

### Step 2: Create IAM Roles for Each Environment

Create three IAM roles with trust policies that allow GitHub Actions to assume them:

#### Dev Environment Role

**Role Name**: `github-actions-authkit-dev`

**Trust Policy** (`trust-policy-dev.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**Permissions Policy** (attach `cdk-deploy-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:PassRole",
        "lambda:*",
        "dynamodb:*",
        "apigateway:*",
        "cognito-idp:*",
        "sns:*",
        "ses:*",
        "secretsmanager:*",
        "kms:*",
        "s3:*",
        "logs:*",
        "events:*",
        "xray:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Create Role**:
```bash
# Replace ACCOUNT_ID, YOUR_ORG, YOUR_REPO
aws iam create-role \
  --role-name github-actions-authkit-dev \
  --assume-role-policy-document file://trust-policy-dev.json

aws iam put-role-policy \
  --role-name github-actions-authkit-dev \
  --policy-name CDKDeployPolicy \
  --policy-document file://cdk-deploy-policy.json
```

#### Staging Environment Role

**Role Name**: `github-actions-authkit-staging`

Update trust policy to allow `main` branch and `release/*` branches:

```json
{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": [
        "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main",
        "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/release/*"
      ]
    }
  }
}
```

#### Production Environment Role

**Role Name**: `github-actions-authkit-prod`

Update trust policy to allow only tags:

```json
{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/tags/v*"
    }
  }
}
```

### Step 3: Note Role ARNs

Save these ARNs for GitHub secrets configuration:

```bash
aws iam get-role --role-name github-actions-authkit-dev --query 'Role.Arn' --output text
aws iam get-role --role-name github-actions-authkit-staging --query 'Role.Arn' --output text
aws iam get-role --role-name github-actions-authkit-prod --query 'Role.Arn' --output text
```

---

## GitHub Secrets Configuration

### Repository Secrets

Navigate to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add the following secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_ACCOUNT_ID` | `123456789012` | Your AWS account ID |
| `AWS_REGION` | `us-east-1` | Default AWS region |
| `CDK_DEPLOY_ROLE_ARN_DEV` | `arn:aws:iam::...` | Dev environment IAM role ARN |
| `CDK_DEPLOY_ROLE_ARN_STAGING` | `arn:aws:iam::...` | Staging environment IAM role ARN |
| `CDK_DEPLOY_ROLE_ARN_PROD` | `arn:aws:iam::...` | Prod environment IAM role ARN |
| `SLACK_WEBHOOK_URL` (optional) | `https://hooks.slack.com/...` | For deployment notifications |
| `SNYK_TOKEN` (optional) | `your-snyk-token` | For Snyk security scanning |

### Environment Secrets (Advanced)

For environment-specific secrets, use GitHub Environments:

1. Go to `Settings` → `Environments`
2. Create environments: `dev`, `staging`, `production`
3. Add environment-specific secrets (e.g., `SES_IDENTITY`, `API_KEY`)

---

## Workflow Architecture

### Workflow Files Structure

```
.github/
├── workflows/
│   ├── ci.yml                  # CI pipeline (test, lint, build)
│   ├── security.yml            # Security scanning
│   ├── cdk-diff.yml            # Infrastructure diff on PRs
│   ├── deploy-dev.yml          # Auto-deploy to dev
│   ├── deploy-staging.yml      # Deploy to staging
│   ├── deploy-prod.yml         # Deploy to production
│   └── release.yml             # Create GitHub releases
├── CODEOWNERS                  # Code ownership
└── dependabot.yml              # Dependency updates
```

### Workflow Triggers

| Workflow | Triggers | Purpose |
|----------|----------|---------|
| **CI** | Push (all branches), PR to main | Run tests, lint, build |
| **Security** | Push to main, PR, Schedule (weekly) | Scan vulnerabilities |
| **CDK Diff** | PR to main | Show infrastructure changes |
| **Deploy Dev** | Push to main | Auto-deploy to dev |
| **Deploy Staging** | Manual, Tag `v*-rc*` | Deploy to staging with approval |
| **Deploy Prod** | Tag `v*.*.*`, Manual | Deploy to production (gated) |
| **Release** | Tag `v*.*.*` | Create GitHub release |

---

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Purpose**: Run tests, lint, and build on every commit

**Key Features**:
- Parallel job execution for speed
- Matrix strategy (Node 18.x, 20.x)
- Coverage reporting
- LocalStack for integration tests
- Playwright for E2E tests

**Jobs**:
1. **Lint** - ESLint validation
2. **Unit Tests** - Jest with coverage
3. **Integration Tests** - DynamoDB with LocalStack
4. **E2E Tests** - Playwright cross-browser
5. **Build** - TypeScript compilation + CDK synth

**Example Snippet**:
```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4
        if: matrix.node-version == 20
```

### 2. Security Workflow (`.github/workflows/security.yml`)

**Purpose**: Detect vulnerabilities and security issues

**Scans**:
- **npm audit** - Known vulnerabilities in dependencies
- **Snyk** - Comprehensive vulnerability scanning
- **OWASP Dependency Check** - CVE database checking
- **Secret Scanning** - Detect exposed credentials

**Example Snippet**:
```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high

  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### 3. CDK Diff Workflow (`.github/workflows/cdk-diff.yml`)

**Purpose**: Show infrastructure changes on PRs

**Benefits**:
- Preview changes before merge
- Catch accidental resource deletions
- Review security group changes
- Validate IAM permissions

**Example Snippet**:
```yaml
name: CDK Diff

on:
  pull_request:
    branches: [main]
    paths:
      - 'packages/auth-kit-aws/cdk/**'
      - 'cdk.json'

jobs:
  cdk-diff:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.CDK_DEPLOY_ROLE_ARN_DEV }}
          aws-region: ${{ secrets.AWS_REGION }}
      - run: npm run cdk diff -- --context environment=dev > diff.txt
      - uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('diff.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## CDK Diff (Dev Environment)\n\`\`\`diff\n${diff}\n\`\`\``
            });
```

### 4. Deploy Dev Workflow (`.github/workflows/deploy-dev.yml`)

**Purpose**: Auto-deploy to dev on main branch

**Steps**:
1. Run full CI pipeline
2. Assume dev IAM role via OIDC
3. CDK deploy to dev environment
4. Run smoke tests
5. Notify team

**Example Snippet**:
```yaml
name: Deploy to Dev

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: dev
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.CDK_DEPLOY_ROLE_ARN_DEV }}
          aws-region: ${{ secrets.AWS_REGION }}
      - run: npm run cdk deploy -- --all --context environment=dev --require-approval never
      - run: ./scripts/smoke-test-api.sh dev
```

### 5. Deploy Staging Workflow (`.github/workflows/deploy-staging.yml`)

**Purpose**: Deploy to staging with manual approval

**Features**:
- Manual approval required
- Full E2E test suite
- Load testing with k6
- Deployment notifications

### 6. Deploy Production Workflow (`.github/workflows/deploy-prod.yml`)

**Purpose**: Gated deployment to production

**Features**:
- Requires 2 approvals
- Full security scan before deploy
- Automated rollback on failure
- Release creation
- Stakeholder notifications

---

## Multi-Environment Strategy

### Environment Configurations

| Environment | Trigger | Approval | Capacity | Monitoring |
|-------------|---------|----------|----------|------------|
| **Dev** | Auto (main branch) | None | On-demand | Basic |
| **Staging** | Manual/RC tags | 1 reviewer | Production-like | Full |
| **Production** | Release tags | 2 reviewers | High availability | Enhanced |

### Environment Variables

**Dev**:
```yaml
ENVIRONMENT: dev
LOG_LEVEL: debug
RATE_LIMIT_MAX_REQUESTS: 100
DYNAMO_BILLING_MODE: PAY_PER_REQUEST
ENABLE_XRAY: false
```

**Staging**:
```yaml
ENVIRONMENT: staging
LOG_LEVEL: info
RATE_LIMIT_MAX_REQUESTS: 50
DYNAMO_BILLING_MODE: PROVISIONED
ENABLE_XRAY: true
```

**Production**:
```yaml
ENVIRONMENT: production
LOG_LEVEL: warn
RATE_LIMIT_MAX_REQUESTS: 10
DYNAMO_BILLING_MODE: PROVISIONED
ENABLE_XRAY: true
MULTI_AZ: true
```

### CDK Context by Environment

Use `cdk.json` or CDK context to configure per-environment settings:

```json
{
  "context": {
    "dev": {
      "dynamoDBBillingMode": "PAY_PER_REQUEST",
      "lambdaReservedConcurrency": 1,
      "apiThrottling": false
    },
    "prod": {
      "dynamoDBBillingMode": "PROVISIONED",
      "dynamoDBReadCapacity": 10,
      "dynamoDBWriteCapacity": 5,
      "lambdaReservedConcurrency": 100,
      "apiThrottling": true,
      "apiThrottleRate": 1000,
      "apiThrottleBurst": 2000
    }
  }
}
```

---

## Branch Protection Rules

### Main Branch Protection

Configure at: `Settings` → `Branches` → `Add branch protection rule`

**Branch name pattern**: `main`

**Required Settings**:
- ✅ Require a pull request before merging
  - Required approvals: 1
  - Dismiss stale PR approvals when new commits are pushed
  - Require review from Code Owners
- ✅ Require status checks to pass before merging
  - Require branches to be up to date before merging
  - Status checks that are required:
    - `lint`
    - `unit-tests`
    - `integration-tests`
    - `e2e-tests`
    - `build`
    - `security-scan`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings
- ✅ Restrict who can push to matching branches
- ❌ Allow force pushes: Never
- ❌ Allow deletions: Never

### Release Branches

**Branch name pattern**: `release/*`

**Settings**:
- Same as main, but allow deployment to staging
- Require linear history

---

## Security Scanning

### Dependency Scanning

**Tools Used**:
1. **npm audit** - Built-in npm vulnerability scanner
2. **Snyk** - Commercial scanner with detailed remediation
3. **OWASP Dependency Check** - CVE database checking
4. **Dependabot** - Automated dependency updates

**Configuration** (`.github/dependabot.yml`):
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "your-team"
    labels:
      - dependencies
      - security
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
```

### Secret Scanning

**Tools**:
- GitHub's built-in secret scanning (free for public repos)
- GitGuardian for advanced patterns
- TruffleHog for commit history scanning

**Prevention**:
- Use pre-commit hooks to block secrets
- Use AWS Secrets Manager for all credentials
- Never commit `.env` files
- Add sensitive files to `.gitignore`

### License Compliance

Check for incompatible licenses:

```bash
npx license-checker --summary
```

**Allowed Licenses**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC

---

## Deployment Process

### Development Deployment

**Frequency**: Every commit to main
**Process**: Fully automated

```bash
git checkout main
git pull
git push origin main
# Deployment happens automatically via GitHub Actions
```

### Staging Deployment

**Frequency**: On-demand or release candidates
**Process**: Manual trigger with approval

**Option 1: Manual Workflow Dispatch**
```bash
# Go to Actions → Deploy to Staging → Run workflow
```

**Option 2: Release Candidate Tag**
```bash
git tag v1.0.0-rc1
git push origin v1.0.0-rc1
```

**Approval**: 1 team member must approve in GitHub UI

### Production Deployment

**Frequency**: On release
**Process**: Tag-based with 2 approvals

**Steps**:
1. **Create Release Tag**:
   ```bash
   git checkout main
   git pull
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Automatic Workflow Trigger**:
   - CI pipeline runs
   - Security scan executes
   - CDK diff generated
   - Awaits 2 approvals

3. **Approval Process**:
   - Navigate to Actions → Deploy to Production
   - Review CDK diff
   - Review security scan results
   - 2 reviewers click "Approve and deploy"

4. **Deployment**:
   - CDK deploys to production
   - Smoke tests run
   - GitHub release created
   - Notifications sent

5. **Verification**:
   ```bash
   # Check API health
   curl https://api.authkit.prod/health

   # Check CloudWatch metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ApiGateway \
     --metric-name Count \
     --start-time 2025-01-01T00:00:00Z \
     --end-time 2025-01-01T01:00:00Z \
     --period 3600 \
     --statistics Sum
   ```

---

## Rollback Strategy

### Automatic Rollback

CDK provides CloudFormation rollback on deployment failure:

- Stack creation fails → Entire stack deleted
- Stack update fails → Roll back to previous version
- Lambda deployment fails → Previous version remains active

### Manual Rollback

**Method 1: Redeploy Previous Tag**

```bash
# Find previous successful tag
git tag --sort=-version:refname | head -5

# Deploy previous version
git checkout v1.0.0
git tag v1.0.1-rollback
git push origin v1.0.1-rollback
```

**Method 2: CDK Stack Rollback**

```bash
# List CloudFormation stacks
aws cloudformation list-stacks --stack-status-filter UPDATE_COMPLETE

# Rollback to previous version
aws cloudformation rollback-stack --stack-name AuthKitStack-prod
```

**Method 3: Manual Resource Restoration**

If automated rollback fails:

1. **Identify Failed Resources**:
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name AuthKitStack-prod \
     --max-items 50
   ```

2. **Restore Lambda Function**:
   ```bash
   aws lambda update-function-code \
     --function-name authkit-start-auth-prod \
     --s3-bucket cdk-deploy-bucket \
     --s3-key lambda/previous-version.zip
   ```

3. **Restore DynamoDB Table**:
   ```bash
   aws dynamodb restore-table-from-backup \
     --target-table-name authkit-challenges-prod \
     --backup-arn arn:aws:dynamodb:...:backup/xxx
   ```

### Rollback Validation

After rollback:

```bash
# Run smoke tests
./scripts/smoke-test-api.sh prod

# Check error rates
aws logs tail /aws/lambda/authkit-start-auth-prod --since 5m

# Verify DynamoDB operations
aws dynamodb scan --table-name authkit-challenges-prod --limit 1
```

---

## Monitoring & Notifications

### Slack Notifications

**Setup**:
1. Create Slack incoming webhook
2. Add `SLACK_WEBHOOK_URL` to GitHub secrets
3. Add notification step to workflows

**Example**:
```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Deployment to ${{ github.event.inputs.environment }} - ${{ job.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Deployment Status*: ${{ job.status }}\n*Environment*: Production\n*Triggered by*: ${{ github.actor }}\n*Commit*: ${{ github.sha }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Email Notifications

Configure GitHub notification preferences:
- Settings → Notifications → Actions
- Enable email for failed workflows

### CloudWatch Alarms

Post-deployment alarms trigger SNS notifications:

```yaml
# In CDK construct
const alarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
  metric: api.metricServerError(),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'API Gateway 5xx errors',
});

alarm.addAlarmAction(new cloudwatchActions.SnsAction(snsTopic));
```

### Deployment Metrics

Track deployment success in CloudWatch:

```bash
aws cloudwatch put-metric-data \
  --namespace AuthKit/Deployments \
  --metric-name DeploymentSuccess \
  --value 1 \
  --dimensions Environment=prod
```

---

## Troubleshooting

### Common Issues

#### 1. OIDC Assume Role Failed

**Error**: `Not authorized to perform sts:AssumeRoleWithWebIdentity`

**Solutions**:
- Verify OIDC provider exists in AWS IAM
- Check role trust policy allows GitHub repo
- Ensure `id-token: write` permission in workflow
- Validate role ARN in GitHub secrets

**Verification**:
```bash
# Check OIDC provider
aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com

# Check role trust policy
aws iam get-role --role-name github-actions-authkit-dev
```

#### 2. CDK Deploy Permission Denied

**Error**: `User is not authorized to perform: cloudformation:CreateStack`

**Solutions**:
- Attach broader IAM policy to deployment role
- Add specific missing permissions
- Use `cdk diff` to identify required permissions

**Example Policy Update**:
```bash
aws iam put-role-policy \
  --role-name github-actions-authkit-dev \
  --policy-name AdditionalPermissions \
  --policy-document file://additional-perms.json
```

#### 3. LocalStack Integration Tests Timeout

**Error**: `TimeoutError: Waiting for LocalStack to be ready`

**Solutions**:
- Increase timeout in workflow (default: 60s → 120s)
- Check LocalStack service health
- Verify Docker daemon running in GitHub Actions

**Workflow Fix**:
```yaml
- name: Start LocalStack
  run: docker-compose -f docker-compose.test.yml up -d

- name: Wait for LocalStack
  run: |
    timeout 120 bash -c 'until curl -s http://localhost:4566/_localstack/health | grep -q "\"dynamodb\": \"available\""; do sleep 2; done'
```

#### 4. CDK Bootstrap Bucket Missing

**Error**: `S3 bucket cdk-bootstrap-... does not exist`

**Solutions**:
```bash
# Bootstrap CDK for the AWS account
cdk bootstrap aws://ACCOUNT_ID/REGION
```

#### 5. Secrets Not Found in Secrets Manager

**Error**: `ResourceNotFoundException: Secrets Manager can't find the specified secret`

**Solutions**:
- Ensure secrets created during CDK deployment
- Verify secret names match environment
- Check IAM permissions for Secrets Manager access

**Verification**:
```bash
aws secretsmanager list-secrets \
  --filters Key=name,Values=authkit
```

### Debug Mode

Enable debug logging in workflows:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Workflow Logs

View detailed logs:
```bash
# Using GitHub CLI
gh run list --limit 10
gh run view RUN_ID --log

# Using AWS CloudWatch (for Lambda)
aws logs tail /aws/lambda/authkit-start-auth-prod --follow --format short
```

---

## Best Practices

### 1. Secrets Management

✅ **Do**:
- Use GitHub OIDC for AWS authentication
- Store sensitive values in AWS Secrets Manager
- Use environment-specific secrets
- Rotate secrets regularly

❌ **Don't**:
- Commit secrets to repository
- Use long-lived AWS access keys
- Share secrets across environments
- Log sensitive values

### 2. Deployment Strategy

✅ **Do**:
- Auto-deploy to dev on every main commit
- Require approvals for production
- Run full test suite before deploy
- Use blue-green deployments for zero downtime

❌ **Don't**:
- Deploy directly to production
- Skip tests in CI pipeline
- Deploy on Fridays (production)
- Bypass approval processes

### 3. Testing

✅ **Do**:
- Run unit tests on every commit
- Run integration tests before deploy
- Run E2E tests in staging
- Run load tests before production deploy

❌ **Don't**:
- Skip tests to save time
- Test only in production
- Ignore flaky tests
- Deploy without smoke tests

### 4. Monitoring

✅ **Do**:
- Monitor deployment metrics
- Set up alarms for failures
- Track deployment frequency
- Monitor rollback rates

❌ **Don't**:
- Deploy and forget
- Ignore alarm notifications
- Disable alarms to reduce noise
- Skip post-deployment validation

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Manual deployment guide
- [TESTING.md](./TESTING.md) - Testing documentation
- [SECRET_ROTATION.md](./SECRET_ROTATION.md) - Secrets management

---

**Questions or Issues?**

- Check workflow logs in GitHub Actions tab
- Review CloudWatch logs for Lambda functions
- Consult AWS CloudFormation events for deployment issues
- Open an issue in the repository
