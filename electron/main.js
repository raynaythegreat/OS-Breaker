const { app, BrowserWindow, ipcMain, safeStorage, dialog, shell } = require('electron');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const os = require('os');
const { exec, spawn } = require('child_process');
const http = require('http');
const ngrokWrapper = require('./ngrok-wrapper');

// Platform detection
const Platform = {
  isLinux: process.platform === 'linux',
  isMacOS: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  current: process.platform
};

let mainWindow;
let nextServer;
let serverReady = false;
let serverStartupTimeout = null;
const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3456;
const SERVER_STARTUP_TIMEOUT = 60000;
const SERVER_POLL_INTERVAL = 1000;

// File access state
let fileAccessEnabled = false;
let allowedDirectories = []; // Fixed port for the bundled app

// Port cleanup - kill any orphaned processes on port 3456 (platform-aware)
function cleanupPort() {
  return new Promise((resolve) => {
    let commands = [];

    if (Platform.isWindows) {
      // Windows: use netstat and taskkill
      commands = [
        `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /F /PID %a 2>nul || exit 0`
      ];
    } else {
      // Unix-like (Linux, macOS): use fuser, lsof, or pkill
      commands = [
        `fuser -k ${PORT}/tcp 2>/dev/null || true`,
        `lsof -ti:${PORT} | xargs -r kill -9 2>/dev/null || true`,
        `pkill -f "next-server" || true`,
        `pkill -f "node.*server.js" || true`
      ];
    }

    let completed = 0;
    commands.forEach(cmd => {
      exec(cmd, (err) => {
        if (err) {
          log(`Port cleanup command completed: ${cmd}`);
        } else {
          log(`Port cleanup executed: ${cmd}`);
        }
        completed++;
        if (completed === commands.length) {
          setTimeout(() => resolve(), 500);
        }
      });
    });

    // If no commands, resolve immediately
    if (commands.length === 0) {
      setTimeout(() => resolve(), 100);
    }
  });
}

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

  await cleanupPort();

  return new Promise(async (resolve, reject) => {
    const rootDir = path.join(__dirname, '..');

    serverStartupTimeout = setTimeout(() => {
      if (!serverReady) {
        log('Server startup timeout reached', 'ERROR');
        if (nextServer) {
          killServerProcess();
        }
        reject(new Error('Server startup timeout'));
      }
    }, SERVER_STARTUP_TIMEOUT);

    if (isDev) {
      log('Starting development server...');

      // Load API keys from secure storage
      const apiKeys = await loadDecryptedApiKeys();

      // Merge API keys into environment for Next.js server
      const serverEnv = {
        ...process.env,
        PORT: PORT.toString(),
        ...apiKeys
      };

      // Log loaded keys (without exposing values)
      const keyNames = Object.keys(apiKeys).filter(k => apiKeys[k]);
      if (keyNames.length > 0) {
        log(`Loaded ${keyNames.length} API keys: ${keyNames.join(', ')}`);
      } else {
        log('No API keys found in secure storage', 'WARN');
      }

      nextServer = spawn('npm', ['run', 'dev'], {
        cwd: rootDir,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: serverEnv
      });

      setupServerProcessHandlers(nextServer, resolve, reject);
    } else {
      const standaloneDir = path.join(rootDir, '.next', 'standalone');
      const serverPath = path.join(standaloneDir, 'server.js');

      log(`Looking for standalone server at: ${serverPath}`);

      if (!fsSync.existsSync(serverPath)) {
        const error = new Error('Standalone server not found. Run: npm run build');
        log(error.message, 'ERROR');
        if (serverStartupTimeout) {
          clearTimeout(serverStartupTimeout);
          serverStartupTimeout = null;
        }
        reject(error);
        return;
      }

      process.env.PORT = PORT.toString();
      process.env.HOSTNAME = 'localhost';

      log('Starting standalone server...');

      try {
        // Load API keys from secure storage
        const apiKeys = await loadDecryptedApiKeys();

        // Merge API keys into environment for Next.js server
        const serverEnv = {
          ...process.env,
          ...apiKeys
        };

        // Log loaded keys (without exposing values)
        const keyNames = Object.keys(apiKeys).filter(k => apiKeys[k]);
        if (keyNames.length > 0) {
          log(`Loaded ${keyNames.length} API keys: ${keyNames.join(', ')}`);
        } else {
          log('No API keys found in secure storage', 'WARN');
        }

        nextServer = spawn('node', [serverPath], {
          cwd: standaloneDir,
          env: serverEnv,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        setupServerProcessHandlers(nextServer, resolve, reject);
      } catch (err) {
        log(`Failed to start standalone server: ${err.message}`, 'ERROR');
        if (serverStartupTimeout) {
          clearTimeout(serverStartupTimeout);
          serverStartupTimeout = null;
        }
        reject(err);
      }
    }
  });
}

function setupServerProcessHandlers(server, resolve, reject) {
  let serverOutput = '';

  server.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;

    if (output.includes('Ready') || output.includes('started') || output.includes('listening')) {
      log(`Server ready message detected`);
    }

    if (output.trim()) {
      log(`Server stdout: ${output.trim()}`);
    }
  });

  server.stderr.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;

    if (output.includes('EADDRINUSE')) {
      log('Port already in use, cleaning up...', 'WARN');
      cleanupPort().then(() => {
        log('Port cleanup completed, but server already started', 'WARN');
      });
    }

    if (output.trim()) {
      log(`Server stderr: ${output.trim()}`, 'WARN');
    }
  });

  server.on('error', (err) => {
    log(`Server process error: ${err.message}`, 'ERROR');
    if (serverStartupTimeout) {
      clearTimeout(serverStartupTimeout);
      serverStartupTimeout = null;
    }
    reject(err);
  });

  server.on('exit', (code, signal) => {
    log(`Server process exited with code ${code}, signal ${signal}`);
    serverReady = false;
    if (serverStartupTimeout) {
      clearTimeout(serverStartupTimeout);
      serverStartupTimeout = null;
    }
  });

  waitForServer(resolve, reject);
}

