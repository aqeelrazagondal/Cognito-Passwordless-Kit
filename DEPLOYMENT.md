# AuthKit Deployment Guide

This guide walks you through deploying the AuthKit infrastructure to AWS.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured (`aws configure`)
3. **Node.js** 18+ and npm
4. **AWS CDK** installed globally: `npm install -g aws-cdk`
5. **SES Email/Domain** verified in AWS SES (for email sending)
6. **Secrets Manager** access (for secure credential storage)

## Quick Start

### 1. Setup Environment Variables

Run the interactive setup script:

```bash
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh
```

Or manually create `.env.local`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
SES_IDENTITY=noreply@yourdomain.com

# Persistence
PERSISTENCE_BACKEND=dynamodb

# CAPTCHA Configuration (optional)
CAPTCHA_PROVIDER=hcaptcha  # or 'recaptcha'
CAPTCHA_SECRET_KEY=your-secret-key
CAPTCHA_SITE_KEY=your-site-key  # optional

# Secrets Manager (optional - for production)
# Secrets are automatically created by CDK, but you can override ARNs:
# JWT_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:authkit-jwt-secret-dev
# TWILIO_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:authkit-twilio-dev
# CAPTCHA_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:authkit-captcha-dev
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Bootstrap CDK (First Time Only)

```bash
cdk bootstrap --context environment=dev
```

### 5. Deploy the Stack

**Option A: Using the deployment script**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev
```

**Option B: Manual deployment**

```bash
# Synthesize the stack
cdk synth --context environment=dev

# Deploy
cdk deploy --all --context environment=dev
```

## Environment Configuration

### Environment Names

- `dev` - Development environment
- `staging` - Staging environment
- `prod` - Production environment

Deploy to a specific environment:

```bash
cdk deploy --all --context environment=prod
```

## Post-Deployment Configuration

### 1. Verify SES Identity

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Navigate to **Verified identities**
3. Verify your email address or domain
4. Update `SES_IDENTITY` in your environment variables if needed

### 2. SES Configuration Set (Automatic)

The CDK stack automatically creates:
- **Configuration Set Name**: `authkit-{environment}`
- **SNS Topic**: For bounce/complaint notifications
- **Event Destinations**: Bounces and complaints

**To use the configuration set when sending emails:**

Include this header in your SES email requests:

```
X-SES-CONFIGURATION-SET: authkit-dev
```

Or in your code:

```typescript
// Using AWS SDK
await sesClient.sendEmail({
  Source: 'noreply@yourdomain.com',
  Destination: { ToAddresses: ['user@example.com'] },
  Message: { /* ... */ },
  ConfigurationSetName: 'authkit-dev', // Use the configuration set
});
```

### 3. Stack Outputs

After deployment, note these important outputs:

- **SESNotificationTopicArn**: SNS topic ARN for bounce/complaint notifications
- **SESConfigurationSetName**: Configuration set name to use in email headers
- **UserPoolId**: Cognito User Pool ID
- **ApiEndpoint**: API Gateway endpoint URL

View outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name "AuthKit-dev" \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Secrets Manager Setup

### Automatic Secret Creation

The CDK stack automatically creates the following secrets:

1. **JWT Secret** (`authkit-jwt-secret-{environment}`)
   - Auto-rotated every 30 days
   - Used for signing magic link tokens
   - Encrypted with KMS

2. **Optional Secrets** (created if CDK context flags are set):
   - Twilio (`authkit-twilio-{environment}`)
   - CAPTCHA (`authkit-captcha-{environment}`)
   - Vonage (`authkit-vonage-{environment}`)

### Secret ARNs

After deployment, secret ARNs are available in CloudFormation outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name AuthKitStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`JWTSecretArn`].OutputValue' \
  --output text
```

### Updating Secret Values

1. **Via AWS Console**:
   - Go to Secrets Manager
   - Select the secret
   - Click "Retrieve secret value" → "Edit"
   - Update JSON values
   - Save

