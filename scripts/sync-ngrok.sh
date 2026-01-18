#!/bin/bash

# Sync ngrok URL to Vercel
# This script automatically detects your ngrok tunnel and updates Vercel environment variables

echo "🔄 Syncing ngrok URL to Vercel..."

# Wait a moment for ngrok to be fully ready
sleep 2

# Check if ngrok is running
if ! curl -s http://127.0.0.1:4040/api/tunnels &> /dev/null; then
  echo "❌ ngrok is not running on port 4040"
  echo "💡 Start ngrok with: ngrok http 11434"
  exit 1
fi

# Check if dev server is running
if ! curl -s http://localhost:1998/api/ollama/ngrok/sync &> /dev/null; then
  echo "❌ Dev server is not running on port 1998"
  echo "💡 Start dev server with: npm run dev"
  exit 1
fi

# Call the sync endpoint
response=$(curl -s -X POST http://localhost:1998/api/ollama/ngrok/sync \
  -H "Content-Type: application/json" \
  -d '{"targets": ["production", "preview"]}')

# Check if sync was successful
if echo "$response" | grep -q '"ok":true'; then
  ngrok_url=$(echo "$response" | grep -o '"publicUrl":"[^"]*"' | cut -d'"' -f4)
  deployment_url=$(echo "$response" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)

  echo "✅ Successfully synced ngrok to Vercel!"
  echo "🌐 Ngrok URL: $ngrok_url"
  echo "🚀 New deployment: $deployment_url"
  echo ""
  echo "Your Ollama models are now accessible on Vercel!"
else
  error=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  echo "❌ Sync failed: $error"
  exit 1
fi
