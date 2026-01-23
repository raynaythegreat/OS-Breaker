# Changelog

## [1.3.0] - 2026-01-22

### Major Update: Enhanced API Integration & Modernized UI

Comprehensive improvements to API testing, new AI providers, and enhanced user experience.

#### 🚀 API Integration Improvements:
- ✅ **Timeout Handling** - 5-8s timeouts for all API calls with proper error messages
- ✅ **Better Error Messages** - Clear messages for network errors, CORS issues, timeouts, and rate limits
- ✅ **API Key Validation** - Format validation before testing (prevents invalid requests)
- ✅ **Rate Limit Detection** - Specific handling for 429 status codes
- ✅ **Enhanced Error Formatting** - User-friendly error messages for all failure scenarios

#### 🤖 New AI Providers (3):
- ✅ **Mistral AI** - Mistral Large & Medium models
- ✅ **Cohere** - Command R+ and Command R with advanced RAG
- ✅ **Perplexity** - Sonar models with built-in web search (pplx- key format)

Total AI providers now: **9** (Claude, OpenAI, Groq, OpenRouter, Fireworks, Gemini, Mistral, Cohere, Perplexity)

#### 🔗 Custom Endpoints Enhancement:
- ✅ **Multiple Custom Endpoints** - Add unlimited custom API endpoints
- ✅ **Per-Endpoint Authentication** - Optional API key per endpoint
- ✅ **Named Endpoints** - Label each endpoint for easy identification
- ✅ **URL Validation** - Validates URL format before testing
- ✅ **Individual Testing** - Test each custom endpoint separately
- ✅ **Persistent Storage** - All custom endpoints saved to localStorage

#### 💬 Chat Interface Modernization:
- ✅ **Copy Code Button** - One-click copy for all code blocks with visual feedback
- ✅ **Timestamp Display** - Shows message time in 12-hour format
- ✅ **Improved Typing Indicator** - Animated "AI is thinking..." with bouncing dots
- ✅ **Better Code Highlighting** - Enhanced syntax highlighting with dark theme
- ✅ **Smooth Scrolling** - Auto-scroll to latest message with smooth animation

#### 🎨 Enhanced Title Bar:
- ✅ **Window Drag Support** - Drag window from title bar (WebkitAppRegion)
- ✅ **Maximize State Tracking** - Different icon for maximized/restored state
- ✅ **Button Hover Effects** - Scale and border animations on hover
- ✅ **Close Button Styling** - Red highlight on hover with smooth transition
- ✅ **Gradient Background** - Subtle gradient with backdrop blur
- ✅ **TypeScript Types** - Proper types for drag styles

#### 📦 Export/Import Features:
- ✅ **Export All as JSON** - Download complete chat history
- ✅ **Import from JSON** - Merge imported chats with existing history
- ✅ **Export Individual as Markdown** - Download single chat as .md file
- ✅ **Duplicate Prevention** - Prevents importing duplicate sessions
- ✅ **Click-Outside Handler** - Close export menu when clicking outside
- ✅ **Delete Confirmation** - Confirm before deleting chat sessions

#### 🎯 Model Selection System:
- ✅ **ModelSelector Component** - Dropdown for choosing AI models
- ✅ **18 Pre-configured Models** - All major models from 7 providers
- ✅ **Searchable Dropdown** - Filter models by name or provider
- ✅ **Grouped by Provider** - Models organized by AI provider
- ✅ **Visual Icons** - Provider-specific emoji icons
- ✅ **Model Descriptions** - Brief description for each model
- ✅ **Persistent Selection** - Remembers selected model per session

#### 🔧 Build & Technical:
- ✅ **Production Build Verified** - Clean build with no critical errors
- ✅ **TypeScript Fixes** - Resolved all TypeScript compilation errors
- ✅ **ESLint Warnings** - Only minor warnings remaining
- ✅ **Bundle Size Optimized** - 404 kB first load (87.5 kB shared)
- ✅ **Standalone Build** - Verified .next/standalone structure

#### 📊 Summary of Changes:
- **Files Modified:** 5 (apiTester.ts, SettingsPage.tsx, MessageList.tsx, TitleBar.tsx, HistoryPage.tsx)
- **Files Created:** 1 (ModelSelector.tsx)
- **New Features:** 12
- **Bug Fixes:** 7
- **Total AI Providers:** 9 → 12 (with 3 new)
- **Total Lines Changed:** ~1,500+

## [1.2.0] - 2026-01-22

### Major Release: Standalone Electron App with Flat Design

See full details at: https://github.com/raynaythegreat/OS-Athena/commit/80ae411

### Key Changes:
- ✅ Converted to standalone Electron app (no npm spawning)
- ✅ New flat design with bold gold accent (#FFC107)
- ✅ Removed menu bar for cleaner UI  
- ✅ Smart launcher with comprehensive logging
- ✅ Desktop integration installer for Linux
- ✅ Diagnostic tool for troubleshooting
- ✅ Fixed port 3456 (no more conflicts)
- ✅ Updated all UI components with consistent design

### Installation:
```bash
git clone https://github.com/raynaythegreat/OS-Athena.git
cd OS-Athena
npm install
npm run build
./electron/install-desktop-entry.sh
os-athena
```

See LAUNCH-GUIDE.md for complete documentation.

## [1.2.1] - 2026-01-22

### Settings Page Complete Overhaul

Major improvements to the Settings page with all API providers and modern layout.

#### New API Providers Added (6):
- ✅ **OpenRouter** - Access 100+ AI models
- ✅ **Fireworks AI** - Fast inference platform
- ✅ **Google Gemini** - Gemini Pro & Ultra
- ✅ **GitHub** - Repository management
- ✅ **Vercel** - One-click deployments  
- ✅ **Render** - Cloud deployment platform

#### Enhanced Features:
- **Auto-save Indicator** - Shows "Auto-saved" badge when keys are saved
- **Test & Save Buttons** - Automatically saves to localStorage before testing
- **Latency Display** - Shows connection speed for successful tests
- **Better Error States** - Distinguishes not_configured, error, and success
- **Security** - All keys stored locally, never sent to external servers

#### UI/UX Improvements:
- **3-Column Grid Layout** - Responsive grid for provider cards
- **Organized by Category:**
  - AI Providers (6 providers)
  - Deployment & Tools (3 providers)
  - Local Infrastructure (Ollama)
- **Visual Identification** - Emoji icons for each provider
- **Provider Descriptions** - Shows what each service offers
- **Status Color Coding:**
  - 🟢 Green: Success
  - 🟡 Yellow: Not configured
  - 🔴 Red: Error

#### Technical Improvements:
- Added test functions for all new providers
- TypeScript interfaces for type safety
- Category-based filtering and rendering
- "Test All Connections" button
- Password-type inputs for security
- Error handling for corrupted data

See full commit: https://github.com/raynaythegreat/OS-Athena/commit/20a79a7
