import { app, BrowserWindow, ipcMain } from 'electron';
import isDev from 'electron-is-dev';

import './docker';
import './goal';

ipcMain.on('isDev', () =>
  BrowserWindow.getAllWindows()[0]?.webContents.send('isDev', null, isDev),
);

ipcMain.on('maximize', () => {
  BrowserWindow.getAllWindows()[0]?.maximize();
  BrowserWindow.getAllWindows()[0]?.webContents.send('maximize');
});

ipcMain.on('minimize', () => {
  if (process.platform === 'darwin') {
    app.hide();
  } else {
    BrowserWindow.getAllWindows()[0]?.minimize();
  }

  BrowserWindow.getAllWindows()[0]?.webContents.send('minimize');
});

ipcMain.on('quit', app.quit);
