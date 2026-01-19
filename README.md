# GateKeep

GateKeep is an open-source AI assistant for web development workflows...

## Getting Started

### Desktop Installation

1. **Download the latest release** for your platform:
   - [Windows (.exe)](https://github.com/raynaythegreat/AI-Gatekeep/releases/latest)
   - [macOS (.dmg)](https://github.com/raynaythegreat/AI-Gatekeep/releases/latest)
   - [Linux (.AppImage or .deb)](https://github.com/raynaythegreat/AI-Gatekeep/releases/latest)

2. **Install the app:**
   - **Windows:** Run the `.exe` installer and follow the prompts.
   - **macOS:** Open the `.dmg` file, drag GateKeep to the Applications folder.
   - **Linux:**
     - For `.AppImage`: Make executable (`chmod +x GateKeep-x86_64.AppImage`), then run.
     - For `.deb`: Install using `sudo dpkg -i gatekeep-x.x.x.deb` (replace `x.x.x` with the version).

3. **First launch:**
   - On first run, you'll be guided to configure your API keys under **Settings**.

### Configuring API Keys (BYOK)

1. Obtain API keys for your desired AI providers (OpenAI, Anthropic, etc.).
2. In GateKeep, go to **Settings** > **API Keys**.
3. Enter your keys; they will be stored securely locally.

### Optional: Local Ollama Setup

1. Install [Ollama](https://ollama.ai/download) and ensure it's running.
2. In GateKeep, go to **Settings** > **Local Ollama**.
3. Click "Connect" to link GateKeep with your local Ollama instance.