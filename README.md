# OS Athena

OS Athena is an open-source AI assistant for web development workflows. It allows you to plan, build, and deploy applications directly from a unified command center.

## Features
- **AI Chat:** Plan and implement features with state-of-the-art models.
- **GitHub Integration:** Manage repositories, apply changes, and track history.
- **Unified Deployment:** One-click deploys to Vercel and Render.
- **Local AI:** Support for local models via Ollama.

## Installation

### Linux (Debian/Ubuntu/Crostini)

#### Option 1: From Source (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/raynaythegreat/OS-Athena.git
cd OS-Athena

# Install dependencies
npm install

# Build the standalone app
npm run build

# Install desktop integration
chmod +x electron/install-desktop-entry.sh
./electron/install-desktop-entry.sh

# Launch from application menu or terminal
os-athena
```

#### Option 2: AppImage (Coming Soon)

Download the latest AppImage:
- [Linux AppImage](https://github.com/raynaythegreat/OS-Athena/releases/latest)

```bash
# Make executable and install
chmod +x OS-Athena-*.AppImage
./OS-Athena-*.AppImage
```

### Windows & macOS

Coming soon! Currently focused on Linux-first development.

### Troubleshooting

If the app doesn't launch from the menu:

```bash
cd ~/OS-Athena

# Run diagnostics
./electron/diagnostics.sh

# Reinstall desktop integration
./electron/install-desktop-entry.sh

# Check logs
tail -f ~/.local/share/os-athena/logs/launcher-*.log
```

## Setup

1. **GitHub Token:**
   - Go to GitHub Settings > Developer Settings > Personal Access Tokens (Fine-grained).
   - Generate a token with `repo` and `user` permissions.
   - In OS Athena, go to **Settings** > **API Keys**.

2. **Ollama (Optional):**
   - Install [Ollama](https://ollama.com).
   - In OS Athena, go to **Settings** > **Local Ollama**.
   - Click "Connect" to link OS Athena with your local Ollama instance.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev:electron

# Build standalone production app
npm run build

# Build Linux AppImage
npm run build:linux

# Launch from source
./electron/launcher.sh

# Run diagnostics
./electron/diagnostics.sh
```

### Project Structure

```
OS-Athena/
├── electron/
│   ├── main.js                    # Electron main process
│   ├── preload.js                 # Preload script (IPC bridge)
│   ├── launcher.sh                # Smart launcher with logging
│   ├── install-desktop-entry.sh   # Desktop integration installer
│   └── diagnostics.sh             # Troubleshooting tool
├── app/                           # Next.js pages
├── components/                    # React components
├── contexts/                      # React contexts
├── lib/                          # Utilities
├── public/                       # Static assets
└── .next/standalone/             # Production build (after npm run build)
```

### Architecture

OS Athena is a standalone Electron app that:
- Uses Next.js for the UI (React + TailwindCSS)
- Runs Next.js in standalone mode (no external server needed)
- Fixed port: `3456` (localhost)
- Comprehensive logging to `~/.local/share/os-athena/logs/`

### Building for Distribution

```bash
# Build the app
npm run build

# Build AppImage for Linux
npm run build:linux

# Output will be in dist/
ls dist/
```

## License
MIT
