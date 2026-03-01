const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width:     1400,
        height:    900,
        minWidth:  1200,
        minHeight: 800,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            preload:            path.join(__dirname, 'preload.js'),
            contextIsolation:   true,
            nodeIntegration:    false,
            enableRemoteModule: false,
            // Required: allows fetch() to reach the local Python backend (127.0.0.1:8000)
            // Without this, Electron blocks cross-origin requests and you get "Failed to fetch"
            webSecurity:        false
        }
    });

    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // DevTools only in dev — comment out before packaging
    win.webContents.openDevTools();
}

// IPC: native save dialog (PDF / SVG export)
ipcMain.handle('save-file', async (_event, { filename, data, encoding }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: filename
    });
    if (canceled || !filePath) return { success: false, reason: 'canceled' };
    try {
        fs.writeFileSync(filePath, Buffer.from(data, encoding || 'utf8'));
        return { success: true, filePath };
    } catch (err) {
        return { success: false, reason: err.message };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});