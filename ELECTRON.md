# OS Athena Electron Application

OS Athena is built with Next.js and packaged as a desktop application using Electron.

## Project Structure

- `electron/main.js`: Main process entry point.
- `electron/preload.js`: Preload script for safe IPC.
- `electron-builder.yml`: Configuration for building executables.

## Build and Run

### Development
```bash
npm run electron:dev
```

### Production Build (Linux)
```bash
npm run electron:build
```

The build will generate an AppImage and a deb package in the `dist` directory.

#### Running the AppImage:
1. `cd dist`
2. Make it executable: `chmod +x OS-Athena-x.x.x-x86_64.AppImage`
3. Run it: `./OS-Athena-x.x.x-x86_64.AppImage`

## Configuration

Next.js is served by a background process in Electron. The app automatically manages port allocation.
Environment variables are loaded from `.env.local` if present.