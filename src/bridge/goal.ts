import { exec, spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

import { store } from '../main';
import { productName } from '../../package.json';

const CATCHPOINT_ENDPOINTS = {
  'algorand.mainnet':
    'https://algorand-catchpoints.s3.us-east-2.amazonaws.com/channel/mainnet/latest.catchpoint',
};

const SUFFIX = process.platform === 'win32' ? '.exe' : '';
const ALGOD = app.isPackaged
  ? path.join(process.resourcesPath, `algod${SUFFIX}`)
  : path.join(
      __dirname, // one-click-node/.webpack/main
      '..',
      '..',
      'src',
      'bin',
      process.platform,
      `algod${SUFFIX}`,
    );
const GOAL = app.isPackaged
  ? path.join(process.resourcesPath, `goal${SUFFIX}`)
  : path.join(
      __dirname, // one-click-node/.webpack/main
      '..',
      '..',
      'src',
      'bin',
      process.platform,
      `goal${SUFFIX}`,
    );

const CONFIG_DIR = app.isPackaged
  ? process.resourcesPath
  : path.join(
      __dirname, // one-click-node/.webpack/main
      '..',
      '..',
      'src',
      'config',
    );

const DATA_DIR = path.join(
  app.getPath('appData'),
  productName,
  'algod',
  'data',
);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o777 });
  fs.copyFileSync(
    path.join(CONFIG_DIR, 'config.json'),
    path.join(DATA_DIR, 'config.json'),
  );
}

ipcMain.on('goal.addpartkey', (_, { account, firstValid, lastValid }) => {
  const child = spawn(GOAL, [
    'account',
    'addpartkey',
    '-d',
    DATA_DIR,
    '-a',
    account,
    '--roundFirstValid',
    firstValid,
    '--roundLastValid',
    lastValid,
  ]);

  child.stderr.on('data', (data: Uint8Array) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.addpartkey.stderr',
      String.fromCharCode.apply(null, data),
    ),
  );
  child.stdout.on('data', (data: Uint8Array) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.addpartkey.stdout',
      null,
      String.fromCharCode.apply(null, data),
    ),
  );

  child.on('exit', (code) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.addpartkey',
      code ? true : null,
    ),
  );
});

ipcMain.on('goal.catchpoint', async (_, { network }) => {
  let err = null;
  let stdout = null;

  try {
    const response = await fetch(
      CATCHPOINT_ENDPOINTS[network as keyof typeof CATCHPOINT_ENDPOINTS],
    );
    stdout = await response.text();
  } catch (e) {
    err = e;
  }

  BrowserWindow.getAllWindows()[0]?.webContents.send(
    'goal.catchpoint',
    err,
    stdout,
  );
});

ipcMain.on('goal.catchup', (_, { catchpoint }) => {
  exec(`"${GOAL}" node catchup -d "${DATA_DIR}" ${catchpoint}`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.catchup',
      err,
      stdout,
    ),
  );
});

ipcMain.on('goal.deletepartkey', (_, { id }) => {
  exec(
    `"${GOAL}" account deletepartkey -d "${DATA_DIR}" --partkeyid ${id}`,
    (err, stdout) =>
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'goal.deletepartkey',
        err,
        stdout,
      ),
  );
});

ipcMain.on('goal.running', async () => {
  exec(`"${GOAL}" node status -d "${DATA_DIR}"`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.running',
      null,
      stdout.includes('Last committed block:'),
    ),
  );
});

ipcMain.on('goal.start', () => {
  if (!fs.existsSync(path.join(DATA_DIR, 'genesis.json'))) {
    fs.copyFileSync(
      path.join(CONFIG_DIR, 'algorand.mainnet.genesis.json'),
      path.join(DATA_DIR, 'genesis.json'),
    );
  }

  const child = spawn(ALGOD, [
    '-d',
    DATA_DIR,
    '-l',
    `0.0.0.0:${store.get('port')}`,
  ]);

  child.stderr.on('data', (data: Uint8Array) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.start',
      String.fromCharCode.apply(null, data),
    ),
  );

  child.stdout.on('data', (data: Uint8Array) => {
    const str = String.fromCharCode.apply(null, data);
    if (str.includes('Node running')) {
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'goal.start',
        null,
        str,
      );
    } else if (str.includes('Could not start node')) {
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'goal.start',
        new Error(str),
      );
    }
  });
});

ipcMain.on('goal.status', () => {
  exec(`"${GOAL}" node status -d "${DATA_DIR}"`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.status',
      err,
      stdout,
    ),
  );
});

ipcMain.on('goal.stop', () => {
  exec(`"${GOAL}" node stop -d "${DATA_DIR}"`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.stop',
      err,
      stdout,
    ),
  );
});

ipcMain.on('goal.token', () => {
  let err = null;
  let stdout = null;

  try {
    stdout = fs.readFileSync(path.join(DATA_DIR, 'algod.admin.token'), {
      encoding: 'utf-8',
    });
  } catch (e) {
    err = e;
  }

  BrowserWindow.getAllWindows()[0]?.webContents.send('goal.token', err, stdout);
});

app.on('will-quit', () => {
  exec(`"${GOAL}" node stop -d "${DATA_DIR}"`);
});
