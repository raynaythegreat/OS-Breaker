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
    frame: false, // Custom frame for themed titlebar
    titleBarStyle: 'hidden', // Hide default title bar
    transparent: false // Not transparent for better performance
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
