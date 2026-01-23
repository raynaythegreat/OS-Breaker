const { app, BrowserWindow, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const os = require('os');
const { exec } = require('child_process');
const http = require('http');

let mainWindow;
let nextServer;
const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3456;

// File access state
let fileAccessEnabled = false;
let allowedDirectories = []; // Fixed port for the bundled app

// Logging setup
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

function setupLogging() {
  try {
    if (!fsSync.existsSync(logDir)) {
      fsSync.mkdirSync(logDir, { recursive: true });
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
    fsSync.appendFileSync(logFile, logMessage + '\n');
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
    if (fsSync.existsSync(testPath)) {
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
    x: undefined,
    y: undefined,
    backgroundColor: '#0a0a0f',
    show: true, // Show immediately to prevent black screen appearance
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      backgroundThrottling: false, // Prevent throttling when window is in background
      // Updated CSP to be more permissive for development/Next.js
      contentSecurityPolicy: "default-src 'self' http://localhost:* https://*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: http://localhost:* https://*; connect-src 'self' http://localhost:* https://*;"
    },
    ...(iconPath && { icon: iconPath }),
    title: 'OS Athena',
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: false
  });


  // Remove application menu completely for cleaner UI
  mainWindow.setMenu(null);

  // Load loading page first, then switch to actual app when server is ready
  const loadingPage = `file://${path.join(__dirname, 'loading.html')}`;
  mainWindow.loadFile(path.join(__dirname, 'loading.html')).then(() => {
    log('Loading page displayed');
  }).catch((err) => {
    log(`Failed to load loading page: ${err.message}`, 'WARN');
    // Fallback: try to load the main URL directly
    mainWindow.loadURL(`http://localhost:${PORT}`);
  });

  // Window is already shown, just log when content is ready
  mainWindow.once('ready-to-show', () => {
    log('Window content ready');
  });

  // Error handling for load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`Failed to load: ${errorCode} - ${errorDescription}`, 'ERROR');
  });

  // DevTools can be opened with Ctrl+Shift+I or F12 if needed
  // Uncomment the line below to auto-open DevTools in development:
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }

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

      if (!fsSync.existsSync(serverPath)) {
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

    // Server is ready, navigate to the actual app
    if (mainWindow && !mainWindow.isDestroyed()) {
      log('Loading main application...');
      mainWindow.loadURL(`http://localhost:${PORT}`).then(() => {
        log('Main application loaded successfully');
      }).catch((err) => {
        log(`Failed to load main app: ${err.message}`, 'ERROR');
      });
    }

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

  if (!fsSync.existsSync(firstRunFile)) {
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
    if (!fsSync.existsSync(userDataDir)) {
      fsSync.mkdirSync(userDataDir, { recursive: true });
    }

    fsSync.writeFileSync(firstRunFile, JSON.stringify({
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

// Fix GPU crash and window issues
app.disableHardwareAcceleration();

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

ipcMain.handle('window-minimize', async () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', async () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

  ipcMain.handle('window-close', async () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // File access handlers
  ipcMain.handle('get-file-access-status', async () => {
    return {
      enabled: fileAccessEnabled,
      directories: allowedDirectories
    };
  });

  ipcMain.handle('toggle-file-access', async (event, enabled) => {
    fileAccessEnabled = enabled;
    allowedDirectories = enabled ? [os.homedir()] : [];
    log(`File access ${enabled ? 'enabled' : 'disabled'}`);
    return { success: true, enabled };
  });

  ipcMain.handle('read-file', async (event, filePath) => {
    if (!fileAccessEnabled) {
      throw new Error('File access is disabled. Please enable it in Settings.');
    }

    const isAllowed = await validatePath(filePath);
    if (!isAllowed) {
      throw new Error('Access denied: Path is not in allowed directory');
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      log(`Read file: ${filePath}`);
      return { success: true, content };
    } catch (error) {
      log(`Failed to read file ${filePath}: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('write-file', async (event, { path: filePath, content }) => {
    if (!fileAccessEnabled) {
      throw new Error('File access is disabled. Please enable it in Settings.');
    }

    const isAllowed = await validatePath(filePath);
    if (!isAllowed) {
      throw new Error('Access denied: Path is not in allowed directory');
    }

    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf-8');
      log(`Wrote file: ${filePath}`);
      return { success: true };
    } catch (error) {
      log(`Failed to write file ${filePath}: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('list-directory', async (event, dirPath) => {
    if (!fileAccessEnabled) {
      throw new Error('File access is disabled. Please enable it in Settings.');
    }

    const isAllowed = await validatePath(dirPath);
    if (!isAllowed) {
      throw new Error('Access denied: Path is not in allowed directory');
    }

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      log(`Listed directory: ${dirPath}`);
      return { success: true, files };
    } catch (error) {
      log(`Failed to list directory ${dirPath}: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-file-stats', async (event, filePath) => {
    if (!fileAccessEnabled) {
      throw new Error('File access is disabled. Please enable it in Settings.');
    }

    const isAllowed = await validatePath(filePath);
    if (!isAllowed) {
      throw new Error('Access denied: Path is not in allowed directory');
    }

    try {
      const stats = await fs.stat(filePath);
      return { success: true, stats };
    } catch (error) {
      log(`Failed to get stats for ${filePath}: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('select-directory', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Directory for File Access'
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, error: 'Selection canceled' };
      }

      const selectedPath = result.filePaths[0];
      allowedDirectories = [selectedPath];
      fileAccessEnabled = true;
      
      log(`Selected directory: ${selectedPath}`);
      
      return { success: true, path: selectedPath };
    } catch (error) {
      log(`Failed to select directory: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  });

  async function validatePath(filePath) {
    const normalizedPath = path.normalize(filePath);
    
    for (const allowedDir of allowedDirectories) {
      const normalizedAllowed = path.normalize(allowedDir);
      const relativePath = path.relative(normalizedAllowed, normalizedPath);
      
      if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        return true;
      }
    }
    
    return false;
  }

  const keysFilePath = path.join(app.getPath('userData'), 'encrypted-keys.json');

  async function loadEncryptedKeys() {
    try {
      if (fsSync.existsSync(keysFilePath)) {
        const encryptedData = await fs.readFile(keysFilePath, 'utf-8');
        return JSON.parse(encryptedData);
      }
      return {};
    } catch (error) {
      log(`Failed to load encrypted keys: ${error.message}`, 'ERROR');
      return {};
    }
  }

  async function saveEncryptedKeys(keys) {
    try {
      await fs.writeFile(keysFilePath, JSON.stringify(keys, null, 2), 'utf-8');
      log('Encrypted keys saved');
      return { success: true };
    } catch (error) {
      log(`Failed to save encrypted keys: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  }

  ipcMain.handle('api-keys:get', async () => {
    const encryptedKeys = await loadEncryptedKeys();
    const decryptedKeys = {};

    for (const [key, value] of Object.entries(encryptedKeys)) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(value, 'base64');
          decryptedKeys[key] = safeStorage.decryptString(buffer);
        } catch (error) {
          log(`Failed to decrypt key ${key}: ${error.message}`, 'ERROR');
        }
      } else {
        decryptedKeys[key] = value;
      }
    }

    return { success: true, keys: decryptedKeys };
  });

  ipcMain.handle('api-keys:set', async (event, keys) => {
    const encryptedKeys = {};
    const existingKeys = await loadEncryptedKeys();

    for (const [key, value] of Object.entries(keys)) {
      if (safeStorage.isEncryptionAvailable()) {
        encryptedKeys[key] = safeStorage.encryptString(value).toString('base64');
      } else {
        encryptedKeys[key] = value;
      }
      log(`Encrypted key: ${key}`);
    }

    await saveEncryptedKeys({ ...existingKeys, ...encryptedKeys });
    return { success: true };
  });

  ipcMain.handle('api-keys:delete', async (event, keyNames) => {
    const existingKeys = await loadEncryptedKeys();
    
    for (const key of keyNames) {
      delete existingKeys[key];
      log(`Deleted key: ${key}`);
    }

    await saveEncryptedKeys(existingKeys);
    return { success: true };
  });

  ipcMain.handle('api-keys:get-status', async () => {
    const encryptedKeys = await loadEncryptedKeys();
    const status = {};

    for (const key of Object.keys(encryptedKeys)) {
      status[key] = true;
    }

    return { success: true, status };
  });
