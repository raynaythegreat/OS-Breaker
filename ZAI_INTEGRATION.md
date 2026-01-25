# Z.ai GLM Coding Plan Integration Guide

This document outlines the Z.ai GLM Coding Plan integration in OS Athena.

## Overview

Z.ai provides the GLM Coding Plan - a subscription package designed specifically for AI-powered coding. GLM-4.7 delivers state-of-the-art performance in reasoning, coding, and agent capabilities.

## Important: GLM Coding Plan vs Standard API

**This integration uses the GLM Coding Plan endpoint**, which is different from the standard Z.ai API:

- **GLM Coding Plan:** `https://api.z.ai/api/coding/paas/v4` (✅ This is what OS Athena uses)
- **Standard API:** `https://open.bigmodel.cn/api/paas/v4` (❌ Not for coding tools)

The Coding Plan is designed specifically for coding tools like Claude Code, Cline, OpenCode, and now OS Athena. It offers:
- Higher usage limits (3× more than standard plans)
- Faster response times (55+ tokens/second)
- No network restrictions
- Starting at $3/month

See: https://docs.z.ai/devpack/overview

## Changes Made

### Files Modified

1. ✅ `/lib/secureStorage.ts` - Added `zai` to ApiKeys interface
2. ✅ `/lib/chatHeaders.ts` - Added Z.ai header mapping
3. ✅ `/components/settings/SettingsPage.tsx` - Added Z.ai provider card
4. ✅ `/services/apiTester.ts` - Added `testZai()` function with Coding Plan endpoint
5. ✅ `/app/api/chat/route.ts` - Added Z.ai provider implementation with Coding Plan endpoint
6. ✅ `/components/chat/ModelSelector.tsx` - Added Z.ai models
7. ✅ `/.env.local.example` - Added `ZHIPU_API_KEY`
8. ✅ `/app/api/zai/models/route.ts` - Created models endpoint

### Files Deleted

- ❌ `/app/api/huggingface/models/route.ts` - Removed (replaced with Z.ai)

## Setup Instructions

### 1. Get Your GLM Coding Plan Subscription

1. Go to https://z.ai/subscribe
2. Choose your plan:
   - **Lite** ($3/month, ~120 prompts/5 hours)
   - **Pro** ($15/month, ~600 prompts/5 hours)
   - **Max** (~2400 prompts/5 hours)
3. Complete the subscription
4. Navigate to API Keys: https://z.ai/manage-apikey/apikey-list
5. Copy your API key

### 2. Add to OS Athena

**Option A: Via Settings UI (Recommended)**
1. Open OS Athena
2. Go to Settings page
3. Scroll to "AI Providers" section
4. Find the **⚡ Z.ai** card
5. Paste your API key
6. Click **"Save"** to store securely
7. Click **"Test"** to verify connection

**Option B: Via Environment Variables**
1. Create or edit `.env.local` in your project root
2. Add: `ZHIPU_API_KEY=your_api_key_here` (also supports `ZAI_API_KEY`)
3. Restart the app

### 3. Start Using Z.ai Models

1. Go to the Chat page
2. Click the model selector dropdown
3. You should see the **Z.ai (⚡)** section with:
   - **GLM-4.7** - Flagship coding model
   - **GLM-4.7-Flash** - Fast free coding model
   - **GLM-4.5-Flash** - Fast free reasoning model
   - **GLM-4.6V** - Multimodal with vision
4. Select a model and start chatting!

## Available Models

### GLM-4.7
- **Best for:** Coding, reasoning, complex tasks
- **Description:** Flagship model optimized for software development
- **Capabilities:** Advanced code generation, debugging, refactoring

### GLM-4.7-Flash
- **Best for:** Fast coding tasks
- **Description:** Fast free coding model (30B MoE)
- **Capabilities:** Quick code generation, rapid iterations

### GLM-4.5-Flash
- **Best for:** Fast reasoning
- **Description:** Fast free reasoning model
- **Capabilities:** Quick problem-solving, fast responses

### GLM-4.6V
- **Best for:** Multimodal tasks, image analysis
- **Description:** Vision-enabled model for understanding images
- **Capabilities:** Image analysis, visual Q&A, multimodal reasoning

## Technical Details

### API Configuration

- **Base URL:** `https://api.z.ai/api/coding/paas/v4` (GLM Coding Plan endpoint)
- **Endpoint:** `/chat/completions` (OpenAI-compatible)
- **Authentication:** Bearer token
- **Streaming:** ✅ Supported

### Environment Variables

```bash
# Required (either one works)
ZHIPU_API_KEY=your_api_key_here
# or
ZAI_API_KEY=your_api_key_here

# Optional - Custom model list (comma-separated)
ZAI_CHAT_MODELS=glm-4.7,glm-4.7-flash,glm-4.5-flash,glm-4.6v
```

### API Request Format

Z.ai uses the OpenAI-compatible format:

