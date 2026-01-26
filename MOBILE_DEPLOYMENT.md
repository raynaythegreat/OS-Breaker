# OS Athena - Mobile Remote Access Guide

## Overview

Mobile Remote Access allows you to deploy a simplified mobile version of OS Athena to Vercel that connects back to your local OS Athena Electron app via ngrok tunnel. All AI processing and data storage happens locally on your machine - no API keys are uploaded to the cloud.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│     Local OS Athena (Electron)                   │
│                                              │
│  ├─ API Keys stored securely                │
│  ├─ All AI processing happens here            │
│  ├─ Chat history stored locally              │
│  ├─ Ollama running locally (:11434)           │
│  └─ Ngrok tunnel exposes port 3456           │
│                                              │
└─────────────────────────────────────────────┘
                      ↓ ngrok tunnel (https://xxx.ngrok.io)
┌─────────────────────────────────────────────┐
│  Mobile Webapp (Vercel)                      │
│                                              │
│  ├─ Password protected                        │
│  ├─ Proxies ALL requests to local OS Athena  │
│  ├─ Thin UI layer only                      │
│ ├─ No API keys stored in cloud          │
│ └─ Mobile-optimized                   │
│                                              │
└─────────────────────────────────────────────┘
```

## Security Model

- **Password Protection**: Mobile webapp requires password authentication
- **Local Processing**: All API keys remain on your local machine
- **HTTP-Only Cookies**: Auth tokens stored in httpOnly cookies (not accessible to JavaScript)
- **HTTPS Encryption**: All connections use encryption
- **No Key Exposure**: No API keys ever sent to Vercel

## Prerequisites

Before deploying mobile access, you need to configure three API keys in your local OS Athena:

### 1. Ngrok API Key

Get your API key from the Ngrok Dashboard:
1. Go to [https://dashboard.ngrok.com/api-keys](https://dashboard.ngrok.com/api-keys)
2. Create a new API key
3. Copy the API key

### 2. Vercel API Key

Get your Vercel token from the Vercel Dashboard:
1. Go to [https://vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Create a new token
3. Copy the token (ensure it has deployment permissions)

### 3. GitHub Token

Get your GitHub token from GitHub Settings:
1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Create a personal access token
3. Ensure it has `repo` and `deployment` scopes
4. Copy the token

**Note:** These keys should already be configured in OS Athena Settings under the "Development Tools" section.

## Setup Steps

### Step 1: Configure API Keys (One-time)

1. Open OS Athena Electron app
2. Go to **Settings** tab
3. Scroll to **Development Tools** section
4. Enter your:
   - **Ngrok API Key** - From your ngrok dashboard
   - **Vercel Token** - From your Vercel account
   - **GitHub Token** - From your GitHub settings
5. Click **Test** for each key to verify they're working
6. Click **Save** for each key

### Step 2: Deploy Mobile Version (First time)

1. Go to **Mobile** tab in OS Athena
2. Click **"Redeploy Mobile Version" button
3. Enter:
   - **Repository**: `your-username/os-athena-mobile` (your mobile webapp repo)
   - **Password**: Create a secure password (minimum 4 characters)
4. Click **Deploy**
5. Wait for deployment to complete

### Step 3: Access from Mobile

1. Open the **mobile URL** displayed in OS Athena (starts with `https://` and ends with `.vercel.app`)
2. Enter your password
3. Click **"Connect"**
4. Start chatting!

## Using Mobile Webapp

### Features

- **Chat Interface**: Full-featured chat with your local AI models
- **Chat History**: Access your conversation history from local OS Athena
- **Image Generation**: Generate images using your local providers
- **Model Selection**: Choose from available AI models
- **Mobile-Optimized UI**: Touch-friendly interface designed for mobile devices

### Connection Status

The mobile webapp shows real-time connection status:
- 🟢 **Connected**: Connected to local OS Athena - all features working
- 🟡 **Connecting**: Attempting to connect to local OS Athena
- 🔴 **Disconnected**: Local OS Athena is not running or tunnel is down

### Troubleshooting

#### "Cannot connect to local OS Athena"

**Solutions:**
- Ensure OS Athena is running on your computer
- Check that the tunnel is active in OS Athena → Mobile tab
- Wait a few seconds and try again
- Verify OS_PUBLIC_URL is correctly set in Vercel environment

#### "Invalid password"

**Solutions:**
- Double-check the password you set during deployment
- Update the password from OS Athena → Mobile tab → Click "Change Password"
- Wait up to 60 seconds for Vercel sync to complete

#### "Mobile deployment not starting"

**Solutions:**
- Check Ngrok API key in OS Athena Settings
- Check that tunnel was created successfully
- Try redeploying from OS Athena → Mobile tab
- Check deployment logs in Settings for errors

#### "Tunnel creation failed"

**Solutions:**
- Verify Ngrok account is active and has credits
- Check API key permissions
- Try using a different ngrok region
- Check if you've exceeded ngrok rate limits

## Mobile Management

From the **Mobile** tab in OS Athena Settings, you can:

- **View Deployment Status**: See if mobile access is active
- **Redeploy Mobile Version**: Deploy a new version or update existing deployment
- **Stop Mobile Access**: Stop the mobile webapp and delete the tunnel
- **Change Password**: Update the mobile access password

### Password Change

When you change the password from OS Athena Settings:
1. It immediately syncs to Vercel (takes up to 60 seconds)
2. The mobile webapp will require the new password on next login
3. All sessions will need to re-authenticate

### Tunnel Persistence

- **Auto-Activation**: Tunnel automatically re-activates when OS Athena starts
- **Persistent**: Tunnel stays active even when OS Athena is closed
- **No Auto-Cleanup**: Tunnel is only deleted when you click "Stop Mobile Access"

### Architecture Details

#### API Key Storage

All API keys are stored in:
- **Electron Encrypted Storage**: Secure storage on your local machine
- **NOT in Vercel Environment**: Mobile webapp only gets `OS_PUBLIC_URL` and `MOBILE_PASSWORD`
- **NOT in Mobile Webapp**: Mobile webapp never sees or stores your API keys

#### Request Flow

1. **Mobile Browser** → Opens `https://your-mobile-app.vercel.app`
2. **Enter Password** → User enters password
3. **Submit to Login** → Password verified
4. **Get Tunnel URL** → Returns `OS_PUBLIC_URL` from Vercel
5. **All Requests** → Proxied to `https://xxx.ngrok.io`
6. **Response** → AI processes locally and sends back response

#### Response Flow

1. **Local OS Athena** → Receives request at `http://localhost:3456`
2. **Process** → Uses stored API keys
3. **Generate Response** → Sends back to mobile webapp via ngrok tunnel

### Data Flow

- **Chat History**: Stored in your local OS Athena database
- **Models**: Pulled from your API keys (stored locally)
- **Images**: Generated using local APIs (stored locally)
- **Settings**: All configurations (stored locally)

## FAQ

### Q: Is my data secure?

A: **Yes!** All API keys are stored securely on your local machine. The mobile webapp acts only as a proxy - it never stores or uses your API keys directly.

### Q: Can multiple people access my mobile app?

A: **Only if you share the password with them**. Each person who knows the password can access your mobile app.

### Q: What happens if I close OS Athena?

A: **Tunnel remains active**. The ngrok tunnel stays active. When you re-open OS Athena, it will automatically re-activate the tunnel. To stop mobile access, go to Mobile tab in Settings and click "Stop Mobile Access".

### Q: How do I change the password?

A: **From OS Athena Settings** → Mobile tab → Click "Change Password". Enter your new password (min 4 characters). This syncs to Vercel automatically and takes up to 60 seconds to apply.

### Q: Can I use mobile and desktop simultaneously?

A: **Yes!** Both connect to the same local OS Athena. Changes sync in real-time (chat history, model preferences, etc).

### Q: What data is shared between mobile and desktop?

A: **Nothing sensitive**. Only your chat history, model preferences, and other UI state. No API keys or passwords.

### Q: Do I need to deploy the mobile webapp myself?

A: **No** The mobile webapp is automatically deployed from OS Athena. You just need to create a GitHub repository for the mobile webapp (more details below).

### Q: How does the tunnel work?

A: **Ngrok API** creates a tunnel from your local port 3456 → HTTPS URL like `https://xxx.ngrok.io`. The mobile webapp uses this URL to proxy all requests back to localhost:3456. All processing happens on your local machine.

### Q: What if the tunnel goes down?

A: **Auto-Reactivation**. When OS Athena is running, it will detect the tunnel status and automatically re-create it if needed.

### Q: Can I have multiple mobile deployments?

A: **Not from OS Athena**. Only one deployment at a time. To create a new deployment, stop the current one first.

## Mobile Webapp Requirements

### Unified Repository Structure

Your fork of `Raynaythegreat/OS-Athena` contains both desktop and mobile code in a single repository:

```
os-athena/
├── app/
│   ├── page.tsx                      # Desktop entry (hidden in remote mode)
│   ├── login/
│   │   └── page.tsx                  # Mobile login page
│   ├── mobile/
│   │   └── page.tsx                  # Mobile management (desktop tab)
│   ├── api/
│   │   ├── auth/login/route.ts       # Mobile authentication
│   │   ├── chat/[...path]/route.ts   # Chat API proxy (new)
│   │   ├── images/[...path]/route.ts # Images API proxy (new)
│   │   ├── models/[...path]/route.ts # Models API proxy (new)
│   │   ├── mobile/deploy/route.ts    # Deployment API
│   │   ├── env/mode/route.ts         # Mode detection API (new)
│   ├── middleware.ts                 # Mode-based routing (new)
│   └── layout.tsx                    # Root layout (updated)
├── lib/
│   ├── mode-detection.ts             # Mode utility (new)
│   ├── proxy.ts                      # Proxy utility (new)
│   └── contexts/
│       └── MobileAuthContext.tsx     # Mobile auth state (new)
├── components/
│   ├── chat/                         # Desktop chat components
│   ├── dashboard/                    # Desktop layout
│   └── settings/                     # Desktop settings
│       └── MobileDeploymentModal.tsx # Updated for unified repo
└── package.json
```

The same codebase behaves differently based on the `OS_REMOTE_MODE` environment variable.

### Environment Variables Required

The unified OS-Athena repository uses different environment variables for each mode:

#### Desktop Mode (Local Electron App)
```bash
# No special environment variables needed
# Runs with all features enabled at localhost:3456
```

#### Mobile Mode (Vercel Deployment)
```bash
# Required - Set automatically by deployment flow:
OS_PUBLIC_URL=https://xxx.ngrok.io     # Ngrok tunnel URL to desktop
OS_REMOTE_MODE=true                     # Enable mobile/remote proxy mode
MOBILE_PASSWORD=your-secure-password    # Access password for mobile
NGROK_TUNNEL_ID=tunnel-id              # For tracking the tunnel

# Optional - Copied from desktop .env.local during deployment:
# Note: API keys are NOT copied - they stay on desktop for security
MODEL_PREFERENCE=claude-sonnet-4-5     # Example: model preferences
THEME=dark                              # Example: UI preferences
```

### Implementation Details

1. **Password Middleware**: Protects all routes except `/login` and `/api/auth/login`
2. **API Proxy**: All API routes proxy requests to `OS_PUBLIC_URL`
3. **Validation**: Ensures remote mode is enabled and URL is configured
4. **Connection Monitoring**: Status indicator component checks connection every 5 seconds
5. **Toast System**: Notifications for user feedback

### Next.js Configuration

The mobile webapp should use these Next.js settings:

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        key: 'x-forwarded-for',
        value: process.env.OS_PUBLIC_URL,
        source: process.env.OS_PUBLIC_URL || 'localhost:3456',
      },
    ],
  },
}
```

## Deployment Flow

### 1. OS Athena → Create ngrok tunnel to port 3456
### 2. Get tunnel URL (e.g., `https://abc123.ngrok.io`)
### 3. Deploy to Vercel with tunnel URL and password
### 4. Vercel sets environment variables (OS_PUBLIC_URL, OS_REMOTE_MODE, MOBILE_PASSWORD)
### 5. Mobile webapp is live!

