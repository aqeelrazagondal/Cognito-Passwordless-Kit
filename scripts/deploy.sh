#!/bin/bash
# Deployment script for AuthKit CDK Stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get environment from context or default to dev
ENVIRONMENT=${1:-dev}

echo -e "${GREEN}🚀 Deploying AuthKit Stack (Environment: ${ENVIRONMENT})${NC}\n"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK not found. Please install: npm install -g aws-cdk${NC}"
    exit 1
fi

# Check if environment variables are set (optional for CAPTCHA)
if [ -z "$CAPTCHA_PROVIDER" ] && [ -z "$CAPTCHA_SECRET_KEY" ]; then
    echo -e "${YELLOW}⚠️  CAPTCHA environment variables not set. CAPTCHA verification will be disabled.${NC}"
    echo -e "${YELLOW}   To enable CAPTCHA, set: CAPTCHA_PROVIDER, CAPTCHA_SECRET_KEY, CAPTCHA_SITE_KEY${NC}\n"
fi

# Bootstrap CDK if needed
echo -e "${GREEN}📦 Bootstrapping CDK (if needed)...${NC}"
cdk bootstrap --context environment=${ENVIRONMENT} || true

# Build the project
echo -e "\n${GREEN}🔨 Building project...${NC}"
npm run build

# Synthesize the stack
echo -e "\n${GREEN}📋 Synthesizing CDK stack...${NC}"
cdk synth --context environment=${ENVIRONMENT}

# Deploy the stack
echo -e "\n${GREEN}🚀 Deploying CDK stack...${NC}"
cdk deploy --all --context environment=${ENVIRONMENT} --require-approval never

# Get stack outputs
echo -e "\n${GREEN}📊 Stack Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name "AuthKit-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs' \
    --output table

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Note the SESNotificationTopicArn from the outputs above"
echo -e "2. The SES Configuration Set has been created automatically"
echo -e "3. Verify your SES email/domain identity in the AWS Console"
echo -e "4. When sending emails via SES, include the header:"
echo -e "   X-SES-CONFIGURATION-SET: authkit-${ENVIRONMENT}"

