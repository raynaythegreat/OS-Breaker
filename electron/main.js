const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

let mainWindow;
let nextProcess;
const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? 3000 : 3001;

function createWindow() {
  // Try multiple icon formats for better compatibility
  const iconFormats = ['png', 'ico', 'icns'];
  let iconPath = null;
  
  for (const format of iconFormats) {
    const testPath = path.join(__dirname, '../assets/icon.' + format);
    if (fs.existsSync(testPath)) {
      iconPath = testPath;
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

function checkFirstRun() {
  const userDataPath = app.getPath('userData');
  const firstRunFile = path.join(userDataPath, '.first-run');
  
  if (!fs.existsSync(firstRunFile)) {
    // First run detected
    return true;
  }
  
  return false;
}

function markFirstRunComplete() {
  const userDataPath = app.getPath('userData');
  const firstRunFile = path.join(userDataPath, '.first-run');
  fs.writeFileSync(firstRunFile, 'completed');
}

function installToApplications() {
  const appPath = app.getAppPath();
  const isInstalled = fs.existsSync(path.join(appPath, 'resources', 'app.asar')) || 
                     !appPath.includes('node_modules');

  if (isInstalled) {
    // Already installed, skip
    return;
  }

  // For development, show a notification instead of installing
  if (isDev) {
    console.log('Development mode detected - skipping desktop integration');
    return;
  }

  // Install to Applications folder on macOS and Linux
  if (process.platform === 'darwin') {
    exec('osascript -e \'tell application "Finder" to make alias POSIX file "' + 
          appPath + '" at POSIX file "/Applications/" with properties {name:"OS Athena"}\'', 
          (error) => {
      if (!error) {
        console.log('Application alias created in Applications folder');
      } else {
        console.error('Failed to create Applications alias:', error.message);
      }
    });
  } else if (process.platform === 'linux') {
    // For Linux, create desktop entry
    const execPath = appPath.includes('AppImage') ? appPath : path.join(appPath, 'os-athena');
    const iconPath = path.join(__dirname, '../assets/icon.png');
    
    const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=OS Athena
Comment=AI Assistant for Web Development
Exec=${execPath}
Icon=${iconPath}
Terminal=false
Categories=Development;
StartupNotify=true`;
    
    const desktopDir = path.join(app.getPath('home'), '.local', 'share', 'applications');
    const desktopPath = path.join(desktopDir, 'os-athena.desktop');
    
    try {
      if (!fs.existsSync(desktopDir)) {
        fs.mkdirSync(desktopDir, { recursive: true });
      }
      
      fs.writeFileSync(desktopPath, desktopEntry);
      fs.chmodSync(desktopPath, '755');
      console.log('Desktop entry created successfully');
    } catch (error) {
      console.error('Failed to create desktop entry:', error.message);
    }
  } else if (process.platform === 'win32') {
    // Windows is handled by the NSIS installer
    console.log('Windows desktop integration handled by installer');
  }
}

app.whenReady().then(() => {
  const isFirstRun = checkFirstRun();
  
  if (isFirstRun) {
    installToApplications();
    markFirstRunComplete();
  }
  
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
