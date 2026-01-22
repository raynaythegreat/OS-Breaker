#!/bin/bash
# OS Athena Diagnostics Tool
# Run this to troubleshoot launch issues

APP_NAME="os-athena"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$HOME/.local/share/$APP_NAME/logs"

echo "================================================"
echo "OS Athena Diagnostics"
echo "================================================"
echo ""

# System info
echo "SYSTEM INFORMATION:"
echo "  OS: $(lsb_release -d 2>/dev/null | cut -f2 || uname -s)"
echo "  Kernel: $(uname -r)"
echo "  Architecture: $(uname -m)"
echo ""

# Node environment
echo "NODE ENVIRONMENT:"
if command -v node &> /dev/null; then
    echo "  ✓ Node.js: $(node --version)"
else
    echo "  ✗ Node.js: NOT FOUND"
fi

if command -v npm &> /dev/null; then
    echo "  ✓ npm: $(npm --version)"
else
    echo "  ✗ npm: NOT FOUND"
fi

if command -v electron &> /dev/null; then
    echo "  ✓ Electron: $(electron --version 2>/dev/null || echo 'installed locally')"
else
    echo "  ℹ Electron: Not in PATH (using local version)"
fi
echo ""

# App directory
echo "APP DIRECTORY:"
echo "  Location: $APP_DIR"
echo "  Exists: $([ -d "$APP_DIR" ] && echo "✓ Yes" || echo "✗ No")"

if [ -d "$APP_DIR" ]; then
    echo "  package.json: $([ -f "$APP_DIR/package.json" ] && echo "✓ Yes" || echo "✗ No")"
    echo "  node_modules: $([ -d "$APP_DIR/node_modules" ] && echo "✓ Yes" || echo "✗ No")"
    echo "  electron/main.js: $([ -f "$APP_DIR/electron/main.js" ] && echo "✓ Yes" || echo "✗ No")"
    echo "  .next/standalone: $([ -d "$APP_DIR/.next/standalone" ] && echo "✓ Yes (production)" || echo "✗ No (needs build)")"
fi
echo ""

# Desktop integration
echo "DESKTOP INTEGRATION:"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_NAME.desktop"
BIN_FILE="$HOME/.local/bin/$APP_NAME"
LAUNCHER_FILE="$APP_DIR/electron/launcher.sh"

echo "  Desktop entry: $([ -f "$DESKTOP_FILE" ] && echo "✓ $DESKTOP_FILE" || echo "✗ Not found")"
echo "  Binary wrapper: $([ -f "$BIN_FILE" ] && echo "✓ $BIN_FILE" || echo "✗ Not found")"
echo "  Launcher script: $([ -f "$LAUNCHER_FILE" ] && echo "✓ $LAUNCHER_FILE" || echo "✗ Not found")"
echo ""

# Logs
echo "RECENT LOGS:"
if [ -d "$LOG_DIR" ]; then
    LATEST_LOG=$(ls -t "$LOG_DIR"/launcher-*.log 2>/dev/null | head -n 1)
    if [ -n "$LATEST_LOG" ]; then
        echo "  Latest: $LATEST_LOG"
        echo "  Last 10 lines:"
        tail -n 10 "$LATEST_LOG" | sed 's/^/    /'
    else
        echo "  No logs found"
    fi
else
    echo "  Log directory not found: $LOG_DIR"
fi
echo ""

# Running processes
echo "RUNNING PROCESSES:"
if pgrep -f "electron.*os-athena" > /dev/null; then
    echo "  ✓ OS Athena is running"
    pgrep -af "electron.*os-athena" | sed 's/^/    /'
else
    echo "  ✗ OS Athena is not running"
fi
echo ""

# Recommendations
echo "================================================"
echo "RECOMMENDATIONS:"
echo "================================================"

if ! command -v node &> /dev/null; then
    echo "  • Install Node.js: sudo apt install nodejs npm"
fi

if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "  • Install dependencies: cd $APP_DIR && npm install"
fi

if [ ! -d "$APP_DIR/.next/standalone" ]; then
    echo "  • Build the app: cd $APP_DIR && npm run build"
fi

if [ ! -f "$DESKTOP_FILE" ]; then
    echo "  • Install desktop entry: cd $APP_DIR && ./electron/install-desktop-entry.sh"
fi

echo ""
echo "To reinstall desktop integration:"
echo "  cd $APP_DIR && ./electron/install-desktop-entry.sh"
echo ""
echo "To view live logs:"
echo "  tail -f $LOG_DIR/launcher-*.log"
echo ""
