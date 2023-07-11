import { app, BrowserWindow, ipcMain } from 'electron';
import isDev from 'electron-is-dev';

import './docker';
import './goal';

ipcMain.on('isDev', () =>
  BrowserWindow.getFocusedWindow()?.webContents.send('isDev', null, isDev),
);

ipcMain.on('maximize', () => BrowserWindow.getFocusedWindow()?.maximize());

ipcMain.on('minimize', () => {
  if (process.platform === 'darwin') {
    app.hide();
  } else {
    BrowserWindow.getFocusedWindow()?.minimize();
  }
});

ipcMain.on('quit', app.quit);