```typescript
{
  model: "glm-4.7",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" }
  ],
  stream: true
}
```

### Response Format

Streaming responses follow the OpenAI format:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" there"}}]}
data: [DONE]
```

## Testing

### In Settings Page

1. Enter your Z.ai API key
2. Click **"Test"** button
3. You should see:
   - ✅ Green success indicator
   - Message: "Connected - GLM Coding Plan active"
   - Response latency (e.g., "234ms")

### In Chat Interface

1. Select a Z.ai model (e.g., GLM-4.7)
2. Send a test message: "Write a hello world in Python"
3. You should see streaming response
4. Verify the code generation quality

## Electron App Integration

### Automatic Setup

The Electron desktop app automatically handles Z.ai configuration:

1. **API Key Storage**: Keys are encrypted and stored in system keychain
2. **Environment Variables**: Keys are automatically passed to Next.js server
3. **Ngrok Tunnel**: Auto-started on app launch for mobile deployment

### Troubleshooting in Electron

**"API key not found" Error:**

If you see this error in the Electron app:

1. Open Settings (gear icon)
2. Scroll to **AI Providers** section
3. Find the **⚡ Z.ai** card
4. Paste your GLM Coding Plan API key
5. Click **Save**
6. Click **Test** to verify connection
7. Restart the app to apply changes

**API Key Lost:**

If your API key stops working:

1. Go to https://z.ai/subscribe
2. Sign in to your account
3. Go to API Keys: https://z.ai/manage-apikey/apikey-list
4. Verify your key is active
5. If expired, generate a new key
6. Update in OS Athena Settings

## Troubleshooting

### "API key not configured" Error

**Solution:**
- Verify you entered the API key correctly
- Make sure you clicked "Save" in Settings
- Check that you have an active GLM Coding Plan subscription at https://z.ai/subscribe

### "Invalid API key" Error

**Solution:**
- Verify your API key at https://z.ai/manage-apikey/apikey-list
- Make sure you have an active GLM Coding Plan subscription
- Check that the key hasn't expired

### "API key lacks permissions" Error

**Solution:**
- This usually means you're using a standard API key, not the GLM Coding Plan
- Subscribe to the GLM Coding Plan at https://z.ai/subscribe
- Use the API key from your Coding Plan subscription

### "Rate limited" Error

**Solution:**
- Wait a few minutes before trying again
- Check your GLM Coding Plan limits
- Consider upgrading to Pro or Max plan for higher limits

### Models Don't Appear in Dropdown

**Solution:**
- Refresh the page after adding the API key
- Make sure the API key test passed (green checkmark)
- Check browser console (F12) for errors
- Verify the key is saved (try closing and reopening Settings)

### Connection Timeout

**Solution:**
- Check your internet connection
- Verify Z.ai API status
- Try a different model
- Check firewall settings

## Benefits of GLM Coding Plan

✅ **Optimized for Coding** - GLM-4.7 excels at code generation and debugging (SWE-bench: 73.8%)
✅ **High Usage Limits** - 3× more prompts than standard plans
✅ **Fast Inference** - 55+ tokens/second for real-time interaction
✅ **OpenAI-Compatible** - Easy integration with existing tools
✅ **Streaming Support** - Real-time token streaming
✅ **Cost Effective** - Starting at $3/month for extensive usage

## Coding Plan Usage Limits

Usage limits reset every 5 hours:
- **Lite Plan:** ~120 prompts (≈ 3× Claude Pro)
- **Pro Plan:** ~600 prompts (≈ 3× Claude Max 5x)
- **Max Plan:** ~2400 prompts (≈ 3× Claude Max 20x)

Each prompt typically allows 15-20 model calls, giving tens of billions of tokens monthly at ~1% of standard API pricing.

## Additional Resources

- **GLM Coding Plan:** https://docs.z.ai/devpack/overview
- **Subscription:** https://z.ai/subscribe
- **API Documentation:** https://docs.z.ai/guides/overview/quick-start
- **API Key Management:** https://z.ai/manage-apikey/apikey-list

## Migration from Hugging Face

If you were previously using Hugging Face:

1. **Get a GLM Coding Plan subscription** at https://z.ai/subscribe
2. **Get your API key** from https://z.ai/manage-apikey/apikey-list
3. **Add it in Settings** under the Z.ai provider
4. **Remove your Hugging Face key** (no longer supported)
5. **Select Z.ai models** from the model dropdown
6. **Start chatting** with GLM-4.7 or GLM-4.6V

The GLM models offer significantly better performance for coding tasks compared to Hugging Face models.

## Next Steps

1. ✅ Subscribe to GLM Coding Plan
2. ✅ Get your API key
3. ✅ Add it to OS Athena Settings
4. ✅ Test the connection
5. ✅ Try GLM-4.7 for coding tasks
6. ✅ Try GLM-4.6V for multimodal tasks
7. ✅ Build amazing AI-powered applications!

For questions or issues, check the Z.ai documentation or the OS Athena repository.
