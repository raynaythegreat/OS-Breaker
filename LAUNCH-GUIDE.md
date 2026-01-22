# OS Athena Launch Guide

## ✅ Installation Complete!

Your OS Athena app is now properly configured to launch from your application menu.

## 🚀 How to Launch

### Method 1: Application Menu (Recommended)
1. Open your application launcher
2. Search for "OS Athena"
3. Click to launch

### Method 2: Terminal Command
```bash
os-athena
```

### Method 3: Direct Launcher
```bash
cd ~/OS-Athena
./electron/launcher.sh
```

## 📋 What Was Fixed

### Issues Resolved:
- ✅ Fixed localhost port configuration (now uses fixed port 3456)
- ✅ Created smart launcher with production/development mode detection
- ✅ Added comprehensive error logging
- ✅ Added pre-flight dependency checks
- ✅ Fixed desktop entry to use correct executable
- ✅ Removed npm spawning dependency
- ✅ Added user-friendly error dialogs

### New Features:
- ✅ Automatic log rotation (keeps last 10 logs)
- ✅ Diagnostic tool for troubleshooting
- ✅ Standalone build support (faster startup)
- ✅ Smart mode detection (dev vs production)
- ✅ Comprehensive startup logging

## 🔧 Troubleshooting

### If the app doesn't launch:

1. **Run diagnostics:**
   ```bash
   cd ~/OS-Athena
   ./electron/diagnostics.sh
   ```

2. **Check logs:**
   ```bash
   tail -f ~/.local/share/os-athena/logs/launcher-*.log
   ```

3. **View all logs:**
   ```bash
   ls -lah ~/.local/share/os-athena/logs/
   ```

4. **Reinstall desktop integration:**
   ```bash
   cd ~/OS-Athena
   ./electron/install-desktop-entry.sh
   ```

### Common Issues:

**"Node.js not found"**
```bash
sudo apt install nodejs npm
```

**"Build not found"**
```bash
cd ~/OS-Athena
npm run build
```

**"App doesn't appear in menu"**
```bash
update-desktop-database ~/.local/share/applications
# Then log out and back in
```

## 📁 File Locations

- **App Directory:** `~/OS-Athena`
- **Desktop Entry:** `~/.local/share/applications/os-athena.desktop`
- **Binary Wrapper:** `~/.local/bin/os-athena`
- **Logs:** `~/.local/share/os-athena/logs/`
- **User Data:** `~/.config/os-athena`

## 🛠️ Maintenance

### View Running Processes:
```bash
pgrep -af electron | grep athena
```

### Stop the App:
```bash
pkill -f "node_modules/electron/dist/electron"
```

### Rebuild the App:
```bash
cd ~/OS-Athena
npm run build
```

### Update Desktop Integration:
```bash
cd ~/OS-Athena
./electron/install-desktop-entry.sh
```

## 📊 Logs Explained

### Launcher Logs:
- Location: `~/.local/share/os-athena/logs/launcher-*.log`
- Purpose: Tracks launcher startup, pre-flight checks, and launch process
- Retention: Last 10 logs kept automatically

### What the Launcher Does:
1. Checks Node.js and npm are installed
2. Verifies node_modules exists
3. Detects production vs development mode
4. Starts Next.js server
5. Waits for server to be ready
6. Launches Electron window

## 🎨 UI Updates

The app now features a modern flat design:
- Bold, vibrant gold accent color (#FFC107)
- Flat shadows for depth without blur
- Prominent borders (2-3px) for definition
- Bold typography throughout
- Consistent gold accents on all interactive elements

## 📝 Version

- **Current Version:** 1.2.0
- **Platform:** Linux (Debian/Ubuntu/Crostini)
- **Architecture:** Standalone Electron + Next.js

## 🆘 Getting Help

If you continue to have issues:

1. Run the diagnostic tool and share the output
2. Check the latest log file
3. Verify Node.js version: `node --version` (should be v18+)
4. Verify npm version: `npm --version`

## ✨ Next Steps

Your app is ready to use! Launch it from your application menu and enjoy OS Athena with its new flat, bold design.

For updates and improvements, check the repository at:
https://github.com/raynaythegreat/AI-Gatekeep
