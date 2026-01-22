#!/bin/bash
# Refresh App Menu
# Forces the system to recognize OS Athena in the application menu

set -e

APP_NAME="os-athena"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_NAME.desktop"

echo "================================================"
echo "OS Athena - App Menu Refresh Tool"
echo "================================================"
echo ""

# Check if desktop entry exists
if [ ! -f "$DESKTOP_FILE" ]; then
    echo "❌ Desktop entry not found!"
    echo ""
    echo "Please run the installer first:"
    echo "  ./electron/install-desktop-entry.sh"
    exit 1
fi

echo "✓ Desktop entry found: $DESKTOP_FILE"
echo ""

# Update desktop database
echo "Updating desktop database..."
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database ~/.local/share/applications 2>&1
    echo "✓ Desktop database updated"
else
    echo "⚠ update-desktop-database not found (optional)"
fi
echo ""

# Verify the desktop file is valid
echo "Validating desktop entry..."
if command -v desktop-file-validate &> /dev/null; then
    if desktop-file-validate "$DESKTOP_FILE" 2>/dev/null; then
        echo "✓ Desktop entry is valid"
    else
        echo "⚠ Desktop entry has warnings (may still work)"
    fi
else
    echo "⚠ desktop-file-validate not found (optional)"
fi
echo ""

# Check icon
ICON_PATH=$(grep "^Icon=" "$DESKTOP_FILE" | cut -d'=' -f2)
if [ -f "$ICON_PATH" ]; then
    echo "✓ Icon found: $ICON_PATH"
else
    echo "⚠ Icon not found: $ICON_PATH"
fi
echo ""

# Test launch
echo "Testing desktop entry launch..."
if command -v gtk-launch &> /dev/null; then
    echo "Launching OS Athena..."
    gtk-launch os-athena.desktop &
    LAUNCH_PID=$!

    # Wait a moment
    sleep 3

    # Check if it's running
    if pgrep -f "electron.*OS-Athena" > /dev/null 2>&1; then
        echo "✓ OS Athena launched successfully!"
        echo ""
        echo "If you see the app window, the desktop entry works!"
    else
        echo "⚠ Launch may have failed. Check logs:"
        echo "  tail -f ~/.local/share/os-athena/logs/launcher-*.log"
    fi
else
    echo "⚠ gtk-launch not found"
fi
echo ""

echo "================================================"
echo "Next Steps:"
echo "================================================"
echo ""
echo "1. Open your application menu/launcher"
echo "2. Search for 'OS Athena' or 'Athena'"
echo "3. Click to launch"
echo ""
echo "If OS Athena doesn't appear:"
echo "  • Logout and login again"
echo "  • Restart your desktop environment"
echo "  • Check your desktop environment's app menu cache"
echo ""
echo "For GNOME:"
echo "  • Press Alt+F2, type 'r', press Enter to restart shell"
echo "  • Or logout/login"
echo ""
echo "For KDE Plasma:"
echo "  • Right-click panel → Edit Panel → More Options → Restart Plasma"
echo "  • Or logout/login"
echo ""
echo "For XFCE:"
echo "  • Logout/login or restart"
echo ""
