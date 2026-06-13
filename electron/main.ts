import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.join(app.getPath('userData'), 'db.json');

// Initialize DB if not exists
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ subscriptions: [], watchProgress: {} }));
}

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Necessary to bypass CORS for YouTube RSS if fetched directly, though we'll use IPC
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f0f0f' // Dark aesthetic
  });

  // Enable adblocker
  try {
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    blocker.enableBlockingInSession(mainWindow.webContents.session);
    console.log('Adblocker enabled!');
  } catch (err) {
    console.error('Failed to initialize adblocker', err);
  }

  // Intercept requests to force HD on youtube embeds by appending vq=hd1080 (legacy but sometimes helps)
  // or blocking specific scripts if needed. Ghostery handles most ads.
  
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

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

app.on('before-quit', async (e) => {
  // Clear cache to prevent large storage usage
  if (session.defaultSession) {
    try {
      await session.defaultSession.clearCache();
      console.log('Cache cleared successfully on exit.');
    } catch (err) {
      console.error('Failed to clear cache', err);
    }
  }
});

// IPC Handlers
ipcMain.handle('get-db', () => {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
});

ipcMain.handle('save-db', (event, data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  return true;
});

// Proxy fetch to bypass CORS for RSS
ipcMain.handle('fetch-rss', async (event, url) => {
  try {
    const response = await fetch(url);
    const text = await response.text();
    return text;
  } catch (error: any) {
    console.error('Error fetching RSS:', error);
    return null;
  }
});
