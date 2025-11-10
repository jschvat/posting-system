#!/bin/bash

# Test runner script for posting system
# This script sets up the environment and runs tests for the backend

set -e  # Exit on any error

echo "🧪 Starting Posting System Tests"
echo "================================"

# Set PostgreSQL environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=posting_system
export DB_USER=dev_user
export DB_PASSWORD=dev_password

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Error: This script must be run from the posting-system root directory"
    echo "   Expected directory structure:"
    echo "   posting-system/"
    echo "   ├── backend/"
    echo "   └── frontend/"
    exit 1
fi

# Change to backend directory
cd backend

echo "📍 Current directory: $(pwd)"
echo "🔧 Environment variables set:"
echo "   DB_HOST=$DB_HOST"
echo "   DB_PORT=$DB_PORT"
echo "   DB_NAME=$DB_NAME"
echo "   DB_USER=$DB_USER"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Parse command line arguments
ARGS=""
if [ $# -gt 0 ]; then
    # If arguments provided, pass them to npm test
    ARGS="-- $@"
    echo "🎯 Running tests with arguments: $@"
else
    echo "🧪 Running all tests..."
fi

echo ""
echo "Starting tests..."
echo "=================="

# Run the tests
npm test $ARGS

echo ""
echo "✅ Tests completed!"