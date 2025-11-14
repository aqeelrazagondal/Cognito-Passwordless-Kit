#!/bin/bash
# Setup environment variables for AuthKit

set -e

ENV_FILE=".env.local"

echo "🔧 Setting up AuthKit environment variables"
echo ""

# Check if .env.local exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  $ENV_FILE already exists. Backing up to ${ENV_FILE}.backup"
    cp "$ENV_FILE" "${ENV_FILE}.backup"
fi

# CAPTCHA Configuration
echo "📝 CAPTCHA Configuration (optional)"
echo "   Leave blank to disable CAPTCHA verification"
echo ""
read -p "CAPTCHA Provider (hcaptcha/recaptcha): " CAPTCHA_PROVIDER
read -p "CAPTCHA Secret Key: " CAPTCHA_SECRET_KEY
read -p "CAPTCHA Site Key (optional): " CAPTCHA_SITE_KEY

# AWS Configuration
echo ""
echo "📝 AWS Configuration"
read -p "AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "SES Identity (email or domain, e.g., noreply@example.com): " SES_IDENTITY

# Persistence Configuration
echo ""
echo "📝 Persistence Configuration"
read -p "Persistence Backend (memory/dynamodb, default: dynamodb): " PERSISTENCE_BACKEND
PERSISTENCE_BACKEND=${PERSISTENCE_BACKEND:-dynamodb}

# Write to .env.local
cat > "$ENV_FILE" << EOF
# AWS Configuration
AWS_REGION=${AWS_REGION}
SES_IDENTITY=${SES_IDENTITY}

# Persistence
PERSISTENCE_BACKEND=${PERSISTENCE_BACKEND}

# CAPTCHA Configuration (optional)
EOF

if [ ! -z "$CAPTCHA_PROVIDER" ] && [ ! -z "$CAPTCHA_SECRET_KEY" ]; then
    cat >> "$ENV_FILE" << EOF
CAPTCHA_PROVIDER=${CAPTCHA_PROVIDER}
CAPTCHA_SECRET_KEY=${CAPTCHA_SECRET_KEY}
EOF
    if [ ! -z "$CAPTCHA_SITE_KEY" ]; then
        echo "CAPTCHA_SITE_KEY=${CAPTCHA_SITE_KEY}" >> "$ENV_FILE"
    fi
else
    echo "# CAPTCHA_PROVIDER=" >> "$ENV_FILE"
    echo "# CAPTCHA_SECRET_KEY=" >> "$ENV_FILE"
    echo "# CAPTCHA_SITE_KEY=" >> "$ENV_FILE"
fi

echo ""
echo "✅ Environment variables saved to $ENV_FILE"
echo ""
echo "📋 Summary:"
echo "   AWS Region: ${AWS_REGION}"
echo "   SES Identity: ${SES_IDENTITY}"
echo "   Persistence: ${PERSISTENCE_BACKEND}"
if [ ! -z "$CAPTCHA_PROVIDER" ]; then
    echo "   CAPTCHA: ${CAPTCHA_PROVIDER} (enabled)"
else
    echo "   CAPTCHA: disabled"
fi

