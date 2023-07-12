import { exec, spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

import { productName } from '../../package.json';

export const DOCKER_NAME = 'austs-two-click-node';
const DOCKER_TAG = `${DOCKER_NAME}:latest`;

const dataPath = path.join(
  app.getPath('appData'),
  productName,
  'algorand',
  'data',
);
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

ipcMain.on('docker.build', () => {
  const child = spawn('docker', ['build', '-t', DOCKER_TAG, '.'], {
    cwd: __dirname,
  });

  child.stderr.on('data', (data: Uint8Array) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'docker.build.stderr',
      String.fromCharCode.apply(null, data),
    ),
  );
  child.stdout.on('data', (data: Uint8Array) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'docker.build.stdout',
      null,
      String.fromCharCode.apply(null, data),
    ),
  );

  child.on('exit', (code) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'docker.build',
      code ? true : null,
    ),
  );
});

ipcMain.on('docker.built', () => {
  exec(`docker images -q ${DOCKER_TAG}`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'docker.built',
      err,
      stdout,
    ),
  );
});

ipcMain.on('docker.run', (_, { port }) => {
  // first check to see if the container is already running
  exec(
    `docker ps -q -f name=${DOCKER_NAME} -f status=running`,
    (err, stdout) => {
      if (stdout) {
        return BrowserWindow.getAllWindows()[0]?.webContents.send(
          'docker.run',
          err,
          stdout,
        );
      }

      // not running, try to restart it
      exec(`docker start ${DOCKER_NAME}`, (err, stdout) => {
        if (!err) {
          return BrowserWindow.getAllWindows()[0]?.webContents.send(
            'docker.run',
            err,
            stdout,
          );
        }

        // not running, start it ourselves
        exec(
          `docker run -d -p ${port}:8080 -v "${dataPath}:/algod/data" --name ${DOCKER_NAME} ${DOCKER_TAG}`,
          (err, stdout) => {
            BrowserWindow.getAllWindows()[0]?.webContents.send(
              'docker.run',
              err,
              stdout,
            );
          },
        );
      });
    },
  );
});

ipcMain.on('docker.running', () => {
  exec(`docker ps -q -f name=${DOCKER_NAME} -f status=running`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'docker.running',
      err,
      stdout,
    ),
  );
});

ipcMain.on('docker.stop', () => {
  exec(`docker stop ${DOCKER_NAME}`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'docker.stop',
      err,
      stdout,
    ),
  );
});

ipcMain.on('docker.version', () => {
  exec('docker version', (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'docker.version',
      err,
      stdout,
    ),
  );
});
