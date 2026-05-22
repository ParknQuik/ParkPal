#!/bin/bash

# ==============================================================================
# ParkPal - GCP Secret Manager Setup Script
# ==============================================================================
# This script creates all required secrets in Google Cloud Secret Manager
# for production deployment.
#
# Prerequisites:
# 1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
# 2. Authenticate: gcloud auth login
# 3. Set project: gcloud config set project YOUR_PROJECT_ID
# 4. Enable Secret Manager API: gcloud services enable secretmanager.googleapis.com
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Configuration
# ==============================================================================

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         ParkPal - GCP Secret Manager Setup                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# Check Prerequisites
# ==============================================================================

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI not found${NC}"
    echo "  Please install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo -e "${GREEN}✓ gcloud CLI installed${NC}"

# Get current project
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗ No GCP project configured${NC}"
    echo "  Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi
echo -e "${GREEN}✓ Using GCP project: $PROJECT_ID${NC}"

# Check if Secret Manager API is enabled
if ! gcloud services list --enabled --filter="name:secretmanager.googleapis.com" --format="value(name)" | grep -q "secretmanager"; then
    echo -e "${YELLOW}  Enabling Secret Manager API...${NC}"
    gcloud services enable secretmanager.googleapis.com
    echo -e "${GREEN}✓ Secret Manager API enabled${NC}"
else
    echo -e "${GREEN}✓ Secret Manager API already enabled${NC}"
fi

echo ""

# ==============================================================================
# Helper Functions
# ==============================================================================

create_secret() {
    local secret_name=$1
    local description=$2
    local prompt_message=$3
    local default_value=$4
    local is_sensitive=${5:-true}

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Setting up: ${secret_name}${NC}"
    echo -e "Description: $description"
    echo ""

    # Check if secret already exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${YELLOW}Secret '${secret_name}' already exists.${NC}"
        read -p "Do you want to add a new version? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Skipping ${secret_name}${NC}"
            echo ""
            return
        fi
    else
        # Create the secret
        echo "Creating secret..."
        gcloud secrets create "$secret_name" \
            --replication-policy="automatic" \
            --project="$PROJECT_ID" \
            --labels="app=parkpal,managed-by=setup-script"
        echo -e "${GREEN}✓ Secret created${NC}"
    fi

    # Get secret value from user
    echo ""
    echo "$prompt_message"
    if [ -n "$default_value" ]; then
        echo -e "${YELLOW}Default: $default_value${NC}"
    fi
    echo ""

    if [ "$is_sensitive" = true ]; then
        read -sp "Enter value (hidden): " secret_value
        echo ""
    else
        read -p "Enter value: " secret_value
    fi

    # Use default if empty
    if [ -z "$secret_value" ] && [ -n "$default_value" ]; then
        secret_value="$default_value"
        echo -e "${YELLOW}Using default value${NC}"
    fi

    if [ -z "$secret_value" ]; then
        echo -e "${RED}✗ No value provided, skipping${NC}"
        echo ""
        return
    fi

    # Add secret version
    echo "$secret_value" | gcloud secrets versions add "$secret_name" \
        --data-file=- \
        --project="$PROJECT_ID"

    echo -e "${GREEN}✓ Secret value added${NC}"
    echo ""
}

generate_random_secret() {
    local length=${1:-64}
    openssl rand -hex $length
}

# ==============================================================================
# Create Secrets
# ==============================================================================

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Creating Secrets                              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "This script will guide you through creating all required secrets."
echo "Press Ctrl+C at any time to cancel."
echo ""
read -p "Press Enter to continue..."
echo ""

# ==============================================================================
# 1. JWT Secret
# ==============================================================================

JWT_GENERATED=$(generate_random_secret 64)
create_secret "jwt-secret" \
    "Secret key for JWT token signing (must be 128+ characters)" \
    "IMPORTANT: Use a cryptographically secure random string.
A random value has been generated for you." \
    "$JWT_GENERATED" \
    true

# ==============================================================================
# 2. QR Secret
# ==============================================================================

QR_GENERATED=$(generate_random_secret 32)
create_secret "qr-secret" \
    "Secret for QR code generation and validation (32+ characters)" \
    "A random value has been generated for you." \
    "$QR_GENERATED" \
    true

# ==============================================================================
# 3. Database URL
# ==============================================================================

