#!/bin/bash

# WhatsApp Agent Deployment Script

echo "Starting WhatsApp Agent deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ before continuing."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ $NODE_MAJOR_VERSION -lt 18 ]; then
    echo "Node.js version 18+ is required. Current version: $NODE_VERSION"
    exit 1
fi

# Check if the .env file exists
if [ ! -f .env ]; then
    echo ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo ".env file created. Please edit it with your actual configuration values."
        exit 1
    else
        echo ".env.example file not found. Please create a .env file with required environment variables."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build TypeScript files
echo "Building TypeScript files..."
npm run build

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo "Created logs directory"
fi

# Create sessions directory if it doesn't exist
if [ ! -d "sessions" ]; then
    mkdir -p sessions
    echo "Created sessions directory"
fi

# Start in background or foreground based on argument
if [ "$1" == "background" ]; then
    echo "Starting WhatsApp Agent in background mode..."
    nohup npm start > logs/wa-agent.log 2>&1 &
    echo $! > wa-agent.pid
    echo "WhatsApp Agent started with PID $(cat wa-agent.pid)"
    echo "Check logs/wa-agent.log for output"
else
    echo "Starting WhatsApp Agent in foreground mode..."
    npm start
fi 