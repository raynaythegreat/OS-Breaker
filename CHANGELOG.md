# Changelog

All notable changes to OS Athena will be documented in this file.

## [1.2.0] - 2026-01-22

### Added
- **Automatic Desktop Integration**: Application now automatically installs to system menu on first run
  - macOS: Creates application alias in Applications folder
  - Linux: Creates desktop entry in applications menu
  - Windows: Handled by installer MSI package
  - Skip installation in development mode
  - First run tracking to prevent repeated installations

### Improved
- **UI Polish**: Refined color scheme and button designs
  - Consistent gold theme throughout application
  - Smaller, cleaner button designs
  - Fixed settings page scrolling issues
  - Enhanced dropdown menu styling

## [1.1.0] - 2026-01-12

### Added
- **Ollama Retry/Refresh Button**: Added a retry connection button when Ollama is offline or models fail to load
  - Appears in warning banners when Ollama connection fails
  - Allows users to retry without refreshing the page
  - Shows loading state while retrying

- **API Usage Tracking**: New comprehensive API usage tracking system
  - Tracks usage per provider (Claude, OpenAI, OpenRouter, Ollama)
  - Shows daily, weekly, and monthly usage statistics
  - Color-coded progress indicators (green/amber/red based on limits)
  - Persistent storage across sessions
  - Expandable panel showing all providers' usage
  - Provider-specific limit information and notes
  - Last request timestamp for each provider
  - Reset functionality to clear usage history

- **API Usage Display Component**: New compact usage indicator in the chat interface
  - Shows current provider usage in the top bar
  - Mobile-optimized banner display
  - Expandable detailed panel with all providers

### Changed
- Improved Ollama error handling with actionable retry options
- Better mobile responsiveness for new features
- Added scale-in animation for dropdown panels

### Technical
- New `ApiUsageContext` for centralized usage tracking
- New `ApiUsageDisplay` component with compact and expanded views
- Usage data persisted to localStorage with 30-day retention
- Automatic cleanup of old usage records

## [1.0.0] - Initial Release

### Features
- AI-powered chat interface with multiple model support
- GitHub repository integration (browse, commit, deploy)
- Vercel deployment with auto-retry strategies
- Multi-provider support: Claude, OpenAI, OpenRouter, Ollama
- Chat history with session management
- File attachments (images and text files)
- Dark mode support
- Mobile-responsive design