create_secret "database-url" \
    "PostgreSQL database connection string" \
    "Format: postgresql://user:password@host:port/database?sslmode=require
Example: postgresql://parkpal:password@10.1.2.3:5432/parkpal?sslmode=require" \
    "" \
    true

# ==============================================================================
# 4. Redis URL
# ==============================================================================

create_secret "redis-url" \
    "Redis connection string (optional but recommended)" \
    "Format: redis://host:port
Example: redis://10.1.2.4:6379" \
    "redis://localhost:6379" \
    false

# ==============================================================================
# 5. PayMongo Secret Key
# ==============================================================================

create_secret "paymongo-secret-key" \
    "PayMongo secret API key (starts with sk_live_ for production)" \
    "Get from: https://dashboard.paymongo.com/developers/api-keys
Use LIVE key for production (sk_live_...)
Use TEST key for staging (sk_test_...)" \
    "" \
    true

# ==============================================================================
# 6. PayMongo Public Key
# ==============================================================================

create_secret "paymongo-public-key" \
    "PayMongo public API key (starts with pk_live_ for production)" \
    "Get from: https://dashboard.paymongo.com/developers/api-keys" \
    "" \
    false

# ==============================================================================
# 7. PayMongo Webhook Secret
# ==============================================================================

create_secret "paymongo-webhook-secret" \
    "PayMongo webhook signature secret (starts with whsec_)" \
    "Get from: https://dashboard.paymongo.com/developers/webhooks
Create webhook pointing to: https://your-domain.com/api/v1/payments/webhook" \
    "" \
    true

# ==============================================================================
# 8. Google Maps API Key
# ==============================================================================

create_secret "google-maps-api-key" \
    "Google Maps API key for location services" \
    "Get from: https://console.cloud.google.com/apis/credentials
Enable: Maps SDK for Android, Maps SDK for iOS, Places API" \
    "" \
    true

# ==============================================================================
# 9. Weather API Key (Optional)
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Optional: Weather API Key${NC}"
echo ""
read -p "Do you want to configure OpenWeatherMap API? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    create_secret "weather-api-key" \
        "OpenWeatherMap API key (optional)" \
        "Get from: https://openweathermap.org/api" \
        "" \
        true
else
    echo -e "${BLUE}Skipping weather-api-key${NC}"
    echo ""
fi

# ==============================================================================
# Grant Access to Service Account
# ==============================================================================

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Service Account Configuration                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "Do you want to grant access to a service account? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -p "Enter service account email (e.g., parkpal-backend@project.iam.gserviceaccount.com): " SA_EMAIL

    if [ -n "$SA_EMAIL" ]; then
        echo ""
        echo "Granting Secret Manager Secret Accessor role to $SA_EMAIL..."

        # Grant access to all secrets
        for secret in jwt-secret qr-secret database-url redis-url paymongo-secret-key paymongo-public-key paymongo-webhook-secret google-maps-api-key weather-api-key; do
            if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
                gcloud secrets add-iam-policy-binding "$secret" \
                    --member="serviceAccount:$SA_EMAIL" \
                    --role="roles/secretmanager.secretAccessor" \
                    --project="$PROJECT_ID" &>/dev/null && \
                    echo -e "${GREEN}✓ Granted access to $secret${NC}" || \
                    echo -e "${YELLOW}⚠ Could not grant access to $secret (may not exist)${NC}"
            fi
        done

        echo ""
        echo -e "${GREEN}✓ Service account configured${NC}"
    fi
fi

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        Setup Complete!                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Secrets have been created in GCP Secret Manager${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Update your production .env file:"
echo "   USE_SECRET_MANAGER=true"
echo "   GCP_PROJECT_ID=$PROJECT_ID"
echo "   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json"
echo ""
echo "2. Deploy your application to Cloud Run / GKE / Compute Engine"
echo ""
echo "3. Verify secrets are accessible:"
echo "   gcloud secrets versions access latest --secret=jwt-secret"
echo ""
echo -e "${YELLOW}Security Reminder:${NC}"
echo "- Never commit service account keys to git"
echo "- Rotate secrets regularly (every 90 days recommended)"
echo "- Use different secrets for staging and production"
echo ""
echo -e "${GREEN}Setup script completed successfully!${NC}"
echo ""