function killServerProcess() {
  if (!nextServer) return;

  log('Killing server process...');

  try {
    if (nextServer.pid) {
      if (Platform.isWindows) {
        // Windows: use taskkill to kill child processes
        exec(`taskkill /F /PID ${nextServer.pid} 2>nul || true`);
        // Also try to kill any child node processes
        exec('taskkill /F /IM node.exe 2>nul || true', () => {});
      } else {
        // Unix-like: use pkill to kill child processes
        exec(`pkill -P ${nextServer.pid} 2>/dev/null || true`);
      }
      nextServer.kill('SIGTERM');
      setTimeout(() => {
        if (nextServer && !nextServer.killed) {
          if (Platform.isWindows) {
            exec(`taskkill /F /PID ${nextServer.pid} 2>nul || true`);
          }
          nextServer.kill('SIGKILL');
        }
      }, 2000);
    }
  } catch (err) {
    log(`Error killing server: ${err.message}`, 'WARN');
  }

  nextServer = null;
}

function waitForServer(resolve, reject, attempts = 0) {
  const maxAttempts = Math.floor(SERVER_STARTUP_TIMEOUT / SERVER_POLL_INTERVAL);

  http.get(`http://localhost:${PORT}`, (res) => {
    if (res.statusCode === 200 || res.statusCode === 404) {
      log(`Server is ready on port ${PORT} (attempt ${attempts + 1})`);
      serverReady = true;
      if (serverStartupTimeout) {
        clearTimeout(serverStartupTimeout);
        serverStartupTimeout = null;
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        log('Loading main application...');
        mainWindow.loadURL(`http://localhost:${PORT}`).then(() => {
          log('Main application loaded successfully');
        }).catch((err) => {
          log(`Failed to load main app: ${err.message}`, 'ERROR');
        });
      }

      resolve();
      return;
    }
    retryWait(resolve, reject, attempts, maxAttempts);
  }).on('error', (err) => {
    retryWait(resolve, reject, attempts, maxAttempts);
  });
}

