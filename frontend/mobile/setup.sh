#!/bin/bash

###############################################################################
# ParknQuik Mobile - Quick Setup Script
#
# This script helps new developers get started quickly by automating
# the initial setup process.
#
# Usage:
#   ./setup.sh
#
# What it does:
#   1. Checks prerequisites (Node.js, npm)
#   2. Installs dependencies
#   3. Creates .env.local from template
#   4. Prompts for API keys (optional)
#   5. Validates configuration
#   6. Provides next steps
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_banner() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         ParknQuik Mobile - Quick Setup Script            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get local IP address
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "192.168.1.100"
    else
        # Linux
        hostname -I | awk '{print $1}' 2>/dev/null || echo "192.168.1.100"
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local has_errors=0

    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version)
        print_success "Node.js installed ($node_version)"
    else
        print_error "Node.js not found"
        echo "   Install from: https://nodejs.org/"
        has_errors=1
    fi

    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_success "npm installed ($npm_version)"
    else
        print_error "npm not found"
        has_errors=1
    fi

    # Check git
    if command_exists git; then
        print_success "git installed"
    else
        print_warning "git not found (optional but recommended)"
    fi

    if [ $has_errors -eq 1 ]; then
        print_error "Please install missing prerequisites and run this script again"
        exit 1
    fi

    print_success "All prerequisites met!"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"

    if [ -f "package-lock.json" ]; then
        print_info "Installing exact versions from package-lock.json..."
        npm ci
    else
        print_info "Installing dependencies..."
        npm install
    fi

    print_success "Dependencies installed successfully"
}

# Create environment file
create_env_file() {
    print_header "Setting Up Environment Variables"

    if [ -f ".env.local" ]; then
        print_warning ".env.local already exists"
        read -p "Do you want to overwrite it? (y/N): " overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env.local"
            return
        fi
    fi

    if [ ! -f ".env.example" ]; then
        print_error ".env.example not found!"
        exit 1
    fi

    print_info "Creating .env.local from template..."
    cp .env.example .env.local
    print_success ".env.local created"

    # Ask if user wants to configure now
    echo ""
    read -p "Do you want to configure environment variables now? (y/N): " configure_now

    if [[ "$configure_now" =~ ^[Yy]$ ]]; then
        configure_env_interactive
    else
        print_info "You can configure .env.local later by editing it manually"
        print_info "See GOOGLE_MAPS_SETUP.md for detailed instructions"
    fi
}

# Interactive environment configuration
configure_env_interactive() {
    print_header "Configuring Environment Variables"

    # Get local IP
    local_ip=$(get_local_ip)
    echo ""
    print_info "Detected local IP: $local_ip"
    read -p "Press Enter to use this IP, or type a different one: " custom_ip
    if [ -n "$custom_ip" ]; then
        local_ip="$custom_ip"
    fi

    # Construct API URL
    api_url="http://${local_ip}:3001/api/v1"

    # Get API keys
    echo ""
    print_info "Google Maps API Keys"
    echo "   If you don't have keys yet, press Enter to skip"
    echo "   See GOOGLE_MAPS_SETUP.md for how to create keys"
    echo ""

    read -p "iOS API Key (or press Enter to skip): " ios_key
    read -p "Android API Key (or press Enter to skip): " android_key

    # Update .env.local
    print_info "Updating .env.local..."

    # Use different sed syntax for macOS vs Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$api_url|" .env.local
        if [ -n "$ios_key" ]; then
            sed -i '' "s|GOOGLE_MAPS_API_KEY_IOS=.*|GOOGLE_MAPS_API_KEY_IOS=$ios_key|" .env.local
        fi
        if [ -n "$android_key" ]; then
            sed -i '' "s|GOOGLE_MAPS_API_KEY_ANDROID=.*|GOOGLE_MAPS_API_KEY_ANDROID=$android_key|" .env.local
        fi
    else
        # Linux
        sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$api_url|" .env.local
        if [ -n "$ios_key" ]; then
            sed -i "s|GOOGLE_MAPS_API_KEY_IOS=.*|GOOGLE_MAPS_API_KEY_IOS=$ios_key|" .env.local
        fi
        if [ -n "$android_key" ]; then
            sed -i "s|GOOGLE_MAPS_API_KEY_ANDROID=.*|GOOGLE_MAPS_API_KEY_ANDROID=$android_key|" .env.local
        fi
    fi

    print_success "Environment configured!"

    if [ -z "$ios_key" ] || [ -z "$android_key" ]; then
        echo ""
        print_warning "API keys not set. Maps won't work until you add them."
        print_info "Edit .env.local to add your Google Maps API keys"
        print_info "See GOOGLE_MAPS_SETUP.md for instructions"
    fi
}

# Validate setup
validate_setup() {
    print_header "Validating Setup"

    if [ -f "scripts/check-env.js" ]; then
        print_info "Running environment validation..."
        echo ""
        npm run env:check || true
    else
        print_warning "Validation script not found, skipping validation"
    fi
}

# Print next steps
print_next_steps() {
    print_header "Setup Complete! 🎉"

    echo "Next steps:"
    echo ""
    echo "1. ${GREEN}Start the backend${NC} (in a separate terminal):"
    echo "   ${CYAN}cd ../../backend${NC}"
    echo "   ${CYAN}npm install${NC}"
    echo "   ${CYAN}npm run dev${NC}"
    echo ""
    echo "2. ${GREEN}Start the mobile app${NC}:"
    echo "   ${CYAN}npm start${NC}"
    echo ""
    echo "3. ${GREEN}Choose a platform${NC}:"
    echo "   Press ${CYAN}i${NC} for iOS Simulator"
    echo "   Press ${CYAN}a${NC} for Android Emulator"
    echo "   Or scan the QR code with Expo Go app"
    echo ""

    if [ ! -s ".env.local" ] || grep -q "YOUR_.*_API_KEY_HERE" .env.local 2>/dev/null; then
        echo "${YELLOW}⚠  Important:${NC} Add your Google Maps API keys to ${CYAN}.env.local${NC}"
        echo "   See ${CYAN}GOOGLE_MAPS_SETUP.md${NC} for detailed instructions"
        echo ""
    fi

    echo "${GREEN}📚 Documentation:${NC}"
    echo "   • ${CYAN}QUICK_START.md${NC} - Quick onboarding guide"
    echo "   • ${CYAN}GOOGLE_MAPS_SETUP.md${NC} - API key setup instructions"
    echo "   • ${CYAN}ENV_SETUP_README.md${NC} - Environment configuration reference"
    echo ""

    echo "${GREEN}🔧 Useful commands:${NC}"
    echo "   ${CYAN}npm run env:check${NC}       - Validate environment"
    echo "   ${CYAN}npm start${NC}               - Start development server"
    echo "   ${CYAN}npm run ios${NC}             - Run on iOS"
    echo "   ${CYAN}npm run android${NC}         - Run on Android"
    echo ""

    echo "${GREEN}Need help?${NC}"
    echo "   • Check documentation in the mobile folder"
    echo "   • Ask in ${CYAN}#mobile-dev${NC} Slack channel"
    echo ""
}

# Main execution
main() {
    print_banner

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "This script must be run from the frontend/mobile directory"
        exit 1
    fi

    # Run setup steps
    check_prerequisites
    install_dependencies
    create_env_file
    validate_setup
    print_next_steps

    print_success "Setup complete! Happy coding! 🚀"
    echo ""
}

# Run main function
main "$@"
