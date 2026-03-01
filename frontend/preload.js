/**
 * preload.js — Electron context bridge
 *
 * Runs in a sandboxed context before the renderer page loads.
 * Exposes only the minimum surface area to the renderer via contextBridge.
 *
 * All transformer design calculations are performed exclusively by the
 * Python backend (http://127.0.0.1:8000). No calculation logic belongs here.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Open a native save dialog and write a file to disk.
     * Used by PDF / SVG export flows when running inside Electron.
     * @param {string} filename  — suggested file name
     * @param {string} data      — file content (base64 or text)
     * @param {string} encoding  — 'base64' | 'utf8'
     */
    saveFile: (filename, data, encoding) =>
        ipcRenderer.invoke('save-file', { filename, data, encoding }),

    /** Platform string so the renderer can adapt behaviour if needed */
    platform: process.platform
});