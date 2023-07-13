import { exec } from 'child_process';
import { BrowserWindow, ipcMain } from 'electron';

import { DOCKER_NAME } from './docker';

const catchpointEndpoints = {
  'algorand.mainnet':
    'https://algorand-catchpoints.s3.us-east-2.amazonaws.com/channel/mainnet/latest.catchpoint',
};

ipcMain.on('goal.catchpoint', (_, { network }) => {
  // we go through docker because we know our container has curl available
  exec(
    `docker exec ${DOCKER_NAME} curl -s ${
      catchpointEndpoints[network as keyof typeof catchpointEndpoints]
    }`,
    (err, stdout) =>
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'goal.catchpoint',
        err,
        stdout,
      ),
  );
});

ipcMain.on('goal.catchup', (_, { catchpoint }) => {
  exec(
    `docker exec ${DOCKER_NAME} goal node catchup ${catchpoint}`,
    (err, stdout) =>
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'goal.catchup',
        err,
        stdout,
      ),
  );
});

ipcMain.on('goal.start', () => {
  exec(`docker exec ${DOCKER_NAME} goal node start`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.start',
      err,
      stdout,
    ),
  );
});

ipcMain.on('goal.status', () => {
  exec(`docker exec ${DOCKER_NAME} goal node status`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.status',
      err,
      stdout,
    ),
  );
});

ipcMain.on('goal.stop', () => {
  exec(`docker exec ${DOCKER_NAME} goal node stop`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.stop',
      err,
      stdout,
    ),
  );
});

ipcMain.on('goal.token', () => {
  exec(`docker exec ${DOCKER_NAME} cat data/algod.admin.token`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.token',
      err,
      stdout,
    ),
  );
});
