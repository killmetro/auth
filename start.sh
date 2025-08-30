#!/bin/bash

echo "🚀 Starting Unity Auth Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before starting the server."
    echo "🔑 Don't forget to change the JWT_SECRET!"
    exit 1
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if ! nc -z localhost 27017 2>/dev/null; then
    echo "❌ MongoDB is not running on localhost:27017"
    echo "💡 Please start MongoDB first:"
    echo "   - Local: mongod"
    echo "   - Or update MONGODB_URI in .env for cloud MongoDB"
    exit 1
fi

echo "✅ MongoDB is running"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🌟 Starting server in development mode..."
npm run dev
