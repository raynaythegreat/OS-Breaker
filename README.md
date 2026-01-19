# GateKeep

GateKeep is an open-source AI assistant for web development workflows: planning changes, generating production-ready code, and helping you apply commits directly to GitHub repositories.

## Getting Started

### Desktop Installation

1. Download the latest release for your platform:
   - [Windows (.exe)](https://github.com/raynaythegreat/AI-Gatekeep/releases/latest)
   - [macOS (.dmg)](https://github.com/raynaythegreat/AI-Gatekeep/releases/latest)
   - [Linux (.AppImage or .deb)](https://github.com/raynaythegreat/AI-Gatekeep/releases/latest)
2. Run the installer and follow the prompts.
3. On first launch, configure your API keys under Settings.

### Configuring API Keys (BYOK)

1. Obtain API keys for your desired AI providers (OpenAI, Anthropic, etc.).
2. In GateKeep, go to **Settings** > **API Keys**.
3. Enter your keys; they will be stored securely locally (desktop) or in your hosting environment variables (Vercel or Render) or `.env.local` (web).

### Optional: Local Ollama Setup

1. Install [Ollama](https://ollama.ai/download) and ensure it's running.
2. In GateKeep, go to **Settings** > **Local Ollama**.
3. Click "Connect" to link GateKeep with your local Ollama instance.

## Key Features

- AI chat for web development tasks
- GitHub repository integration (browse, commit, deploy)
- Vercel and Render deployment guidance
- BYOK (Bring Your Own Keys) for AI providers
- Local Ollama support for offline usage
- Diagnostics page for troubleshooting

## Development

For local development:
1. Clone this repository.
2. Run `npm install`.
3. Start the development server with `npm run dev`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.