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
  
  console.log('User data path:', userDataPath);
  console.log('First run file path:', firstRunFile);
  
  if (!fs.existsSync(firstRunFile)) {
    // First run detected
    console.log('First run detected');
    return true;
  }
  
  console.log('Not first run - desktop integration already done');
  return false;
}

function markFirstRunComplete() {
  const userDataPath = app.getPath('userData');
  const firstRunFile = path.join(userDataPath, '.first-run');
  
  try {
    // Ensure directory exists
    const userDataDir = path.dirname(firstRunFile);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    fs.writeFileSync(firstRunFile, 'completed');
    console.log('First run marked as complete at:', firstRunFile);
  } catch (error) {
    console.error('Failed to mark first run complete:', error);
  }
}

function installToApplications() {
  const appPath = app.getAppPath();
  console.log('Checking app path for desktop integration:', appPath);
  console.log('Is dev mode:', isDev);
  
  // Always try to create desktop entry in Linux, even in dev
  if (process.platform === 'linux') {
    console.log('Linux detected - proceeding with desktop integration');
  } else {
    // Check if already properly installed for other platforms
    const isInstalled = fs.existsSync(path.join(appPath, 'resources', 'app.asar')) && 
                       !appPath.includes('node_modules') && 
                       !isDev;

    if (isInstalled) {
      console.log('Already installed app detected - skipping desktop integration');
      return;
    }

    // For development on non-Linux, show a notification instead of installing
    if (isDev) {
      console.log('Development mode detected on non-Linux - skipping desktop integration');
      return;
    }
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
    let execPath;
    
    if (process.env.APPIMAGE) {
      // For AppImage, use the AppImage itself
      execPath = process.env.APPIMAGE;
    } else if (appPath.includes('AppImage')) {
      // Fallback for AppImage
      execPath = appPath;
    } else if (fs.existsSync('/usr/local/bin/os-athena')) {
      // If installed locally in /usr/local/bin
      execPath = '/usr/local/bin/os-athena';
    } else if (fs.existsSync('/usr/bin/os-athena')) {
      // If installed system-wide in /usr/bin
      execPath = '/usr/bin/os-athena';
    } else {
      // For development or local build - use npm script
      const packagePath = path.join(appPath, 'package.json');
      if (fs.existsSync(packagePath)) {
        execPath = `cd "${appPath}" && npm start`;
      } else {
        execPath = path.join(appPath, 'os-athena');
      }
    }
    
    // Find icon in multiple possible locations
    const possibleIconPaths = [
      path.join(__dirname, '../assets/icon.png'),
      path.join(appPath, '../assets/icon.png'),
      path.join(appPath, 'assets/icon.png'),
      '/usr/share/pixmaps/os-athena.png'
    ];
    
    let iconPath = possibleIconPaths.find(path => fs.existsSync(path)) || possibleIconPaths[0];
    
    const desktopEntry = `[Desktop Entry]
Version=1.0
Type=Application
Name=OS Athena
Comment=AI Assistant for Web Development
Exec="${execPath}"
Icon=${iconPath}
Terminal=false
Categories=Development;
StartupNotify=true
NoDisplay=false;
`;
    
    // Create in both user applications and desktop for better visibility
    const locations = [
      path.join(app.getPath('home'), '.local', 'share', 'applications'),
      path.join(app.getPath('home'), 'Desktop')
    ];
    
    for (const location of locations) {
      const desktopPath = path.join(location, 'os-athena.desktop');
      
      try {
        if (!fs.existsSync(location)) {
          fs.mkdirSync(location, { recursive: true });
        }
        
        fs.writeFileSync(desktopPath, desktopEntry);
        fs.chmodSync(desktopPath, '755');
        console.log(`Desktop entry created at: ${desktopPath}`);
        
        // Update desktop database
        exec('update-desktop-database ' + location, (error) => {
          if (error) {
            console.warn('Failed to update desktop database:', error.message);
          }
        });
        
      } catch (error) {
        console.error(`Failed to create desktop entry at ${location}:`, error.message);
      }
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

ipcMain.handle('create-desktop-entry', async (event) => {
  console.log('Manual desktop entry creation requested');
  try {
    installToApplications();
    return { success: true, message: 'Desktop entry created successfully' };
  } catch (error) {
    console.error('Manual desktop entry creation failed:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', async (event, name) => {
  return app.getPath(name);
});
