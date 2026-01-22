# OS Athena

OS Athena is an open-source AI assistant for web development workflows. It allows you to plan, build, and deploy applications directly from a unified command center.

## Features
- **AI Chat:** Plan and implement features with state-of-the-art models.
- **GitHub Integration:** Manage repositories, apply changes, and track history.
- **Unified Deployment:** One-click deploys to Vercel and Render.
- **Local AI:** Support for local models via Ollama.

## Installation

Download the latest release for your platform:
- [Windows (.exe)](https://github.com/raynaythegreat/OS-Athena/releases/latest)
- [macOS (.dmg)](https://github.com/raynaythegreat/OS-Athena/releases/latest)
- [Linux (.AppImage or .deb)](https://github.com/raynaythegreat/OS-Athena/releases/latest)

### Running on Desktop
- **Windows:** Run the `.exe` installer.
- **macOS:** Open the `.dmg` file, drag OS Athena to the Applications folder.
- **Linux:**
  - For `.AppImage`: Make executable (`chmod +x OS-Athena-x86_64.AppImage`), then run.
  - For `.deb`: Install using `sudo dpkg -i os-athena-x.x.x.deb`.

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

# Run web app
npm run dev

# Run Electron desktop app
npm run electron:dev

# Build Electron app
npm run electron:build
```

## License
MIT
