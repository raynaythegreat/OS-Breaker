# Ngrok Automation Scripts

These scripts automatically sync your ngrok tunnel URL to Vercel when it changes.

## 🚀 Quick Start

### One-Time Manual Sync
Sync the current ngrok URL to Vercel once:
```bash
npm run sync-ngrok
```

### Automatic Watcher (Recommended)
Watch for ngrok URL changes and auto-sync to Vercel:
```bash
npm run watch-ngrok
```

This will:
- Check for ngrok URL changes every 30 seconds
- Automatically sync to Vercel when the URL changes
- Trigger a new deployment with the updated URL

## 📋 Prerequisites

Before using these scripts, make sure:
1. ✅ Ollama is running on port 11434
2. ✅ Ngrok is running: `ngrok http 11434`
3. ✅ Dev server is running: `npm run dev`
4. ✅ Vercel token is set in `.env.local`

## 🎯 Usage Scenarios

### Scenario 1: Manual Sync After Restarting Ngrok
```bash
# 1. Restart ngrok
ngrok http 11434

# 2. Start dev server (if not running)
npm run dev

# 3. Sync to Vercel
npm run sync-ngrok
```

### Scenario 2: Automatic Sync (Set It and Forget It)
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start ngrok
ngrok http 11434

# Terminal 3: Start dev server
npm run dev

# Terminal 4: Start ngrok watcher
npm run watch-ngrok
```

Now whenever ngrok restarts or the URL changes, it will automatically sync to Vercel!

## 🔧 How It Works

1. **sync-ngrok.sh**: Bash script that calls the `/api/ollama/ngrok/sync` endpoint
   - Detects current ngrok tunnel URL
   - Updates `OLLAMA_BASE_URL` in Vercel (production + preview)
   - Triggers a new Vercel deployment

2. **watch-ngrok.js**: Node.js daemon that monitors ngrok
   - Polls ngrok API every 30 seconds
   - Detects URL changes
   - Automatically calls sync when URL changes

## 🤖 Advanced: Auto-Start on Login (macOS)

To automatically start the ngrok watcher when you log in:

1. Make sure your dev server starts automatically (or start it manually)
2. Create a launchd service:
```bash
# Create the plist file
cat > ~/Library/LaunchAgents/com.gatekeep.ngrok-watcher.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gatekeep.ngrok-watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/ray/Documents/GateKeep/scripts/watch-ngrok.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/ngrok-watcher.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ngrok-watcher.error.log</string>
</dict>
</plist>
EOF

# Load the service
launchctl load ~/Library/LaunchAgents/com.gatekeep.ngrok-watcher.plist
```

3. To stop/start the service:
```bash
# Stop
launchctl unload ~/Library/LaunchAgents/com.gatekeep.ngrok-watcher.plist

# Start
launchctl load ~/Library/LaunchAgents/com.gatekeep.ngrok-watcher.plist
```

## 📝 Environment Variables

The scripts use these environment variables from `.env.local`:
- `VERCEL_TOKEN`: Required for Vercel API access
- `GITHUB_TOKEN`: Required for repository detection
- `AI_AGENT_WEEB_REPOSITORY`: Optional, defaults to git remote
- `AI_AGENT_WEEB_VERCEL_PROJECT`: Optional, defaults to repo name

## 🐛 Troubleshooting

### "ngrok is not running"
Make sure ngrok is started: `ngrok http 11434`

### "Dev server is not running"
Make sure Next.js dev server is running: `npm run dev` (on port 1998)

### "Failed to sync"
Check that:
- `VERCEL_TOKEN` is set in `.env.local`
- You have write access to the Vercel project
- The git repository is properly configured

### Check logs (for launchd service)
```bash
tail -f /tmp/ngrok-watcher.log
tail -f /tmp/ngrok-watcher.error.log
```

## 🎉 Benefits

- ✅ No more manual Vercel environment variable updates
- ✅ No more manual redeployments after ngrok restarts
- ✅ Works seamlessly in the background
- ✅ Automatic recovery when ngrok restarts
- ✅ Perfect for development and testing
