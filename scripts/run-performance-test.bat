@echo off
REM API Performance Test Runner for Windows
REM This script runs the comprehensive API performance test

echo 🚀 Starting API Performance Test Suite
echo ======================================

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    exit /b 1
)

REM Check if tsx is available
tsx --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ tsx is not installed. Installing tsx...
    npm install -g tsx
)

REM Set default API base URL if not provided
if not defined API_BASE_URL set API_BASE_URL=http://localhost:3000

echo 📡 Testing API at: %API_BASE_URL%
echo.

REM Run the performance test
tsx scripts/api-performance-test.ts

REM Check if the test was successful
if %errorlevel% equ 0 (
    echo.
    echo ✅ Performance test completed successfully!
    echo 📁 Check the 'performance-logs' directory for detailed results
) else (
    echo.
    echo ❌ Performance test failed!
    exit /b 1
)
