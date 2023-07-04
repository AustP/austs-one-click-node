import { app, BrowserWindow, ipcMain } from 'electron';

import './docker';
import './goal';

ipcMain.on('maximize', () => BrowserWindow.getFocusedWindow()?.maximize());

ipcMain.on('minimize', () => {
  if (process.platform === 'darwin') {
    app.hide();
  } else {
    BrowserWindow.getFocusedWindow()?.minimize();
  }
});

ipcMain.on('quit', app.quit);
