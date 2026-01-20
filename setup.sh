#!/bin/bash

# AI-Gatekeep Setup Script for Linux/macOS

echo "=========================================="
echo "   AI-Gatekeep Terminal Setup (Linux/Mac)"
echo "=========================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js (v18 or higher recommended) from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully."
else
    echo "Error: Failed to install dependencies."
    exit 1
fi

# Build option
echo ""
read -p "Do you want to build the project for production? (y/n) " build_choice
if [[ "$build_choice" =~ ^[Yy]$ ]]; then
    echo "Building project..."
    npm run build
fi

echo ""
echo "Setup complete!"
echo "To start the development server, run: npm run dev"
echo "To start the production server (if built), run: npm start"
echo ""
