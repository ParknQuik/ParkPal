#!/bin/bash

# ParkPal Backend Run Script (SQLite)

echo "🚀 Starting ParkPal Backend with SQLite..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if database exists
if [ ! -f "dev.db" ]; then
    echo "🗄️  Creating SQLite database..."
    npx prisma migrate dev --name init
    echo ""
else
    echo "✅ Database already exists"
    echo ""
fi

# Generate Prisma client
echo "🔧 Generating Prisma Client..."
npx prisma generate
echo ""

# Start the server
echo "✅ Starting backend server on http://localhost:3001"
echo "📊 Using SQLite database at ./dev.db"
echo ""
npm start
