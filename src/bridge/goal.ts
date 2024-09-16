import { exec, spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

import { ModifiedBrowserWindow } from '../main';

const CATCHPOINT_ENDPOINTS = {
  'algorand.mainnet':
    'https://algorand-catchpoints.s3.us-east-2.amazonaws.com/channel/mainnet/latest.catchpoint',
  'voi.mainnet': 'https://mainnet-api.voi.nodely.dev/v2/status',
};

const CONFIG_FILES = {
  'algorand.mainnet': 'algorand.mainnet.config.json',
  'voi.mainnet': 'voi.mainnet.config.json',
};

const GENESIS_FILES = {
  'algorand.mainnet': 'algorand.mainnet.genesis.json',
  'voi.mainnet': 'voi.mainnet.genesis.json',
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

ipcMain.on('goal.addpartkey', (event, { account, firstValid, lastValid }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  const child = spawn(GOAL, [
    'account',
    'addpartkey',
    '-d',
    window.getDataDir(),
    '-a',
    account,
    '--roundFirstValid',
    firstValid,
    '--roundLastValid',
    lastValid,
  ]);

  child.stderr.on('data', (data: Uint8Array) =>
    window.webContents.send(
      'goal.addpartkey.stderr',
      String.fromCharCode.apply(null, data),
    ),
  );
  child.stdout.on('data', (data: Uint8Array) =>
    window.webContents.send(
      'goal.addpartkey.stdout',
      null,
      String.fromCharCode.apply(null, data),
    ),
  );

  child.on('exit', (code) =>
    window.webContents.send('goal.addpartkey', code ? true : null),
  );
});

ipcMain.on('goal.catchpoint', async (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  let err = null;
  let stdout = null;

  const network = window.network;
  try {
    if (network === 'voi.mainnet') {
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

  window.webContents.send('goal.catchpoint', err, stdout);
});

ipcMain.on('goal.catchup', (event, { catchpoint }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(
    `"${GOAL}" node catchup -d "${window.getDataDir()}" ${catchpoint}`,
    (err, stdout) => window.webContents.send('goal.catchup', err, stdout),
  );
});

ipcMain.on('goal.deletepartkey', (event, { id }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(
    `"${GOAL}" account deletepartkey -d "${window.getDataDir()}" --partkeyid ${id}`,
    (err, stdout) => window.webContents.send('goal.deletepartkey', err, stdout),
  );
});

ipcMain.on('goal.running', async (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(`"${GOAL}" node status -d "${window.getDataDir()}"`, (err, stdout) =>
    window.webContents.send(
      'goal.running',
      null,
      stdout.includes('Last committed block:'),
    ),
  );
});

let runningDataDirs = new Set<string>();
ipcMain.on('goal.start', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  const network = window.network;
  const dataDir = window.getDataDir();

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
    `0.0.0.0:${window.store.get('port')}`,
  ]);
  window.on('closed', () => exec(`"${GOAL}" node stop -d "${dataDir}"`));

  child.stderr.on('data', (data: Uint8Array) =>
    window.webContents.send(
      'goal.start',
      String.fromCharCode.apply(null, data),
    ),
  );

  child.stdout.on('data', (data: Uint8Array) => {
    const str = String.fromCharCode.apply(null, data);
    if (str.includes('Node running')) {
      window.webContents.send('goal.start', null, str);
    } else if (str.includes('Could not start node')) {
      window.webContents.send('goal.start', new Error(str));
    }
  });

  child.on('exit', () => runningDataDirs.delete(network));
  runningDataDirs.add(network);
});

ipcMain.on('goal.status', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(`"${GOAL}" node status -d "${window.getDataDir()}"`, (err, stdout) =>
    window.webContents.send('goal.status', err, stdout),
  );
});

ipcMain.on('goal.stop', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(`"${GOAL}" node stop -d "${window.getDataDir()}"`, (err, stdout) =>
    window.webContents.send('goal.stop', err, stdout),
  );
});

ipcMain.on('goal.telemetry', (event, { nodeName }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  const dataDir = window.getDataDir();

  let config = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'logging.config'), {
      encoding: 'utf-8',
    }),
  );

  config.Enable = nodeName !== '';
  config.Name = nodeName === '' ? '' : `A1CN:${nodeName}`;

  fs.writeFileSync(
    path.join(dataDir, 'logging.config'),
    JSON.stringify(config),
    {
      encoding: 'utf-8',
    },
  );

  window.webContents.send('goal.telemetry');
});

ipcMain.on('goal.token', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  let err = null;
  let stdout = null;

  try {
    stdout = fs.readFileSync(
      path.join(window.getDataDir(), 'algod.admin.token'),
      {
        encoding: 'utf-8',
      },
    );
  } catch (e) {
    err = e;
  }

  window.webContents.send('goal.token', err, stdout);
});

app.on('will-quit', () => {
  // stop all the nodes in runningDataDirs
  runningDataDirs.forEach((dataDir) =>
    exec(`"${GOAL}" node stop -d "${dataDir}"`),
  );
});
