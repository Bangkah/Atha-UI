const signale = require("signale");
const { app, BrowserWindow, dialog } = require("electron");

const electron = require("electron");
require('@electron/remote/main').initialize();
const ipc = electron.ipcMain;
const path = require("path");
const url = require("url");
const fs = require("fs");
const which = require("which");
const Terminal = require("./classes/terminal.class.js").Terminal;

let win, tty, extraTtys;

// Global error handler
process.on("uncaughtException", e => {
    signale.fatal(e);
    dialog.showErrorBox("Atha UI crashed", e.message || "Cannot retrieve error message.");
    if (tty) tty.close();
    if (extraTtys) {
        Object.keys(extraTtys).forEach(key => {
            if (extraTtys[key] !== null) extraTtys[key].close();
        });
    }
    process.exit(1);
});

signale.start(`Starting Atha UI v${app.getVersion()}`);
signale.info(`With Node ${process.versions.node} and Electron ${process.versions.electron}`);
signale.info(`Renderer is Chrome ${process.versions.chrome}`);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    signale.fatal("Error: Another instance of Atha-UI is already running. Cannot proceed.");
    app.exit(1);
}

signale.time("Startup");

// Lokasi file konfigurasi
const userData = app.getPath("userData");
const settingsFile = path.join(userData, "settings.json");
const shortcutsFile = path.join(userData, "shortcuts.json");
const lastWindowStateFile = path.join(userData, "lastWindowState.json");
const themesDir = path.join(userData, "themes");
const kblayoutsDir = path.join(userData, "keyboards");
const fontsDir = path.join(userData, "fonts");

// Sumber default dari dalam aplikasi
const innerThemesDir = path.join(__dirname, "assets/themes");
const innerKblayoutsDir = path.join(__dirname, "assets/kb_layouts");
const innerFontsDir = path.join(__dirname, "assets/fonts");

// Fungsi penyalinan folder
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            if (!fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    });
}

// Buat file JSON jika belum ada
function ensureJSON(filePath, defaultContent = {}) {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
        signale.success(`Created default ${path.basename(filePath)}`);
    }
}

// Inisialisasi file & folder konfigurasi
function initSettings() {
    ensureJSON(settingsFile, {
        monitor: 0,
        allowWindowed: false,
        forceFullscreen: true,
        experimentalFeatures: false
    });

    ensureJSON(shortcutsFile, {}); // tambahkan default shortcuts jika perlu

    ensureJSON(lastWindowStateFile, { useFullscreen: true });

    copyDir(innerThemesDir, themesDir);
    copyDir(innerKblayoutsDir, kblayoutsDir);
    copyDir(innerFontsDir, fontsDir);
}

// Buat jendela utama
function createWindow() {
    const settings = JSON.parse(fs.readFileSync(settingsFile));

    signale.info("Creating window...");

    let display = !isNaN(settings.monitor)
        ? electron.screen.getAllDisplays()[settings.monitor] || electron.screen.getPrimaryDisplay()
        : electron.screen.getPrimaryDisplay();

    let { x, y, width, height } = display.bounds;
    width++; height++;

    win = new BrowserWindow({
        title: "Atha UI",
        x, y, width, height,
        show: false,
        resizable: true,
        movable: settings.allowWindowed || false,
        fullscreen: settings.forceFullscreen || false,
        autoHideMenuBar: true,
        frame: settings.allowWindowed || false,
        backgroundColor: '#000000',
        webPreferences: {
            devTools: true,
            enableRemoteModule: true,
            contextIsolation: false,
            backgroundThrottling: false,
            webSecurity: true,
            nodeIntegration: true
        }
    });

    require('@electron/remote/main').enable(win);

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'ui.html'),
        protocol: 'file:',
        slashes: true
    }));

    signale.complete("Frontend window created!");
    win.show();
    if (!settings.allowWindowed) {
        win.setResizable(false);
    } else {
        let lastState = {};
        try {
            lastState = require(lastWindowStateFile);
        } catch (e) {
            signale.warn("lastWindowState.json tidak ditemukan atau rusak, abaikan...");
        }
        if (!lastState["useFullscreen"]) {
            win.setFullScreen(false);
        }
    }

    signale.watch("Waiting for frontend connection...");
}

// IPC log
ipc.on("log", (e, type, content) => {
    signale[type](content);
});

// Start app
app.whenReady().then(() => {
    initSettings();
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
