#!/bin/bash

###############################################################################
# EAS Secrets Setup Script
#
# This script helps you configure environment-specific secrets in EAS
# (Expo Application Services) for building mobile apps.
#
# Usage:
#   ./scripts/setup-eas-secrets.sh [environment]
#
# Environments:
#   - development
#   - staging
#   - production
#   - all (sets up all environments)
#
# Prerequisites:
#   - EAS CLI installed: npm install -g eas-cli
#   - Logged into EAS: eas login
#   - EAS project initialized: eas init
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if EAS CLI is installed
    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI not found"
        echo "Install it with: npm install -g eas-cli"
        exit 1
    fi
    print_success "EAS CLI installed"

    # Check if logged into EAS
    if ! eas whoami &> /dev/null; then
        print_error "Not logged into EAS"
        echo "Login with: eas login"
        exit 1
    fi
    print_success "Logged into EAS as $(eas whoami)"
}

# Setup secrets for a specific environment
setup_environment() {
    local env=$1
    local env_upper=$(echo "$env" | tr '[:lower:]' '[:upper:]')

    print_header "Setting up $env environment"

    # Prompt for API URL
    read -p "Enter API URL for $env: " api_url
    if [ -z "$api_url" ]; then
        print_error "API URL cannot be empty"
        return 1
    fi

    # Prompt for iOS API key
    read -p "Enter Google Maps API Key for iOS ($env): " ios_key
    if [ -z "$ios_key" ]; then
        print_error "iOS API key cannot be empty"
        return 1
    fi

    # Prompt for Android API key
    read -p "Enter Google Maps API Key for Android ($env): " android_key
    if [ -z "$android_key" ]; then
        print_error "Android API key cannot be empty"
        return 1
    fi

    print_info "Creating secrets in EAS..."

    # Create or update secrets
    local suffix=""
    if [ "$env" != "development" ]; then
        suffix="_${env_upper}"
    fi

    # API URL
    eas secret:create --scope project \
        --name "EXPO_PUBLIC_API_URL${suffix}" \
        --value "$api_url" \
        --type string \
        --force || print_warning "Failed to set API URL secret"

    # iOS API Key
    eas secret:create --scope project \
        --name "GOOGLE_MAPS_API_KEY_IOS${suffix}" \
        --value "$ios_key" \
        --type string \
        --force || print_warning "Failed to set iOS API key secret"

    # Android API Key
    eas secret:create --scope project \
        --name "GOOGLE_MAPS_API_KEY_ANDROID${suffix}" \
        --value "$android_key" \
        --type string \
        --force || print_warning "Failed to set Android API key secret"

    print_success "Secrets configured for $env environment"
}

# List all secrets
list_secrets() {
    print_header "Current EAS Secrets"
    eas secret:list
}

# Delete secrets for an environment
delete_environment_secrets() {
    local env=$1
    local env_upper=$(echo "$env" | tr '[:lower:]' '[:upper:]')

    print_header "Deleting secrets for $env environment"

    local suffix=""
    if [ "$env" != "development" ]; then
        suffix="_${env_upper}"
    fi

    read -p "Are you sure you want to delete $env secrets? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return
    fi

    eas secret:delete --name "EXPO_PUBLIC_API_URL${suffix}" || true
    eas secret:delete --name "GOOGLE_MAPS_API_KEY_IOS${suffix}" || true
    eas secret:delete --name "GOOGLE_MAPS_API_KEY_ANDROID${suffix}" || true

    print_success "Deleted secrets for $env environment"
}

# Main menu
show_menu() {
    print_header "EAS Secrets Setup"
    echo "1) Setup Development environment"
    echo "2) Setup Staging environment"
    echo "3) Setup Production environment"
    echo "4) Setup All environments"
    echo "5) List all secrets"
    echo "6) Delete environment secrets"
    echo "7) Exit"
    echo ""
    read -p "Choose an option (1-7): " choice

    case $choice in
        1)
            setup_environment "development"
            show_menu
            ;;
        2)
            setup_environment "staging"
            show_menu
            ;;
        3)
            setup_environment "production"
            show_menu
            ;;
        4)
            setup_environment "development"
            setup_environment "staging"
            setup_environment "production"
            print_success "All environments configured!"
            show_menu
            ;;
        5)
            list_secrets
            show_menu
            ;;
        6)
            echo ""
            echo "Delete secrets for:"
            echo "1) Development"
            echo "2) Staging"
            echo "3) Production"
            read -p "Choose environment (1-3): " env_choice
            case $env_choice in
                1) delete_environment_secrets "development" ;;
                2) delete_environment_secrets "staging" ;;
                3) delete_environment_secrets "production" ;;
                *) print_error "Invalid choice" ;;
            esac
            show_menu
            ;;
        7)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            show_menu
            ;;
    esac
}

# Main execution
main() {
    check_prerequisites

    # If environment is provided as argument, set it up directly
    if [ $# -gt 0 ]; then
        local env=$1
        case $env in
            development|staging|production)
                setup_environment "$env"
                ;;
            all)
                setup_environment "development"
                setup_environment "staging"
                setup_environment "production"
                ;;
            list)
                list_secrets
                ;;
            *)
                print_error "Invalid environment: $env"
                echo "Valid options: development, staging, production, all, list"
                exit 1
                ;;
        esac
    else
        # Interactive mode
        show_menu
    fi
}

# Run main function
main "$@"