2. **Via AWS CLI**:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id authkit-twilio-dev \
     --secret-string '{"accountSid":"ACxxx","authToken":"token"}'
   ```

3. **Clear Application Cache**:
   - NestJS: Restart application or call `refreshSecret()`
   - Lambda: Cache expires after 1 hour automatically

### Secret Rotation

See [SECRET_ROTATION.md](./SECRET_ROTATION.md) for detailed rotation guide.

**JWT Secret**: Automatically rotated every 30 days
**Other Secrets**: Manual rotation (see rotation guide)

### Creating Optional Secrets

To create optional secrets (Twilio, CAPTCHA, Vonage), use CDK context:

```bash
# Deploy with Twilio secret
cdk deploy --context createTwilioSecret=true

# Deploy with CAPTCHA secret
cdk deploy --context createCaptchaSecret=true

# Deploy with Vonage secret
cdk deploy --context createVonageSecret=true
```

After deployment, update secret values in AWS Console:
1. Go to AWS Secrets Manager
2. Find the secret (e.g., `authkit-twilio-dev`)
3. Click "Retrieve secret value" → "Edit"
4. Update the JSON with your credentials

## CAPTCHA Configuration

### hCaptcha

1. Sign up at [hCaptcha](https://www.hcaptcha.com/)
2. Create a site and get your Site Key and Secret Key
3. Set environment variables:

```bash
CAPTCHA_PROVIDER=hcaptcha
CAPTCHA_SECRET_KEY=your-hcaptcha-secret-key
CAPTCHA_SITE_KEY=your-hcaptcha-site-key
```

### reCAPTCHA

1. Sign up at [Google reCAPTCHA](https://www.google.com/recaptcha/)
2. Create a site and get your Site Key and Secret Key
3. Set environment variables:

```bash
CAPTCHA_PROVIDER=recaptcha
CAPTCHA_SECRET_KEY=your-recaptcha-secret-key
CAPTCHA_SITE_KEY=your-recaptcha-site-key
```

**Note**: If CAPTCHA is not configured, the service will skip CAPTCHA verification (fail-open).

## Monitoring

### CloudWatch Dashboard

After deployment, a CloudWatch dashboard is automatically created. Access it via:

```bash
aws cloudformation describe-stacks \
  --stack-name "AuthKit-dev" \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
  --output text
```

### Logs

View Lambda function logs:

```bash
# SNS Bounce Handler
aws logs tail /aws/lambda/authkit-sns-bounce-handler-dev --follow

# Auth handlers
aws logs tail /aws/lambda/authkit-start-auth-dev --follow
```

## Troubleshooting

### CDK Bootstrap Issues

If you get bootstrap errors:

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION --context environment=dev
```

### SES Sandbox Mode

If your SES account is in sandbox mode:
- You can only send to verified email addresses
- Request production access in the SES console

### Lambda Timeout

If Lambda functions timeout:
- Check CloudWatch logs for errors
- Increase timeout in `packages/auth-kit-aws/cdk/lib/constructs/`

### DynamoDB Permissions

Ensure your AWS credentials have permissions for:
- DynamoDB (CreateTable, PutItem, GetItem, Query, etc.)
- Lambda (CreateFunction, UpdateFunction, etc.)
- SNS (CreateTopic, Subscribe, Publish)
- SES (SendEmail, CreateConfigurationSet)
- KMS (CreateKey, Encrypt, Decrypt)

## Cleanup

To destroy the stack:

```bash
cdk destroy --all --context environment=dev
```

**Warning**: This will delete all resources including DynamoDB tables and data.

## Production Checklist

Before deploying to production:

- [ ] Verify SES domain/email identity
- [ ] Request SES production access (if needed)
- [ ] Configure CAPTCHA (hCaptcha or reCAPTCHA)
- [ ] Set up CloudWatch alarms
- [ ] Configure backup/retention policies
- [ ] Review IAM permissions
- [ ] Enable MFA for AWS account
- [ ] Set up AWS Organizations SCPs (if applicable)
- [ ] Configure VPC endpoints (if using VPC)
- [ ] Set up WAF rules for API Gateway
- [ ] Configure custom domain for API Gateway
- [ ] Set up SSL/TLS certificates

## Secrets Manager

For detailed information about secrets management and rotation, see:
- [SECRET_ROTATION.md](./SECRET_ROTATION.md) - Complete rotation guide

## Support

For issues or questions:
- Check CloudWatch logs
- Review CDK synthesis output
- Verify AWS service quotas
- Check IAM permissions
- Review [SECRET_ROTATION.md](./SECRET_ROTATION.md) for secrets issues

