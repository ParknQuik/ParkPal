#!/bin/bash

# ParkPal Mobile App Startup Script

echo "🚀 Starting ParkPal Mobile App..."
echo ""

# Navigate to mobile directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
    echo ""
fi

# Increase file limit
ulimit -n 65536
echo "✅ File limit increased to 65536"
echo ""

# Start Expo
echo "📱 Starting Expo Dev Server..."
echo "🌐 Connect via: exp://192.168.100.222:8081"
echo ""
npx expo start --clear
