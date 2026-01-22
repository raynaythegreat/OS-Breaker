const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;
const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3000 : 3001;

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.svg');
  const iconExists = fs.existsSync(iconPath);

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
    ...(iconExists && { icon: iconPath }),
    backgroundColor: '#0a0a0f',
    title: 'OS Athena'
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  const rootDir = path.join(__dirname, '..');
  
  if (isDev) {
    nextProcess = spawn('npm', ['run', 'dev'], {
      cwd: rootDir,
      shell: true,
      stdio: 'inherit'
    });
  } else {
    nextProcess = spawn('npm', ['run', 'start'], {
      cwd: rootDir,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, PORT: PORT.toString() }
    });
  }

  nextProcess.on('error', (err) => {
    console.error('Failed to start Next.js:', err);
  });

  nextProcess.on('exit', (code) => {
    console.log(`Next.js process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  startNextServer();
  
  setTimeout(() => {
    createWindow();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
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
      console.error('Decryption failed:', error);
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
