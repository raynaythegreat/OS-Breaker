#!/bin/bash
# Desktop Integration Installer
# Run this script to install OS Athena to your application menu

set -e

APP_NAME="os-athena"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER_SCRIPT="$APP_DIR/electron/launcher.sh"
ICON_PATH="$APP_DIR/assets/icon.png"
DESKTOP_FILE="$HOME/.local/share/applications/$APP_NAME.desktop"
BIN_DIR="$HOME/.local/bin"
BIN_PATH="$BIN_DIR/$APP_NAME"

echo "================================================"
echo "OS Athena Desktop Integration Installer"
echo "================================================"

# Create directories
mkdir -p "$HOME/.local/share/applications"
mkdir -p "$BIN_DIR"

# Make launcher executable
chmod +x "$LAUNCHER_SCRIPT"
echo "✓ Launcher script prepared"

# Create binary wrapper
cat > "$BIN_PATH" << EOF
#!/bin/bash
exec "$LAUNCHER_SCRIPT" "\$@"
EOF

chmod +x "$BIN_PATH"
echo "✓ Binary wrapper created at $BIN_PATH"

# Create desktop entry
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.2
Type=Application
Name=OS Athena
GenericName=AI Development Assistant
Comment=AI-powered development environment with GitHub integration
Exec=$LAUNCHER_SCRIPT
Icon=$ICON_PATH
Terminal=false
Categories=Development;IDE;
Keywords=ai;development;github;code;assistant;
StartupNotify=true
StartupWMClass=OS Athena
EOF

chmod +x "$DESKTOP_FILE"
echo "✓ Desktop entry created at $DESKTOP_FILE"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
    echo "✓ Desktop database updated"
fi

# Add to PATH if not already there
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "⚠ $BIN_DIR is not in your PATH"
    echo ""
    echo "Add this line to your ~/.bashrc or ~/.zshrc:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
fi

echo ""
echo "================================================"
echo "Installation Complete!"
echo "================================================"
echo ""
echo "OS Athena is now available in your application menu."
echo "You can also launch it from terminal with: $APP_NAME"
echo ""
echo "Logs will be saved to: ~/.local/share/$APP_NAME/logs/"
echo ""
