import { exec, spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

import { store } from '../main';
import { productName } from '../../package.json';

const CATCHPOINT_ENDPOINTS = {
  'algorand.mainnet':
    'https://algorand-catchpoints.s3.us-east-2.amazonaws.com/channel/mainnet/latest.catchpoint',
  'voi.testnet': 'https://testnet-api.voi.nodly.io/v2/status',
};

const CONFIG_FILES = {
  'algorand.mainnet': 'algorand.mainnet.config.json',
  'voi.testnet': 'voi.testnet.config.json',
};

const GENESIS_FILES = {
  'algorand.mainnet': 'algorand.mainnet.genesis.json',
  'voi.testnet': 'voi.testnet.genesis.json',
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

const DATA_DIRS = {
  'algorand.mainnet': path.join(
    app.getPath('appData'),
    productName,
    'data',
    'algorand.mainnet',
  ),
  'voi.testnet': path.join(
    app.getPath('appData'),
    productName,
    'data',
    'voi.testnet',
  ),
};

function getDataDir() {
  const network = store.get('network');
  const dataDir = DATA_DIRS[network as keyof typeof DATA_DIRS];

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o777 });

    // we made it so multiple network data dirs can coexist
    // v1.0.0 and below used to use the same data dir for all networks
    // so we need to move the old data dir to the new one, if applicable
    if (network === 'algorand.mainnet') {
      const oldDataDir = path.join(
        app.getPath('appData'),
        productName,
        'algod',
        'data',
      );

      if (fs.existsSync(oldDataDir)) {
        fs.renameSync(oldDataDir, dataDir);
      }
    }
  }

  return dataDir;
}

ipcMain.on('goal.addpartkey', (_, { account, firstValid, lastValid }) => {
  const child = spawn(GOAL, [
    'account',
    'addpartkey',
    '-d',
    getDataDir(),
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

ipcMain.on('goal.catchpoint', async () => {
  let err = null;
  let stdout = null;

  const network = store.get('network');
  try {
    if (network === 'voi.testnet') {
      const response = await fetch(
        CATCHPOINT_ENDPOINTS[network as keyof typeof CATCHPOINT_ENDPOINTS],
      );
      const json = await response.json();
      stdout = json['last-catchpoint'];
    } else {
      const response = await fetch(
        CATCHPOINT_ENDPOINTS[network as keyof typeof CATCHPOINT_ENDPOINTS],
      );
      stdout = await response.text();
    }
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
  exec(
    `"${GOAL}" node catchup -d "${getDataDir()}" ${catchpoint}`,
    (err, stdout) =>
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'goal.catchup',
        err,
        stdout,
      ),
  );
});

ipcMain.on('goal.deletepartkey', (_, { id }) => {
  exec(
    `"${GOAL}" account deletepartkey -d "${getDataDir()}" --partkeyid ${id}`,
    (err, stdout) =>
      BrowserWindow.getAllWindows()[0]?.webContents.send(
        'goal.deletepartkey',
        err,
        stdout,
      ),
  );
});

ipcMain.on('goal.running', async () => {
  exec(`"${GOAL}" node status -d "${getDataDir()}"`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.running',
      null,
      stdout.includes('Last committed block:'),
    ),
  );
});

ipcMain.on('goal.start', () => {
  const dataDir = getDataDir();
  const network = store.get('network');
  if (!fs.existsSync(path.join(dataDir, 'config.json'))) {
    fs.copyFileSync(
      path.join(CONFIG_DIR, CONFIG_FILES[network as keyof typeof CONFIG_FILES]),
      path.join(dataDir, 'config.json'),
    );
  }

  if (!fs.existsSync(path.join(dataDir, 'genesis.json'))) {
    fs.copyFileSync(
      path.join(
        CONFIG_DIR,
        GENESIS_FILES[network as keyof typeof GENESIS_FILES],
      ),
      path.join(dataDir, 'genesis.json'),
    );
  }

  const child = spawn(ALGOD, [
    '-d',
    dataDir,
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
  exec(`"${GOAL}" node status -d "${getDataDir()}"`, (err, stdout) =>
    BrowserWindow.getAllWindows()[0]?.webContents.send(
      'goal.status',
      err,
      stdout,
    ),
  );
});

ipcMain.on('goal.stop', () => {
  exec(`"${GOAL}" node stop -d "${getDataDir()}"`, (err, stdout) =>
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
    stdout = fs.readFileSync(path.join(getDataDir(), 'algod.admin.token'), {
      encoding: 'utf-8',
    });
  } catch (e) {
    err = e;
  }

  BrowserWindow.getAllWindows()[0]?.webContents.send('goal.token', err, stdout);
});

app.on('will-quit', () => {
  exec(`"${GOAL}" node stop -d "${getDataDir()}"`);
});