### Login Flow

1. User opens mobile URL (e.g., `https://os-athena-mobile.vercel.app`)
2. Mobile webapp checks if `OS_REMOTE_MODE=true` in environment
3. User sees password entry screen
4. User enters password and submits
5. Password is validated against `MOBILE_PASSWORD` env var
6. If valid, cookie is set with 24-hour expiry
7. User redirected to chat interface

### API Proxy Flow

All requests to mobile webapp API routes:

```
/api/chat/completions → POST → Proxy to OS_PUBLIC_URL/chat/completions
/api/chat/history → GET → Proxy to OS_PUBLIC_URL/chat/history
/api/images/generate → POST → Proxy to OS_PUBLIC_URL/api/images/generate
/api/models → GET → Proxy to OS_PUBLIC_URL/api/models
```

### Connection Monitoring

- Mobile webapp periodically checks `/api/status` to verify local OS Athena connection
- Shows green "Connected" or red "Disconnected" status
- Auto-retries connection if lost (with exponential backoff)

## Summary

✅ **Secure**: API keys never leave your local machine
✅ **Persistent**: Tunnel stays active across restarts
✅ **Synced**: Password changes sync to Vercel automatically
✅ **Mobile-Optimized**: Designed for touch devices
✅ **Full-Featured**: Access all OS Athena features remotely
✅ **Managed**: Control deployment from OS Athena Settings

Your mobile webapp connects to your local OS Athena and lets you:
- Chat with local AI models
- View and manage chat history
- Generate AI images
- Switch between AI providers
- Access all your local settings and preferences

All processing happens on your computer - the mobile webapp is just a thin, secure proxy layer!
