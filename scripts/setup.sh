#!/bin/bash

# Snack Track App - Development Setup Script
# This script sets up the development environment for new contributors

set -e

echo "🚀 Setting up Snack Track App development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker from https://docker.com/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
    
    # Check Expo CLI
    if ! command -v expo &> /dev/null; then
        print_warning "Expo CLI is not installed. Installing globally..."
        npm install -g @expo/cli
    fi
    
    
    print_success "All requirements satisfied!"
}


# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Clean install to avoid conflicts
    if [ -d "node_modules" ]; then
        print_status "Cleaning existing node_modules..."
        rm -rf node_modules package-lock.json
    fi
    
    # Install with legacy peer deps to handle React version conflicts
    npm install --legacy-peer-deps
    print_success "Dependencies installed!"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
        else
            # Create a basic .env file if .env.example doesn't exist
            cat > .env << EOF
# API Configuration
API_BASE_URL=http://localhost:3000

# App Configuration
APP_NAME=Snack Track
APP_VERSION=1.0.0

# Development
NODE_ENV=development
DEBUG=true
EOF
            print_success "Created basic .env file"
        fi
    else
        print_warning ".env file already exists, skipping..."
    fi
}

# Start development database
start_database() {
    print_status "Starting development database..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Start database
    docker-compose -f docker-compose.dev.yml up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Test database connection
    if docker exec snacktrack-postgres-dev pg_isready -U snacktrack -d snacktrack > /dev/null 2>&1; then
        print_success "Database is ready!"
    else
        print_error "Database failed to start properly"
        exit 1
    fi
}

# Stop any existing Expo processes
stop_expo_processes() {
    print_status "Stopping any existing Expo processes..."
    
    # Kill existing Expo and Metro processes
    pkill -f 'expo start' 2>/dev/null || true
    pkill -f 'metro' 2>/dev/null || true
    
    # Wait a moment for processes to fully stop
    sleep 2
    
    print_success "Expo processes stopped!"
}

# Verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Stop any existing processes first
    stop_expo_processes
    
    # Check if app can start
    print_status "Testing Expo setup..."
    if expo doctor > /dev/null 2>&1; then
        print_success "Expo setup is valid!"
    else
        print_warning "Expo setup has some issues, but continuing..."
    fi
}

# Main setup function
main() {
    echo "🥡 Welcome to Snack Track App Development Setup!"
    echo ""
    
    check_requirements
    install_dependencies
    setup_environment
    start_database
    verify_setup
    
    echo ""
    print_success "🎉 Development environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. For real data: cd ~/Projects/snack-track && docker-compose up -d"
    echo "2. Start the development server: npx expo start"
    echo "3. Install Expo Go on your phone and scan the QR code"
    echo "4. Check the README.md for detailed instructions"
    echo ""
    echo "Database is running on:"
    echo "- PostgreSQL: localhost:5432"
    echo "- Redis: localhost:6379"
    echo ""
    echo "Note: Without the Snack Track API, the app will use mock data for development."
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"
