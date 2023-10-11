import { exec, spawn } from 'child_process';
import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

import { ModifiedBrowserWindow } from '../main';
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

function getDataDir(network: string) {
  if (!(network in DATA_DIRS)) {
    throw new Error(`Unknown network: ${network}`);
  }

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

ipcMain.on('goal.addpartkey', (event, { account, firstValid, lastValid }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  const child = spawn(GOAL, [
    'account',
    'addpartkey',
    '-d',
    getDataDir(window.network),
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

  window.webContents.send('goal.catchpoint', err, stdout);
});

ipcMain.on('goal.catchup', (event, { catchpoint }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(
    `"${GOAL}" node catchup -d "${getDataDir(window.network)}" ${catchpoint}`,
    (err, stdout) => window.webContents.send('goal.catchup', err, stdout),
  );
});

ipcMain.on('goal.deletepartkey', (event, { id }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(
    `"${GOAL}" account deletepartkey -d "${getDataDir(
      window.network,
    )}" --partkeyid ${id}`,
    (err, stdout) => window.webContents.send('goal.deletepartkey', err, stdout),
  );
});

ipcMain.on('goal.running', async (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(
    `"${GOAL}" node status -d "${getDataDir(window.network)}"`,
    (err, stdout) =>
      window.webContents.send(
        'goal.running',
        null,
        stdout.includes('Last committed block:'),
      ),
  );
});

ipcMain.on('goal.start', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  const network = window.network;
  const dataDir = getDataDir(network);

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
});

ipcMain.on('goal.status', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(
    `"${GOAL}" node status -d "${getDataDir(window.network)}"`,
    (err, stdout) => window.webContents.send('goal.status', err, stdout),
  );
});

ipcMain.on('goal.stop', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  exec(
    `"${GOAL}" node stop -d "${getDataDir(window.network)}"`,
    (err, stdout) => window.webContents.send('goal.stop', err, stdout),
  );
});

ipcMain.on('goal.telemetry', (event, { nodeName }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;
  const dataDir = getDataDir(window.network);

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
      path.join(getDataDir(window.network), 'algod.admin.token'),
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
  for (const network of Object.keys(DATA_DIRS)) {
    const dataDir = getDataDir(network);
    exec(`"${GOAL}" node stop -d "${dataDir}"`);
  }
});
