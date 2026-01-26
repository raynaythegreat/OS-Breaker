# OS Athena

<div align="center">

**AI-Powered Web Development Command Center**

[![Latest Release](https://img.shields.io/github/v/release/raynaythegreat/OS-Athena)](https://github.com/raynaythegreat/OS-Athena/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Downloads](#-download) • [Features](#-features) • [Getting Started](#-getting-started) • [Documentation](#-documentation)

</div>

---

## 📥 Download

Get the latest version of OS Athena for your platform:

| Platform | Download |
|----------|----------|
| **Linux** | [AppImage](https://github.com/raynaythegreat/OS-Athena/releases/latest) (.AppImage) |
| **Windows** | [Installer](https://github.com/raynaythegreat/OS-Athena/releases/latest) (.exe) |
| **macOS** | [DMG](https://github.com/raynaythegreat/OS-Athena/releases/latest) (.dmg) |

> **Note:** First-time users should run the onboarding wizard to set up their API keys.

---

## ✨ Features

### 🤖 AI-Powered Development
- **Multiple AI Providers**: Support for 11+ AI providers including Claude, OpenAI, Groq, Gemini, Mistral, and more
- **Local AI**: Free local models via Ollama integration
- **Smart Context**: Maintains conversation context for complex multi-step tasks

### 🐙 GitHub Integration
- **Repository Management**: Create, clone, and manage GitHub repositories
- **File Operations**: Create, edit, and commit files directly from the chat
- **History Tracking**: View commit history and file changes
- **Branch Management**: Switch and create branches

### 🚀 One-Click Deployment
- **Vercel**: Deploy to Vercel with a single click
- **Render**: Deploy to Render with automatic configuration
- **Auto-Configuration**: Handles build settings and environment variables

### 📱 Mobile Access
- **Ngrok Integration**: Automatic tunnel creation for mobile access
- **Cross-Platform**: Access your desktop workspace from mobile browser
- **Secure**: Encrypted API keys stored safely

---

## 🚀 Getting Started

### 1. Download & Install

**Linux:**
```bash
chmod +x OS-Athena-*.AppImage
./OS-Athena-*.AppImage
```

**Windows:**
```bash
# Run the installer (.exe)
# Follow the installation wizard
```

**macOS:**
```bash
# Open the DMG file
# Drag OS Athena to Applications folder
```

### 2. Launch the App

On first launch, OS Athena will guide you through the onboarding wizard to:
- Add your AI provider API keys
- Test your connections
- Configure your workspace

### 3. Start Building!

Once set up, you can:
- **Chat with AI** to plan and implement features
- **Manage GitHub repos** directly from the chat
- **Deploy to Vercel/Render** with one click

### Quick Setup Tips

**Essential API Keys:**
- At least one AI provider (Claude, OpenAI, Groq, etc.)
- GitHub token (for repository management)
- Vercel token (optional, for deployment)

**Get API Keys:**
- Visit the **Settings** tab in the app
- Click the **🔑 Get API Key** button next to any provider
- Follow the link to generate your key
- Paste it back in the app and click **Save**

---

## 📱 Deployment Modes

OS-Athena supports two deployment modes from a single repository:

### Desktop Mode (Default)
- Full-featured Electron desktop application
- Run locally: `npm run dev:electron`
- Access at http://localhost:3456
- All features: chat, history, repos, deployments, settings, mobile management

### Mobile Mode
- Lightweight webapp deployed to Vercel
- Password-protected access
- Proxies ALL requests to desktop via ngrok tunnel
- Simplified mobile UI (chat + history only)

**To deploy mobile:**
1. Fork this repository
2. Configure Ngrok, Vercel, and GitHub API keys in desktop app Settings
3. Go to Mobile tab in desktop
4. Click "Launch Mobile Version"
5. Enter your fork (e.g., `yourname/OS-Athena`) and password
6. Mobile deploys automatically from your fork!

See [MOBILE_DEPLOYMENT.md](./MOBILE_DEPLOYMENT.md) for detailed mobile deployment instructions.

---

## 📚 Documentation

- **[Installation Guide](./docs/INSTALLATION.md)** - Detailed platform-specific instructions
- **[Getting Started Guide](./docs/GETTING-STARTED.md)** - Tutorial-style walkthrough
- **[Setup Guide](./SETUP.md)** - Complete configuration reference
- **[Troubleshooting](./APPMENU-FIX-SUMMARY.md)** - Common issues and solutions

---

## 🎯 Common Workflows

### Create a New GitHub Repository
```
You: Create a new GitHub repo called "my-awesome-project"
AI: I'll create that for you...
```

### Build a Feature
```
You: Add a login page with OAuth authentication
AI: I'll implement that feature...
```

### Deploy to Vercel
```
You: Deploy this project to Vercel
AI: Deploying to Vercel...
```

---

## 🔧 For Developers

### Build from Source

```bash
# Clone the repository
git clone https://github.com/raynaythegreat/OS-Athena.git
cd OS-Athena

# Install dependencies
npm install

# Run in development mode
npm run dev:electron

# Build for production
npm run build

# Build platform-specific distributions
npm run build:linux    # Linux AppImage
npm run build:windows  # Windows installer
npm run build:mac      # macOS DMG
npm run build:all      # All platforms
```

### Project Structure

```
OS-Athena/
├── electron/              # Electron main process
│   ├── main.js           # Main process entry point
│   ├── autoUpdater.js    # Auto-update functionality
│   └── preload.js        # IPC bridge
├── app/                   # Next.js pages
├── components/            # React components
├── contexts/              # React contexts
├── lib/                   # Utilities
├── services/              # API services
└── public/                # Static assets
```

### Architecture

- **Frontend**: Next.js 14 (React + TailwindCSS)
- **Desktop**: Electron with standalone Next.js server
- **Storage**: Encrypted API keys using Electron safeStorage
- **Updates**: Auto-updater via GitHub releases

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Electron](https://www.electronjs.org/)
- AI providers: [Anthropic](https://www.anthropic.com/), [OpenAI](https://openai.com/), [Groq](https://groq.com/), and more
- Deployment: [Vercel](https://vercel.com/), [Render](https://render.com/)

---

<div align="center">

**[⬆ Back to Top](#os-athena)**

Made with ❤️ by the OS Athena community

</div>
