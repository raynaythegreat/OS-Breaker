#!/bin/bash
# OS Athena Dependency Installer
# Detects and installs: OS Athena app, ollama, ngrok CLI, github CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Platform detection
detect_platform() {
    case "$(uname -s)" in
        Linux*)     PLATFORM=linux;;
        Darwin*)    PLATFORM=macos;;
        MINGW*|MSYS*|CYGWIN*) PLATFORM=windows;;
        *)          PLATFORM=unknown;;
    esac
    echo $PLATFORM
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check OS Athena installation
check_os_athena() {
    if [ "$PLATFORM" = "linux" ]; then
        command_exists os-athena || [ -f "$HOME/.local/bin/os-athena" ] || [ -f "/usr/local/bin/os-athena" ]
    elif [ "$PLATFORM" = "macos" ]; then
        [ -d "/Applications/OS Athena.app" ]
    elif [ "$PLATFORM" = "windows" ]; then
        command_exists os-athena.exe || [ -d "$LOCALAPPDATA/Programs/os-athena" ]
    else
        false
    fi
}

# Install OS Athena
install_os_athena() {
    echo -e "${BLUE}Installing OS Athena...${NC}"

    if [ "$PLATFORM" = "linux" ]; then
        LATEST_URL=$(curl -s https://api.github.com/repos/raynaythegreat/OS-Athena/releases/latest | grep "browser_download_url.*AppImage" | head -n 1 | cut -d '"' -f 4)
        if [ -z "$LATEST_URL" ]; then
            echo -e "${YELLOW}Could not auto-detect download URL. Please visit:${NC}"
            echo "https://github.com/raynaythegreat/OS-Athena/releases/latest"
            return 1
        fi
        curl -L -o os-athena.AppImage "$LATEST_URL"
        chmod +x os-athena.AppImage
        mkdir -p ~/.local/bin
        mv os-athena.AppImage ~/.local/bin/os-athena
        echo -e "${GREEN}✓ OS Athena installed to ~/.local/bin/os-athena${NC}"
    elif [ "$PLATFORM" = "macos" ]; then
        echo "Please download OS Athena from https://github.com/raynaythegreat/OS-Athena/releases/latest"
        echo "Then drag to Applications folder"
        open "https://github.com/raynaythegreat/OS-Athena/releases/latest" 2>/dev/null || true
    fi
}

# Check and install Ollama
check_ollama() {
    if command_exists ollama; then
        echo -e "${GREEN}✓ Ollama installed${NC}"
        return 0
    fi
    echo -e "${YELLOW}✗ Ollama not found${NC}"
    return 1
}

install_ollama() {
    echo -e "${BLUE}Installing Ollama...${NC}"
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✓ Ollama installed${NC}"
}

# Check and install Ngrok
check_ngrok() {
    if command_exists ngrok; then
        echo -e "${GREEN}✓ Ngrok CLI installed${NC}"
        return 0
    fi

    # Check in user bin directory
    USER_BIN="$HOME/.local/bin"
    if [ -f "$USER_BIN/ngrok" ]; then
        echo -e "${GREEN}✓ Ngrok CLI installed in $USER_BIN${NC}"
        return 0
    fi

    echo -e "${YELLOW}✗ Ngrok CLI not found${NC}"
    return 1
}

install_ngrok() {
    echo -e "${BLUE}Installing Ngrok CLI...${NC}"

    if [ "$PLATFORM" = "linux" ]; then
        # For Linux, install to user bin directory
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok-arm64.tgz | tar -xz -C /tmp
        mkdir -p ~/.local/bin
        mv /tmp/ngrok ~/.local/bin/ngrok
        chmod +x ~/.local/bin/ngrok
        echo -e "${GREEN}✓ Ngrok CLI installed to ~/.local/bin/ngrok${NC}"
        echo -e "${YELLOW}Note: Add ~/.local/bin to your PATH if not already:${NC}"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    elif [ "$PLATFORM" = "macos" ]; then
        if command_exists brew; then
            brew install ngrok/ngrok/ngrok
        else
            echo "Homebrew not found. Please install Homebrew first:"
            echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            return 1
        fi
        echo -e "${GREEN}✓ Ngrok CLI installed${NC}"
    fi

    echo -e "${GREEN}✓ Ngrok CLI installed${NC}"
}

# Check and install GitHub CLI
check_gh() {
    if command_exists gh; then
        echo -e "${GREEN}✓ GitHub CLI installed${NC}"
        return 0
    fi
    echo -e "${YELLOW}✗ GitHub CLI not found${NC}"
    return 1
}

install_gh() {
    echo -e "${BLUE}Installing GitHub CLI...${NC}"

    if [ "$PLATFORM" = "linux" ]; then
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg >/dev/null
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
        sudo apt update
        sudo apt install gh
    elif [ "$PLATFORM" = "macos" ]; then
        if command_exists brew; then
            brew install gh
        else
            echo "Homebrew not found. Please install Homebrew first."
            return 1
        fi
    fi

    echo -e "${GREEN}✓ GitHub CLI installed${NC}"
}

# Main installation flow
main() {
    PLATFORM=$(detect_platform)
    echo -e "${BLUE}=== OS Athena Dependency Installer ===${NC}"
    echo -e "${BLUE}Platform: $PLATFORM${NC}"
    echo ""

    if [ "$PLATFORM" = "unknown" ]; then
        echo -e "${RED}Unsupported platform. This script supports Linux, macOS, and Windows (Git Bash/MSYS).${NC}"
        exit 1
    fi

    # Track what needs installation
    INSTALL_OS_ATHENA=false
    INSTALL_OLLAMA=false
    INSTALL_NGROK=false
    INSTALL_GH=false

    # Check each component
    echo "Checking dependencies..."
    if ! check_os_athena; then INSTALL_OS_ATHENA=true; fi
    if ! check_ollama; then INSTALL_OLLAMA=true; fi
    if ! check_ngrok; then INSTALL_NGROK=true; fi
    if ! check_gh; then INSTALL_GH=true; fi

    echo ""

    # If everything is installed
    if [ "$INSTALL_OS_ATHENA" = false ] && [ "$INSTALL_OLLAMA" = false ] && [ "$INSTALL_NGROK" = false ] && [ "$INSTALL_GH" = false ]; then
        echo -e "${GREEN}=== All Dependencies Already Installed! ===${NC}"
        echo ""
        echo "You're ready to use OS Athena!"
        echo ""
        echo "Next steps:"
        echo "1. Launch OS Athena"
        echo "2. Go to Settings and configure API keys:"
        echo "   - Ngrok API Key (get from https://dashboard.ngrok.com/api-keys)"
        echo "   - Vercel Token (get from https://vercel.com/account/tokens)"
        echo "   - GitHub Token (get from https://github.com/settings/tokens)"
        echo "3. For mobile deployment: Click 'Mobile' tab → 'Launch Mobile Version'"
        exit 0
    fi

    # Ask for confirmation
    echo "The following will be installed:"
    [ "$INSTALL_OS_ATHENA" = true ] && echo "  - OS Athena"
    [ "$INSTALL_OLLAMA" = true ] && echo "  - Ollama (for local AI)"
    [ "$INSTALL_NGROK" = true ] && echo "  - Ngrok CLI (for mobile access)"
    [ "$INSTALL_GH" = true ] && echo "  - GitHub CLI (for repository management)"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi

    # Install missing components
    [ "$INSTALL_OS_ATHENA" = true ] && install_os_athena
    [ "$INSTALL_OLLAMA" = true ] && install_ollama
    [ "$INSTALL_NGROK" = true ] && install_ngrok
    [ "$INSTALL_GH" = true ] && install_gh

    echo ""
    echo -e "${GREEN}=== Installation Complete! ===${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Launch OS Athena"
    echo "2. Go to Settings and configure API keys:"
    echo "   - Ngrok API Key (get from https://dashboard.ngrok.com/api-keys)"
    echo "   - Vercel Token (get from https://vercel.com/account/tokens)"
    echo "   - GitHub Token (get from https://github.com/settings/tokens)"
    echo "3. For mobile deployment: Click 'Mobile' tab → 'Launch Mobile Version'"
}

main "$@"
