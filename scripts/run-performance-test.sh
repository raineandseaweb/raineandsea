#!/bin/bash

# API Performance Test Runner
# This script runs the comprehensive API performance test

echo "🚀 Starting API Performance Test Suite"
echo "======================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "❌ tsx is not installed. Installing tsx..."
    npm install -g tsx
fi

# Set default API base URL if not provided
export API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}

echo "📡 Testing API at: $API_BASE_URL"
echo ""

# Run the performance test
tsx scripts/api-performance-test.ts

# Check if the test was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Performance test completed successfully!"
    echo "📁 Check the 'performance-logs' directory for detailed results"
else
    echo ""
    echo "❌ Performance test failed!"
    exit 1
fi
