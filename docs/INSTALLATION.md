# OS Athena Installation Guide

This guide provides detailed installation instructions for each supported platform.

## Table of Contents

- [Quick Install (Recommended)](#quick-install-recommended)
- [Linux](#linux-installation)
  - [AppImage (Recommended)](#appimage-recommended)
  - [DEB Package]
  - [From Source](#from-source)
- [Windows](#windows-installation)
- [macOS](#macos-installation)
- [First-Launch Setup](#first-launch-setup)
- [Troubleshooting](#troubleshooting)

---

## Quick Install (Recommended)

For a fully automated setup that installs OS Athena and all dependencies:

```bash
# Download and run the smart installer
curl -fsSL https://raw.githubusercontent.com/raynaythegreat/OS-Athena/main/scripts/install-dependencies.sh -o install.sh
chmod +x install.sh
./install.sh
```

This will:
- **Detect and install OS Athena** (the desktop app)
- **Detect and install Ollama** (for local AI models)
- **Detect and install Ngrok CLI** (for mobile access tunneling)
- **Detect and install GitHub CLI** (for repository management)

Each component is only installed if not already present. The script:
1. Checks what's already installed
2. Asks for confirmation before installing anything
3. Installs missing components one by one
4. Shows you exactly what's happening

---

## Linux Installation

### AppImage (Recommended)

The AppImage is a universal package that works on most Linux distributions.

#### Download

1. Visit the [Releases page](https://github.com/raynaythegreat/OS-Athena/releases/latest)
2. Download the `OS-Athena-*.AppImage` file

#### Install

```bash
# Make the AppImage executable
chmod +x OS-Athena-*.AppImage

# Run the application
./OS-Athena-*.AppImage
```

#### Optional: Install to System

```bash
# Move to a location in your PATH
sudo mv OS-Athena-*.AppImage /usr/local/bin/os-athena

# Now you can run it from anywhere
os-athena
```

### DEB Package (Debian/Ubuntu)

#### Download

1. Visit the [Releases page](https://github.com/raynaythegreat/OS-Athena/releases/latest)
2. Download the `os-athena_*.deb` file

#### Install

```bash
# Install using dpkg
sudo dpkg -i os-athena_*.deb

# Fix any missing dependencies
sudo apt-get install -f
```

### From Source

For developers or those who want the latest development version.

```bash
# Clone the repository
git clone https://github.com/raynaythegreat/OS-Athena.git
cd OS-Athena

# Install dependencies
npm install

# Build the app
npm run build

# Install desktop integration
chmod +x electron/install-desktop-entry.sh
./electron/install-desktop-entry.sh

# Run the application
npm run dev:electron
```

---

## Windows Installation

### Using Installer

#### Download

1. Visit the [Releases page](https://github.com/raynaythegreat/OS-Athena/releases/latest)
2. Download the `OS-Athena-*.exe` installer

#### Install

1. Double-click the downloaded `.exe` file
2. Follow the installation wizard:
   - Choose installation directory (default: `C:\Users\<YourUser>\AppData\Local\Programs\os-athena`)
   - Select "Create Desktop Shortcut" for easy access
   - Click "Install"
3. Launch OS Athena from:
   - Desktop shortcut, or
   - Start Menu → OS Athena

### From Source

For developers:

```powershell
# Clone the repository
git clone https://github.com/raynaythegreat/OS-Athena.git
cd OS-Athena

# Install dependencies
npm install

# Run in development mode
npm run dev:electron
```

---

## macOS Installation

### Using DMG

#### Download

1. Visit the [Releases page](https://github.com/raynaythegreat/OS-Athena/releases/latest)
2. Download the `OS-Athena-*.dmg` file

#### Install

1. Double-click the downloaded `.dmg` file
2. Drag OS Athena to the Applications folder
3. Eject the DMG
4. Launch OS Athena from:
   - Applications folder, or
   - Spotlight (Cmd + Space, type "OS Athena")

### First Launch: Gatekeeper

On first launch, macOS may show a security warning:

**"OS Athena cannot be opened because it is from an unidentified developer."**

To bypass this:

1. Right-click (or Ctrl-click) on OS Athena
2. Select "Open"
3. Click "Open" in the dialog
4. OS Athena will launch and be remembered as safe

### From Source

For developers:

```bash
# Clone the repository
git clone https://github.com/raynaythegreat/OS-Athena.git
cd OS-Athena

# Install dependencies
npm install

# Run in development mode
npm run dev:electron
```

---

## First-Launch Setup

When you launch OS Athena for the first time, you'll be guided through the onboarding wizard.

### Step 1: Welcome

The welcome screen introduces you to OS Athena's main features.

### Step 2: Add API Keys

Select your AI provider(s) and add your API keys.

**Recommended AI Providers:**
- **Anthropic Claude** - Best for coding tasks
- **OpenAI GPT-4** - Strong all-around performance
- **Groq** - Fastest inference (great for quick iterations)
- **Ollama** - Free local models (no API key needed)

**How to Get API Keys:**

1. Click the **🔑 Get API Key** button
2. You'll be redirected to the provider's website
3. Sign up and generate a new API key
4. Copy the key and paste it back in OS Athena
5. Click **Save**
6. Click **Test** to verify the connection

### Step 3: Optional Integrations

You can also set up:
- **GitHub Token** - For repository management
- **Vercel Token** - For one-click deployment
- **Ngrok API Key** - For mobile access (free tier sufficient)

### Step 4: Complete Setup

Click **Start Using OS Athena** to begin!

---

## Troubleshooting

### Linux

#### AppImage won't run

```bash
# Check if file is executable
ls -l OS-Athena-*.AppImage

# If not executable, make it executable
chmod +x OS-Athena-*.AppImage

# If still not working, check for missing libraries
./OS-Athena-*.AppImage --appimage-extract
./squashfs-root/AppRun
```

#### App not in application menu

After installing from source:

```bash
# Reinstall desktop integration
cd ~/OS-Athena
./electron/install-desktop-entry.sh

# Logout and login to refresh desktop cache
```

#### Port 3456 already in use

OS Athena automatically detects and brings existing instances to foreground. If you need to force a restart:

```bash
# Kill any process using port 3456
fuser -k 3456/tcp
```

### Windows

#### Installation fails

1. Ensure you have Administrator privileges
2. Temporarily disable antivirus
3. Run the installer again

#### App won't launch

1. Check Windows Event Viewer for crash logs
2. Try running as Administrator
3. Check that no firewall is blocking port 3456

### macOS

#### "Damaged" or "can't be opened" error

This is a Gatekeeper security feature. To fix:

```bash
# Remove quarantine attribute
xattr -cr /Applications/OS-Athena.app
```

Then try launching again.

#### App crashes on launch

Check crash logs:

```bash
# View system logs
log show --predicate 'process == "OS Athena"' --last 5m

# Or use Console.app
open /Applications/Utilities/Console.app
```

---

## System Requirements

### Minimum Requirements

- **OS:** Linux (Ubuntu 20.04+, Debian 11+, Fedora 35+), Windows 10+, macOS 11+
- **RAM:** 4 GB
- **Storage:** 500 MB free space
- **Network:** Internet connection for AI providers and updates

### Recommended Requirements

- **RAM:** 8 GB or more
- **Storage:** 1 GB free space
- **CPU:** Multi-core processor

### For Local AI (Ollama)

- **RAM:** 8 GB minimum, 16 GB recommended
- **CPU:** Apple Silicon (M1/M2) or GPU with 6+ GB VRAM

---

## Uninstallation

### Linux

```bash
# If installed from AppImage
rm OS-Athena-*.AppImage
rm -rf ~/.config/os-athena

# If installed from DEB
sudo apt remove os-athena
sudo apt autoremove

# If installed from source
rm -rf ~/OS-Athena
rm ~/.local/share/applications/os-athena.desktop
rm -rf ~/.local/share/os-athena
```

### Windows

1. Uninstall via:
   - Settings → Apps → Installed Apps → OS Athena → Uninstall
2. Remove user data:
   ```powershell
   Remove-Item -Recurse -Force $env:APPDATA\os-athena
   ```

### macOS

```bash
# Remove the app
rm -rf /Applications/OS\ Athena.app

# Remove user data
rm -rf ~/Library/Application\ Support/os-athena
rm -rf ~/Library/Preferences/com.osathena.app.plist
```

---

## Next Steps

After installation:

1. **[Getting Started Guide](./GETTING-STARTED.md)** - Learn core features
2. **[Setup Guide](../SETUP.md)** - Detailed configuration options
3. **[Troubleshooting](../APPMENU-FIX-SUMMARY.md)** - Common issues and solutions

---

## Need Help?

- **GitHub Issues:** [Report bugs](https://github.com/raynaythegreat/OS-Athena/issues)
- **Documentation:** [Main README](../README.md)
