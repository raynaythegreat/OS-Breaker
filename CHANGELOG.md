# Changelog

## [1.2.0] - 2026-01-22

### Major Release: Standalone Electron App with Flat Design

See full details at: https://github.com/raynaythegreat/OS-Breaker/commit/80ae411

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
