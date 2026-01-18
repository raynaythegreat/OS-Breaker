# GateKeep (AI-Gatekeep)

GateKeep is an open-source AI assistant focused on **web development workflows**: planning changes, generating production-ready code, and helping you apply commits directly to GitHub repositories. It’s designed around a **BYOK (Bring Your Own Keys)** model—users provide their own API keys locally or via their hosting environment.

## Key features

### AI chat for web dev workflows
- Multi-provider chat (provider availability depends on your configuration)
- Production-ready outputs with complete file contents (no placeholders)
- Safety-first defaults and clear guidance around secrets

### GitHub repository integration
- Browse repositories and repository context
- Generate structured file changes that can be applied/committed
- History/session support (where enabled in the UI)

### Deployments (Vercel + Render)
- Recommends a default provider based on repo signals
  - Prefer **Vercel** for Next.js and typical frontend/SSR apps
  - Prefer **Render** for long-running servers (WebSockets), background jobs/queues, or persistent services
- Deployment configuration helpers for both providers

### Local-first + BYOK (Bring Your Own Keys)
- Users are responsible for obtaining and managing their own API keys
- Keys should be stored in:
  - **your hosting environment variables (Vercel or Render) or `.env.local`** for hosted/self-hosted deployments
  - (Desktop support can store locally on-device; see roadmap below)
- GateKeep never asks you to paste secrets into GitHub issues, PRs, or chat transcripts

### Ollama local model support
- Supports using a locally-running Ollama instance (when configured)
- Recommended: install Ollama and ensure it is running before connecting/configuring

### Diagnostics
- A diagnostics view to help confirm:
  - runtime mode
  - which providers appear configured (redacted)
  - helpful environment/config information (without exposing secrets)

## Getting started (local development)

### Prerequisites
- Node.js 18+ recommended
- npm (or your preferred package manager)

### Install