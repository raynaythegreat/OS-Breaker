#!/bin/bash
# OS Athena Launcher Script
# Handles both development and production modes with comprehensive logging

set -e

# Configuration
APP_NAME="os-athena"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$HOME/.local/share/$APP_NAME/logs"
LOG_FILE="$LOG_DIR/launcher-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "================================================"
log "OS Athena Launcher Starting"
log "================================================"
log "App directory: $APP_DIR"
log "Node version: $(node --version 2>&1 || echo 'Node not found')"
log "NPM version: $(npm --version 2>&1 || echo 'NPM not found')"

# Pre-flight checks
check_dependencies() {
    log "Running pre-flight checks..."

    if ! command -v node &> /dev/null; then
        log "ERROR: Node.js is not installed"
        zenity --error --text="Node.js is required but not installed.\n\nPlease install Node.js:\nsudo apt install nodejs npm" --title="OS Athena Error" 2>/dev/null || true
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log "ERROR: npm is not installed"
        zenity --error --text="npm is required but not installed.\n\nPlease install npm:\nsudo apt install npm" --title="OS Athena Error" 2>/dev/null || true
        exit 1
    fi

    if [ ! -d "$APP_DIR/node_modules" ]; then
        log "ERROR: node_modules not found. Running npm install..."
        cd "$APP_DIR"
        npm install >> "$LOG_FILE" 2>&1 || {
            log "ERROR: npm install failed"
            zenity --error --text="Failed to install dependencies.\n\nCheck log: $LOG_FILE" --title="OS Athena Error" 2>/dev/null || true
            exit 1
        }
    fi

    log "Pre-flight checks passed"
}

# Detect mode (production or development)
detect_mode() {
    if [ -f "$APP_DIR/.next/standalone/server.js" ]; then
        log "Mode: PRODUCTION (standalone build found)"
        return 0  # production
    elif [ -f "$APP_DIR/package.json" ]; then
        log "Mode: DEVELOPMENT (using npm run electron)"
        return 1  # development
    else
        log "ERROR: Cannot determine app mode"
        zenity --error --text="OS Athena installation is corrupted.\n\nPlease reinstall the application." --title="OS Athena Error" 2>/dev/null || true
        exit 1
    fi
}

# Launch in production mode
launch_production() {
    log "Launching in production mode..."
    cd "$APP_DIR"
    NODE_ENV=production npx electron . >> "$LOG_FILE" 2>&1 &
    ELECTRON_PID=$!
    log "Electron started with PID: $ELECTRON_PID"
}

# Launch in development mode
launch_development() {
    log "Launching in development mode..."
    cd "$APP_DIR"

    # Check if build exists
    if [ ! -d "$APP_DIR/.next" ]; then
        log "No build found. Creating initial build..."
        zenity --info --text="First launch detected.\n\nBuilding OS Athena (this may take a few minutes)..." --title="OS Athena" --timeout=5 2>/dev/null || true
        npm run build >> "$LOG_FILE" 2>&1 || {
            log "ERROR: Build failed"
            zenity --error --text="Build failed.\n\nCheck log: $LOG_FILE" --title="OS Athena Error" 2>/dev/null || true
            exit 1
        }
    fi

    NODE_ENV=development PORT=3456 npx electron . >> "$LOG_FILE" 2>&1 &
    ELECTRON_PID=$!
    log "Electron started with PID: $ELECTRON_PID"
}

# Main execution
main() {
    log "Starting main execution..."

    # Run pre-flight checks
    check_dependencies

    # Detect and launch based on mode
    if detect_mode; then
        # Production mode (return 0)
        launch_production
    else
        # Development mode (return 1)
        launch_development
    fi

    log "Launch completed successfully"
    log "Log file: $LOG_FILE"

    # Clean up old logs (keep last 10)
    ls -t "$LOG_DIR"/launcher-*.log 2>/dev/null | tail -n +11 | xargs -r rm
}

# Error handler
handle_error() {
    log "ERROR: Script failed at line $1"
    zenity --error --text="OS Athena failed to start.\n\nCheck log: $LOG_FILE" --title="OS Athena Error" 2>/dev/null || true
    exit 1
}

trap 'handle_error $LINENO' ERR

# Run main
main
