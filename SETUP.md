# OS Athena - Setup Guide

## 🔑 API Key Configuration

OS Athena supports multiple AI providers and deployment platforms. You can configure your API keys in two ways:

### Method 1: Using the Settings UI (Recommended)

1. Launch OS Athena
2. Go to **Settings** tab
3. For each provider you want to use:
   - Click the 🔑 **Get API Key** button to open the provider's console
   - Copy your API key from the provider
   - Paste it into the input field
   - Click **Save** to store it in `.env.local`
   - Click **Test** to verify the connection

### Method 2: Manual Configuration

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your API keys:
   ```bash
   nano .env.local  # or use your preferred editor
   ```

3. Replace the placeholder values with your actual API keys

## 🤖 Supported AI Providers

| Provider | Get API Key | Environment Variable |
|----------|-------------|---------------------|
| **Anthropic (Claude)** | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | `CLAUDE_API_KEY` |
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| **Groq** | [console.groq.com/keys](https://console.groq.com/keys) | `GROQ_API_KEY` |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` |
| **Fireworks AI** | [fireworks.ai/api-keys](https://fireworks.ai/api-keys) | `FIREWORKS_API_KEY` |
| **Google Gemini** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | `GEMINI_API_KEY` |
| **Mistral AI** | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) | `MISTRAL_API_KEY` |
| **Cohere** | [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys) | `COHERE_API_KEY` |
| **Perplexity** | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) | `PERPLEXITY_API_KEY` |

## 🚀 Deployment Providers

| Provider | Get Token/Key | Environment Variable |
|----------|---------------|---------------------|
| **GitHub** | [github.com/settings/tokens](https://github.com/settings/tokens) | `GITHUB_TOKEN` |
| **Vercel** | [vercel.com/account/tokens](https://vercel.com/account/tokens) | `VERCEL_TOKEN` |
| **Render** | [dashboard.render.com/u/settings#api-keys](https://dashboard.render.com/u/settings#api-keys) | `RENDER_API_KEY` |

## 🦙 Local AI with Ollama (Optional)

To run AI models locally:

1. Install Ollama: [ollama.ai](https://ollama.ai)
2. Start Ollama: `ollama serve`
3. Pull models: `ollama pull llama2`
4. No API key needed - OS Athena will auto-detect Ollama on `localhost:11434`

## 💡 Tips

- **Start Small**: You don't need all API keys. Start with 1-2 providers you want to use.
- **Free Tiers**: Many providers offer free tiers:
  - Groq: Free fast inference
  - OpenRouter: Free models available
  - Ollama: Completely free (local)
- **Security**: Never commit your `.env.local` file to git (it's already in `.gitignore`)
- **Testing**: Use the **Test** button in Settings to verify your keys work before using them

## 🔒 Security Notes

- API keys are stored locally in `.env.local` on your machine
- They are never sent to any server except the respective AI provider
- `.env.local` is gitignored and will never be committed to your repository
- You can delete keys anytime from the Settings UI

## 📖 Getting Started

1. **Set up at least one AI provider** (recommended: Claude, OpenAI, or Groq)
2. **Optionally set up GitHub** if you want to work with repositories
3. **Optionally set up Vercel or Render** if you want to deploy apps
4. Start chatting and building! 🎉

## 🆘 Troubleshooting

### "API key not configured" error
- Make sure you clicked **Save** after entering your key
- Verify the key format matches the placeholder
- Click **Test** to check if the key is valid

### "Connection failed" error
- Check your internet connection
- Verify the API key is correct and not expired
- Some providers have rate limits - try again in a few minutes

### Keys not persisting after restart
- Make sure you clicked **Save** (not just Test)
- Check that `.env.local` exists in the project root
- Verify file permissions allow reading/writing

## 📚 Additional Resources

- [OS Athena Documentation](https://github.com/raynaythegreat/OS-Athena)
- [Anthropic API Docs](https://docs.anthropic.com)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Groq Documentation](https://console.groq.com/docs)

---

Need help? [Open an issue](https://github.com/raynaythegreat/OS-Athena/issues) on GitHub.