function retryWait(resolve, reject, attempts, maxAttempts) {
  if (attempts >= maxAttempts) {
    log('Server failed to start within timeout', 'ERROR');
    serverReady = false;
    if (serverStartupTimeout) {
      clearTimeout(serverStartupTimeout);
      serverStartupTimeout = null;
    }
    reject(new Error(`Server startup timeout after ${SERVER_STARTUP_TIMEOUT}ms`));
    return;
  }

  log(`Waiting for server... attempt ${attempts + 1}/${maxAttempts}`);
  setTimeout(() => waitForServer(resolve, reject, attempts + 1), SERVER_POLL_INTERVAL);
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
     // ==================================================
  // Phase 1b: CLI Installation Verification
  // ==================================================
  try {
    log("Checking CLI installations...");
    const { exec } = require("child_process");
    const util = require("util");
    const execAsync = util.promisify(exec);
    
    // Check if CLIs are installed
    const checkCLI = async (name, command) => {
      try {
        await execAsync(`${command} --version`);
        log(`${name} CLI: installed ✓`);
        return true;
      } catch (err) {
        log(`${name} CLI: not installed`, "WARN");
        return false;
      }
    };
    
    const [ngrokInstalled, vercelInstalled, ghInstalled] = await Promise.all([
      checkCLI("ngrok", "ngrok"),
      checkCLI("vercel", "vercel"),
      checkCLI("GitHub", "gh")
    ]);
    
    // If any CLI is missing, note for user
    if (!ngrokInstalled || !vercelInstalled || !ghInstalled) {
      log("Some CLIs are not installed globally. They should be installed via npm dependencies.", "WARN");
    }
  } catch (cliError) {
    log(`CLI check failed: ${cliError.message}`, "WARN");
  }

  // ==================================================
  // Phase 1: Auto-Start Ngrok CLI Agent
  // ==================================================
  try {
    log('Initializing ngrok tunnel auto-start...');

    // Try to get API key from encrypted storage
    let ngrokApiKey;
    try {
      const encryptedKeys = await loadEncryptedKeys();
      if (encryptedKeys['NGROK_API_KEY']) {
        // Decrypt the key using safeStorage
        if (safeStorage.isEncryptionAvailable()) {
          const buffer = Buffer.from(encryptedKeys['NGROK_API_KEY'], 'base64');
          ngrokApiKey = safeStorage.decryptString(buffer);
          log('Retrieved ngrok API key from secure storage');
        }
      }
    } catch (keyError) {
      log(`Could not retrieve ngrok API key: ${keyError.message}`, 'WARN');
    }

    // Check if ngrok is installed
    const isInstalled = await ngrokWrapper.isNgrokInstalled();
    if (!isInstalled) {
      log('Ngrok CLI not found. Auto-start skipped - install ngrok to enable mobile deployment', 'WARN');
    } else {
      // Auto-start ngrok tunnel
      const ngrokResult = await ngrokWrapper.startNgrokTunnel(3456, ngrokApiKey, {
        timeout: 20000,
        logFunction: (msg) => log(`ngrok: ${msg}`)
      });

      if (ngrokResult.success && ngrokResult.publicUrl) {
        log(`✓ ngrok tunnel active: ${ngrokResult.publicUrl}`);
        if (ngrokResult.pid) {
          // Store PID for cleanup
          global.ngrokPid = ngrokResult.pid;
        }
      } else if (ngrokResult.error) {
        log(`ngrok auto-start failed: ${ngrokResult.error}`, 'WARN');
        log('App will continue without ngrok - you can start it manually from Settings', 'WARN');
      }
    }
  } catch (ngrokError) {
    log(`ngrok initialization error: ${ngrokError.message}`, 'WARN');
    log('App will continue without ngrok tunnel', 'WARN');
  }

  // ==================================================
  // Phase 2: Mobile Tunnel Activation (handled by API)
  // ==================================================
  // Mobile tunnel activation is now handled by the API routes
  // when user deploys from the Mobile page
  log('Mobile tunnel activation ready - deploy from Mobile page when needed', 'INFO');

  try {
    await startNextServer();
    log('Next.js server is ready, creating window...');
    createWindow();

    // Initialize auto-updater
    try {
      const { checkForUpdates } = require('./autoUpdater');
      checkForUpdates(mainWindow);
      log('Auto-updater initialized');
    } catch (updateError) {
      log(`Failed to initialize auto-updater: ${updateError.message}`, 'WARN');
    }
  } catch (error) {
    log(`Failed to start application: ${error.message}`, 'ERROR');
    log(`Stack trace: ${error.stack}`, 'ERROR');

    killServerProcess();
    await cleanupPort();

    const { dialog } = require('electron');
    dialog.showErrorBox(
      'OS Athena Failed to Start',
      `Error: ${error.message}\n\nCheck logs at:\n${logFile}\n\nTry closing any existing instances and restarting.`
    );

    setTimeout(() => {
      app.quit();
    }, 2000);
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

app.on('before-quit', async () => {
  log('App quitting...');
  serverReady = false;
  if (serverStartupTimeout) {
    clearTimeout(serverStartupTimeout);
    serverStartupTimeout = null;
  }

  // Kill ngrok tunnel if running
  if (global.ngrokPid) {
    try {
      await ngrokWrapper.stopNgrokTunnel(global.ngrokPid);
      log('Ngrok tunnel stopped', 'INFO');
    } catch (err) {
      log(`Failed to stop ngrok: ${err.message}`, 'WARN');
    }
  }

  killServerProcess();
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

  // Load and decrypt API keys for passing to Next.js server
  async function loadDecryptedApiKeys() {
    try {
      const encryptedKeys = await loadEncryptedKeys();
      const decryptedKeys = {};

      for (const [key, value] of Object.entries(encryptedKeys)) {
        if (safeStorage.isEncryptionAvailable()) {
          try {
            const buffer = Buffer.from(value, 'base64');
            decryptedKeys[key] = safeStorage.decryptString(buffer);
          } catch (decryptError) {
            log(`Failed to decrypt key ${key}: ${decryptError.message}`, 'WARN');
          }
        }
      }

      return decryptedKeys;
    } catch (error) {
      log(`Failed to load API keys: ${error.message}`, 'ERROR');
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

  // Open external URL in default browser
  ipcMain.handle('open-external-url', async (event, url) => {
    try {
      log(`Opening external URL: ${url}`);

      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL');
      }

      // Only allow http/https URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      await shell.openExternal(url);
      log(`Successfully opened URL: ${url}`);
      return { success: true };
    } catch (error) {
      log(`Failed to open external URL: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  });
