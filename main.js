'use strict';
const { app, BrowserWindow, WebContentsView, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- Config ---------------------------------------------------------------
const START_URL = process.env.PROTON_URL || 'https://mail.proton.me';
const TOPBAR_HEIGHT = 36;
const BG = '#0e0d12';
const INTERNAL_HOSTS = /(^|\.)proton\.(me|ch)$/i;
const ZOOM_STEP = 0.5;

// ---- Single instance ------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;
let content = null;

// ---- Tiny window-state persistence ---------------------------------------
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return {}; }
}
function saveState() {
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.isMaximized() || win.isFullScreen() ? (win._lastNormal || win.getNormalBounds()) : win.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch { /* ignore */ }
}

function layout() {
  if (!win || win.isDestroyed() || !content) return;
  const [w, h] = win.getContentSize();
  content.setBounds({ x: 0, y: TOPBAR_HEIGHT, width: w, height: Math.max(0, h - TOPBAR_HEIGHT) });
}

function isInternal(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && INTERNAL_HOSTS.test(u.hostname);
  } catch { return false; }
}

function openExternal(url) {
  try {
    const u = new URL(url);
    if (['http:', 'https:', 'mailto:'].includes(u.protocol)) shell.openExternal(url);
  } catch { /* ignore */ }
}

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    width: st.width || 1280,
    height: st.height || 820,
    x: st.x,
    y: st.y,
    minWidth: 720,
    minHeight: 480,
    frame: false,
    show: false,
    backgroundColor: BG,
    title: 'Proton Mail',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Top bar = the window's own (local) page.
  win.loadFile(path.join(__dirname, 'renderer', 'topbar.html'));

  // Proton Mail lives in a child view below the bar.
  content = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'content-preload.js'),
      nodeIntegrationInSubFrames: true, // so the scrollbar style also reaches iframes
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      partition: 'persist:proton',
      spellcheck: true,
    },
  });
  content.setBackgroundColor(BG);
  win.contentView.addChildView(content);
  layout();
  content.webContents.loadURL(START_URL);

  const wc = content.webContents;

  // Links: Proton pages open in-app, everything else in the system browser.
  wc.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: BG } };
    }
    openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!isInternal(url)) { e.preventDefault(); openExternal(url); }
  });

  // Keyboard shortcuts (there is no menu bar).
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const mod = input.control || input.meta;
    const k = input.key;
    if (k === 'F11') { e.preventDefault(); toggleFullscreen(); }
    else if (mod && (k === 'r' || k === 'R')) { e.preventDefault(); input.shift ? wc.reloadIgnoringCache() : wc.reload(); }
    else if (mod && (k === '=' || k === '+')) { e.preventDefault(); wc.setZoomLevel(wc.getZoomLevel() + ZOOM_STEP); }
    else if (mod && k === '-') { e.preventDefault(); wc.setZoomLevel(wc.getZoomLevel() - ZOOM_STEP); }
    else if (mod && k === '0') { e.preventDefault(); wc.setZoomLevel(0); }
    else if (k === 'Escape' && win.isFullScreen()) { e.preventDefault(); win.setFullScreen(false); }
  });

  win.once('ready-to-show', () => {
    if (st.maximized) win.maximize();
    win.show();
  });

  const sendState = () => {
    if (!win.isDestroyed()) win.webContents.send('win:state', { fullscreen: win.isFullScreen() });
  };
  win.webContents.on('did-finish-load', sendState);
  win.on('enter-full-screen', () => { sendState(); layout(); });
  win.on('leave-full-screen', () => { sendState(); layout(); });
  win.on('resize', layout);
  win.on('maximize', layout);
  win.on('unmaximize', layout);
  win.on('resized', () => { if (!win.isMaximized() && !win.isFullScreen()) win._lastNormal = win.getBounds(); saveState(); });
  win.on('moved', () => { if (!win.isMaximized() && !win.isFullScreen()) win._lastNormal = win.getBounds(); });
  win.on('close', saveState);
  win.on('closed', () => { win = null; content = null; });
}

function toggleFullscreen() {
  if (win) win.setFullScreen(!win.isFullScreen());
}

// ---- IPC from the top bar -------------------------------------------------
const fromBar = (e) => win && e.sender === win.webContents;
ipcMain.on('win:minimize', (e) => { if (fromBar(e)) win.minimize(); });
ipcMain.on('win:fullscreen', (e) => { if (fromBar(e)) toggleFullscreen(); });
ipcMain.on('win:toggle-maximize', (e) => {
  if (!fromBar(e) || win.isFullScreen()) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('win:close', (e) => { if (fromBar(e)) app.quit(); });

// ---- App lifecycle --------------------------------------------------------
app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  app.setAppUserModelId('me.proton.mail.desktop');
  // macOS needs an Edit menu for copy/paste; elsewhere no menu at all.
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' },
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }
  createWindow();
});

app.on('window-all-closed', () => app.quit());
