# Secrets Manager Rotation Guide

This document describes how secret rotation works in AuthKit and how to manage it.

## Overview

AuthKit uses AWS Secrets Manager to securely store and rotate secrets. The following secrets are managed:

1. **JWT Secret** - Automatically rotated every 30 days
2. **Twilio Credentials** - Manual rotation (optional)
3. **CAPTCHA Credentials** - Manual rotation (optional)
4. **Vonage Credentials** - Manual rotation (optional)

## JWT Secret Auto-Rotation

### How It Works

The JWT secret is automatically rotated every 30 days using a Lambda rotation function. The rotation process:

1. **Create Secret** - Lambda generates a new secret value
2. **Set Secret** - New secret is stored as `AWSPENDING` version
3. **Test Secret** - Lambda validates the new secret (optional validation)
4. **Finish Secret** - New secret becomes `AWSCURRENT`, old version is archived

### Rotation Lambda

The rotation Lambda function (`JWTSecretRotation`) is automatically created by CDK and:
- Generates a new 32-byte random secret
- Stores it in the secret's `AWSPENDING` version
- Promotes it to `AWSCURRENT` after validation
- Archives the old version

### Monitoring Rotation

Check rotation status in AWS Console:

1. Go to **Secrets Manager** → Select `authkit-jwt-secret-{environment}`
2. View **Rotation configuration** tab
3. Check **Rotation history** for past rotations

### Manual Rotation

To manually trigger rotation:

```bash
aws secretsmanager rotate-secret \
  --secret-id authkit-jwt-secret-dev \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:authkit-jwt-secret-rotation-dev
```

### Handling Rotation in Application

The application automatically handles secret rotation:

1. **NestJS Service** (`SecretsService`):
   - Caches secrets for 1 hour
   - Automatically retrieves new version on cache miss
   - Falls back to environment variables if Secrets Manager unavailable

2. **Lambda Functions**:
   - Use `getJWTSecret()` helper with caching
   - Cache invalidated after 1 hour
   - New invocations automatically get latest secret

### Testing Rotation

To test rotation in development:

```bash
# Trigger rotation
aws secretsmanager rotate-secret --secret-id authkit-jwt-secret-dev

# Wait for rotation to complete (check CloudWatch logs)
# Verify new secret is used
aws secretsmanager get-secret-value --secret-id authkit-jwt-secret-dev --version-stage AWSCURRENT
```

## Optional Secrets Rotation

### Twilio Credentials

Twilio credentials are not auto-rotated. To rotate manually:

1. **Update Secret**:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id authkit-twilio-dev \
     --secret-string '{
       "accountSid": "AC_NEW_SID",
       "authToken": "NEW_TOKEN",
       "fromNumber": "+1234567890",
       "whatsappNumber": "whatsapp:+14155238886"
     }'
   ```

2. **Clear Application Cache**:
   - NestJS: Restart application or call `secretsService.refreshSecret('twilio')`
   - Lambda: Cache expires after 1 hour automatically

### CAPTCHA Credentials

Similar to Twilio, rotate manually:

```bash
aws secretsmanager put-secret-value \
  --secret-id authkit-captcha-dev \
  --secret-string '{
    "provider": "hcaptcha",
    "secretKey": "NEW_SECRET_KEY",
    "siteKey": "NEW_SITE_KEY"
  }'
```

### Vonage Credentials

```bash
aws secretsmanager put-secret-value \
  --secret-id authkit-vonage-dev \
  --secret-string '{
    "apiKey": "NEW_API_KEY",
    "apiSecret": "NEW_API_SECRET",
    "fromNumber": "NEW_FROM_NUMBER"
  }'
```

## Best Practices

### 1. Rotation Schedule

- **JWT Secret**: Auto-rotated every 30 days (recommended)
- **API Keys**: Rotate every 90 days or when compromised
- **CAPTCHA Keys**: Rotate when provider recommends or if compromised

### 2. Monitoring

Set up CloudWatch alarms for:
- Rotation failures
- Secret access errors
- Lambda rotation function errors

### 3. Backup

Secrets Manager automatically:
- Maintains previous versions (up to 100)
- Archives deleted secrets for recovery window
- Provides audit logs via CloudTrail

### 4. Access Control

Use IAM policies to restrict secret access:
- Only Lambda functions and application roles can read secrets
- Only administrators can rotate secrets
- Enable CloudTrail for audit logging

## Troubleshooting

### Rotation Failed

1. Check CloudWatch logs for rotation Lambda
2. Verify Lambda has permissions to update secret
3. Check secret version limits (max 100 versions)
4. Verify KMS key permissions

### Application Not Using New Secret

1. Clear application cache:
   ```typescript
   secretsService.refreshSecret('jwt');
   ```
2. Restart application (for NestJS)
3. Wait for Lambda cache to expire (1 hour)
4. Check secret ARN in environment variables

### Secret Not Found

1. Verify secret exists in Secrets Manager
2. Check IAM permissions for `secretsmanager:GetSecretValue`
3. Verify secret ARN in environment variables
4. Check region matches AWS_REGION

## Security Considerations

1. **Never commit secrets to code** - Always use Secrets Manager
2. **Use least privilege** - Grant minimal IAM permissions
3. **Enable encryption** - All secrets encrypted with KMS
4. **Monitor access** - Use CloudTrail to audit secret access
5. **Rotate regularly** - Follow rotation schedule
6. **Test rotation** - Verify rotation works in staging before production

## References

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [CDK Secrets Construct](packages/auth-kit-aws/cdk/lib/constructs/secrets.ts)

