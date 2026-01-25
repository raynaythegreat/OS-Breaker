# Z.ai API Integration Guide

This document outlines the Z.ai integration in OS Athena.

## Overview

Z.ai provides access to the GLM (General Language Model) series, which are flagship models optimized for coding and multimodal tasks.

## Changes Made

### Files Modified

1. ✅ `/lib/secureStorage.ts` - Added `zai` to ApiKeys interface
2. ✅ `/lib/chatHeaders.ts` - Added Z.ai header mapping
3. ✅ `/components/settings/SettingsPage.tsx` - Added Z.ai provider card
4. ✅ `/services/apiTester.ts` - Added `testZai()` function
5. ✅ `/app/api/chat/route.ts` - Added Z.ai provider implementation
6. ✅ `/components/chat/ModelSelector.tsx` - Added Z.ai models
7. ✅ `/.env.local.example` - Added `ZAI_API_KEY`
8. ✅ `/app/api/zai/models/route.ts` - Created models endpoint

### Files Deleted

- ❌ `/app/api/huggingface/models/route.ts` - Removed (replaced with Z.ai)

## Setup Instructions

### 1. Get Your Z.ai API Key

1. Go to https://z.ai/model-api
2. Sign up or log in to the Z.ai Open Platform
3. Navigate to API Keys management: https://z.ai/manage-apikey/apikey-list
4. Create a new API key
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
2. Add: `ZAI_API_KEY=your_api_key_here`
3. Restart the app

### 3. Start Using Z.ai Models

1. Go to the Chat page
2. Click the model selector dropdown
3. You should see the **Z.ai (⚡)** section with:
   - **GLM-4.7** - Flagship coding model
   - **GLM-4.6V** - Multimodal with vision
4. Select a model and start chatting!

## Available Models

### GLM-4.7
- **Best for:** Coding, reasoning, complex tasks
- **Description:** Flagship model optimized for software development
- **Capabilities:** Advanced code generation, debugging, refactoring

### GLM-4.6V
- **Best for:** Multimodal tasks, image analysis
- **Description:** Vision-enabled model for understanding images
- **Capabilities:** Image analysis, visual Q&A, multimodal reasoning

## Technical Details

### API Configuration

- **Base URL:** `https://open.bigmodel.cn/api/paas/v4`
- **Endpoint:** `/chat/completions` (OpenAI-compatible)
- **Authentication:** Bearer token
- **Streaming:** ✅ Supported

### Environment Variables

```bash
# Required
ZAI_API_KEY=your_api_key_here

# Optional - Custom model list (comma-separated)
ZAI_CHAT_MODELS=glm-4.7,glm-4.6v,custom-model
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
   - Message: "Connected - GLM models available"
   - Response latency (e.g., "234ms")

### In Chat Interface

1. Select a Z.ai model (e.g., GLM-4.7)
2. Send a test message: "Write a hello world in Python"
3. You should see streaming response
4. Verify the code generation quality

## Troubleshooting

### "API key not configured" Error

**Solution:**
- Verify you entered the API key correctly
- Make sure you clicked "Save" in Settings
- Check that the key is active at https://z.ai/manage-apikey/apikey-list

### "Invalid API key" Error

**Solution:**
- Verify your API key at Z.ai dashboard
- Make sure the key hasn't expired
- Check that you have sufficient credits/quota

### "Rate limited" Error

**Solution:**
- Wait a few minutes before trying again
- Check your Z.ai plan limits
- Consider upgrading your Z.ai plan

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

## Benefits of Z.ai

✅ **Optimized for Coding** - GLM models excel at code generation and debugging
✅ **Multimodal Capabilities** - GLM-4.6V supports image understanding
✅ **Fast Inference** - Competitive response times
✅ **OpenAI-Compatible** - Easy integration with existing tools
✅ **Streaming Support** - Real-time token streaming

## API Rate Limits

Rate limits depend on your Z.ai plan:
- Free tier: Limited requests per minute
- Paid plans: Higher limits with guaranteed availability

Check your current limits at: https://z.ai/manage-apikey/apikey-list

## Additional Resources

- **Z.ai Homepage:** https://z.ai
- **API Documentation:** https://docs.z.ai/guides/overview/quick-start
- **Model API Platform:** https://z.ai/model-api
- **API Key Management:** https://z.ai/manage-apikey/apikey-list
- **Billing:** https://z.ai/manage-apikey/billing

## Migration from Hugging Face

If you were previously using Hugging Face:

1. **Get a Z.ai API key** from https://z.ai/model-api
2. **Add it in Settings** under the Z.ai provider
3. **Remove your Hugging Face key** (no longer supported)
4. **Select Z.ai models** from the model dropdown
5. **Start chatting** with GLM-4.7 or GLM-4.6V

The Z.ai models offer better performance for coding tasks compared to most Hugging Face models.

## Next Steps

1. ✅ Get your Z.ai API key
2. ✅ Add it to OS Athena Settings
3. ✅ Test the connection
4. ✅ Try GLM-4.7 for coding tasks
5. ✅ Try GLM-4.6V for multimodal tasks
6. ✅ Build amazing AI-powered applications!

For questions or issues, check the Z.ai documentation or the OS Athena repository.
