#!/bin/bash

# ParkPal Web Frontend Startup Script

echo "🚀 Starting ParkPal Web Frontend..."
echo ""

# Navigate to web directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the development server
echo "✅ Starting web server on http://localhost:5174"
echo ""
npm run dev
