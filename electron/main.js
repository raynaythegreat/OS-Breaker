const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const http = require('http');

let mainWindow;
let nextServer;
const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3456; // Fixed port for the bundled app

// Logging setup
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

function setupLogging() {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create log directory:', err);
  }
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  try {
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

function createWindow() {
  log('Creating main window...');

  const iconFormats = ['png', 'ico', 'icns'];
  let iconPath = null;

  for (const format of iconFormats) {
    const testPath = path.join(__dirname, '../assets/icon.' + format);
    if (fs.existsSync(testPath)) {
      iconPath = testPath;
      log(`Using icon: ${iconPath}`);
      break;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    ...(iconPath && { icon: iconPath }),
    backgroundColor: '#0a0a0f',
    title: 'OS Athena',
    show: false, // Don't show until ready
    autoHideMenuBar: true, // Hide menu bar (can be shown with Alt key)
    frame: true // Keep window frame
  });

  // Remove application menu completely for cleaner UI
  mainWindow.setMenu(null);

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    log('Window ready, showing...');
    mainWindow.show();
  });

  // Error handling for load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Failed to load: ${errorCode} - ${errorDescription}`, 'ERROR');
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    log('Main window closed');
    mainWindow = null;
  });
}

async function startNextServer() {
  log('Starting Next.js server...');

  return new Promise((resolve, reject) => {
    const rootDir = path.join(__dirname, '..');

    if (isDev) {
      log('Starting development server...');
      const { spawn } = require('child_process');
      nextServer = spawn('npm', ['run', 'dev'], {
        cwd: rootDir,
        shell: true,
        stdio: 'inherit',
        env: { ...process.env, PORT: PORT.toString() }
      });

      nextServer.on('error', (err) => {
        log(`Failed to start dev server: ${err.message}`, 'ERROR');
        reject(err);
      });

      waitForServer(resolve, reject);
    } else {
      const standaloneDir = path.join(rootDir, '.next', 'standalone');
      const serverPath = path.join(standaloneDir, 'server.js');

      log(`Looking for standalone server at: ${serverPath}`);

      if (!fs.existsSync(serverPath)) {
        const error = new Error('Standalone server not found. Run: npm run build');
        log(error.message, 'ERROR');
        reject(error);
        return;
      }

      process.env.PORT = PORT.toString();
      process.env.HOSTNAME = 'localhost';

      log('Starting standalone server...');

      try {
        // Start the standalone server in background
        const { spawn } = require('child_process');
        nextServer = spawn('node', [serverPath], {
          cwd: standaloneDir,
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        nextServer.stdout.on('data', (data) => {
          log(`Server: ${data.toString().trim()}`);
        });

        nextServer.stderr.on('data', (data) => {
          log(`Server Error: ${data.toString().trim()}`, 'WARN');
        });

        nextServer.on('error', (err) => {
          log(`Server process error: ${err.message}`, 'ERROR');
          reject(err);
        });

        waitForServer(resolve, reject);
      } catch (err) {
        log(`Failed to start standalone server: ${err.message}`, 'ERROR');
        reject(err);
      }
    }
  });
}

function waitForServer(resolve, reject, attempts = 0) {
  const maxAttempts = 30;

  http.get(`http://localhost:${PORT}`, (res) => {
    log(`Server is ready on port ${PORT} (attempt ${attempts + 1})`);
    resolve();
  }).on('error', (err) => {
    if (attempts >= maxAttempts) {
      log('Server failed to start within timeout', 'ERROR');
      reject(new Error('Server startup timeout'));
      return;
    }

    setTimeout(() => waitForServer(resolve, reject, attempts + 1), 1000);
  });
}

function checkFirstRun() {
  const userDataPath = app.getPath('userData');
  const firstRunFile = path.join(userDataPath, '.first-run');

  log(`Checking first run: ${firstRunFile}`);

  if (!fs.existsSync(firstRunFile)) {
    log('First run detected');
    return true;
  }

  log('Not first run');
  return false;
}

function markFirstRunComplete() {
  const userDataPath = app.getPath('userData');
  const firstRunFile = path.join(userDataPath, '.first-run');

  try {
    const userDataDir = path.dirname(firstRunFile);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    fs.writeFileSync(firstRunFile, JSON.stringify({
      completedAt: new Date().toISOString(),
      version: app.getVersion()
    }));
    log('First run marked as complete');
  } catch (error) {
    log(`Failed to mark first run complete: ${error.message}`, 'ERROR');
  }
}

// Desktop integration is now handled by electron/install-desktop-entry.sh
// Run that script manually or during installation to set up desktop integration

app.whenReady().then(async () => {
  setupLogging();
  log('=================================================');
  log('OS Athena Starting');
  log(`Version: ${app.getVersion()}`);
  log(`Node: ${process.version}`);
  log(`Electron: ${process.versions.electron}`);
  log(`Platform: ${process.platform}`);
  log(`Mode: ${isDev ? 'development' : 'production'}`);
  log('=================================================');

  const isFirstRun = checkFirstRun();
  if (isFirstRun) {
    markFirstRunComplete();
  }

  try {
    await startNextServer();
    log('Next.js server is ready, creating window...');
    createWindow();
  } catch (error) {
    log(`Failed to start application: ${error.message}`, 'ERROR');

    const { dialog } = require('electron');
    dialog.showErrorBox(
      'OS Athena Failed to Start',
      `Error: ${error.message}\n\nCheck logs at:\n${logFile}`
    );

    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App quitting...');
  if (nextServer && nextServer.kill) {
    log('Stopping Next.js server...');
    nextServer.kill();
  }
});

app.on('will-quit', () => {
  log('App will quit');
  log('=================================================');
});

ipcMain.handle('encrypt-value', async (event, value) => {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64');
  }
  return value;
});

ipcMain.handle('decrypt-value', async (event, encryptedValue) => {
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(encryptedValue, 'base64');
      return safeStorage.decryptString(buffer);
    } catch (error) {
      log(`Decryption failed: ${error.message}`, 'ERROR');
      return null;
    }
  }
  return encryptedValue;
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', async (event, name) => {
  return app.getPath(name);
});

ipcMain.handle('get-logs-path', async () => {
  return logFile;
});
