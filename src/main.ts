import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import isDev from 'electron-is-dev';
import Store from 'electron-persist-secure/lib/store';
import fs from 'fs';
import path from 'path';

import { productName } from '../package.json';

const DEFAULT_NETWORK = 'algorand.mainnet';
const DEFAULT_PORT = 4160;

const NETWORKS = ['algorand.mainnet', 'voi.mainnet'];

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export type ModifiedBrowserWindow = BrowserWindow & {
  getDataDir: () => string;
  network: string;
  store: Store;
};

// Squirrel.Windows will spawn the app multiple times while installing/updating
// to make sure only one app is running, we quit if we detect squirrel
if (require('electron-squirrel-startup')) {
  const squirrelEvent = process.argv[1];
  if (squirrelEvent === '--squirrel-uninstall') {
    // delete the data directory
    const DATA_DIR = path.join(app.getPath('appData'), productName, 'data');
    if (fs.existsSync(DATA_DIR)) {
      fs.rmdirSync(DATA_DIR, { recursive: true });
    }
  }

  app.quit();
}

const firstInstance = app.requestSingleInstanceLock();
if (!firstInstance) {
  // only allow one instance of the app
  // we will handle multiple nodes as separate windows
  app.quit();
}

let storeMap: Record<string, Store> = {};
const loadStore = (network: string) => {
  if (!(network in storeMap)) {
    storeMap[network] = new Store({
      configName: network,
    });
  }

  const store = storeMap[network];
  store.set('accounts', store.get('accounts', {}));
  store.set('darkMode', store.get('darkMode', false));
  store.set(
    'dataDir',
    store.get('dataDir') ||
      path.join(app.getPath('appData'), productName, 'data', network),
  );
  store.set('guid', store.get('guid', ''));
  store.set('nodeName', store.get('nodeName', ''));
  store.set('port', store.get('port', DEFAULT_PORT));
  store.set('startup', store.get('startup', false));

  return store;
};

let mainStore: Store;
const createMainStore = () => {
  mainStore = new Store({
    configName: 'main',
  });

  mainStore.set('startupNetworks', mainStore.get('startupNetworks', []));

  // need to do some migrations for v1.4.0
  const hasMigrated_v140 = mainStore.get('hasMigrated_v140', false);
  if (!hasMigrated_v140) {
    mainStore.set('hasMigrated_v140', true);

    // check to see if the old config exists
    const store = new Store({
      configName: 'config',
    });

    const network = store.get('network') as string;
    if (network) {
      // the old config exists, so we need to migrate
      const accounts = store.get('accounts', {});
      const darkMode = store.get('darkMode', false);
      const nodeName = store.get('nodeName');
      const port = store.get('port') as number;
      const startup = store.get('startup');

      const firstNetworkStore = loadStore(network);
      firstNetworkStore.set('accounts', accounts);
      firstNetworkStore.set('darkMode', darkMode);
      firstNetworkStore.set('nodeName', nodeName);
      firstNetworkStore.set('port', port);
      firstNetworkStore.set('startup', startup);
      if (startup) {
        mainStore.set('startupNetworks', [network]);
      }

      const otherNetwork = NETWORKS.find((n) => n !== network);
      const secondNetworkStore = loadStore(otherNetwork!);
      firstNetworkStore.set('accounts', accounts);
      firstNetworkStore.set('darkMode', darkMode);
      secondNetworkStore.set('nodeName', '');
      secondNetworkStore.set('port', port + 1);
      secondNetworkStore.set('startup', false);
    }
  }
};

let runningNetworks: string[] = [];
const createWindow = (network: string) => {
  // make sure we only run one instance of each network
  if (runningNetworks.includes(network)) {
    return;
  }

  // make sure we only start windows for networks we support
  if (!NETWORKS.includes(network)) {
    return;
  }

  const suffix =
    process.platform === 'darwin'
      ? 'icns'
      : process.platform === 'linux'
      ? 'png'
      : 'ico';
  const icon = `icon.${suffix}`;

  // Create the browser window.
  const window = new BrowserWindow({
    frame: false,
    height: 720,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, icon)
      : path.join(__dirname, '..', '..', 'src', 'assets', 'icons', icon),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    width: 1024,
  }) as ModifiedBrowserWindow;

  // and load the index.html of the app.
  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (isDev) {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  // remove the menu
  window.removeMenu();
  window.setWindowButtonVisibility?.(false);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `connect-src 'self' data: http://localhost:* https://vp2apscqbf2e57yys6x4iczcyi0znuce.lambda-url.us-west-2.on.aws https://api.github.com https://*.defly.app https://*.perawallet.app wss://*.walletconnect.org wss://*.defly.app wss://*.perawallet.app https://g.nodely.io; font-src 'self' https://fonts.gstatic.com; object-src 'none'; script-src 'self'; style-src 'unsafe-inline' https://fonts.googleapis.com`,
        ],
      },
    });
  });

  let lastDataDir: string | undefined;
  window.getDataDir = () => {
    let dataDir = window.store.get('dataDir') as string;
    if (dataDir === '') {
      dataDir = path.join(app.getPath('appData'), productName, 'data', network);
      window.store.set('dataDir', dataDir);
    }

    if (lastDataDir !== undefined && lastDataDir !== dataDir) {
      // this happens when the user changes the data dir in the settings
      // we will just move the old data directory to keep keys, sync, etc.
      try {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true, mode: 0o777 });
        }

        if (fs.existsSync(lastDataDir)) {
          try {
            // try to rename the old directory
            fs.renameSync(lastDataDir, dataDir);
          } catch (err) {
            try {
              // try copying the old directory / deleting it
              fs.copyFileSync(lastDataDir, dataDir);
              fs.rmdirSync(lastDataDir, { recursive: true });
            } catch (err) {
              // just start from scratch in the new directory
            }
          }
        }
      } catch (err) {
        // if we can't create the new directory, we have to revert back
        window.store.set('dataDir', lastDataDir);
        return lastDataDir;
      }
    } else if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o777 });

      // we made it so multiple network data dirs can coexist
      // v1.0.0 and below used to use the same data dir for all networks
      // so we need to move the old data dir to the new one, if applicable
      if (dataDir.endsWith('algorand.mainnet')) {
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

    lastDataDir = dataDir;
    return dataDir;
  };

  window.network = network;
  window.store = loadStore(network);

  // if we are starting a second network,
  // make sure the ports are different
  if (runningNetworks.length > 0) {
    const prevNetwork = runningNetworks[runningNetworks.length - 1];
    const prevStore = loadStore(prevNetwork);
    if (prevStore.get('port') === window.store.get('port')) {
      window.store.set('port', (window.store.get('port') as number) + 1);
    }
  }

  runningNetworks.push(network);
  window.on('closed', () => {
    runningNetworks = runningNetworks.filter((n) => n !== network);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createMainStore();

  // create a window for each network in the startup list
  const startupNetworks = mainStore.get('startupNetworks') as string[];
  for (const network of startupNetworks) {
    createWindow(network);
  }

  // make sure at least the default window pops up
  if (startupNetworks.length === 0) {
    createWindow(DEFAULT_NETWORK);
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(
      (mainStore.get('startupNetworks') as string[])[0] || DEFAULT_NETWORK,
    );
  }
});

// make sure all links open in the default browser
app.on('web-contents-created', (_, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// IPC handlers
import './bridge/goal';

ipcMain.on('isDev', (event) => event.sender.send('isDev', null, isDev));

ipcMain.on('loadConfig', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  event.sender.send('loadConfig', null, {
    dataDir: window.store.get('dataDir'),
    guid: window.store.get('guid'),
    network: window.network,
    port: window.store.get('port'),
  });
});

ipcMain.on('maximize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.maximize();
  event.sender.send('maximize');
});

ipcMain.on('maximized', (event) => {
  event.sender.send(
    'maximized',
    null,
    BrowserWindow.fromWebContents(event.sender)?.isMaximized(),
  );
});

ipcMain.on('minimize', (event) => {
  if (process.platform === 'darwin') {
    app.hide();
  } else {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  }

  event.sender.send('minimize');
});

ipcMain.on('newWindow', (event, { network }) => {
  createWindow(network);
  event.sender.send('newWindow');
});

ipcMain.on('platform', (event) => {
  event.sender.send('platform', null, process.platform);
});

ipcMain.on('quit', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.on('refresh', (event) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  window.close();
  createWindow(window.network);
});

ipcMain.on('setStartup', (event, { startup }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  let startupNetworks = mainStore.get('startupNetworks') as string[];
  if (startup && !startupNetworks.includes(window.network)) {
    startupNetworks.push(window.network);
    mainStore.set('startupNetworks', startupNetworks);
  }
  if (!startup && startupNetworks.includes(window.network)) {
    startupNetworks = startupNetworks.filter((n) => n !== window.network);
    mainStore.set('startupNetworks', startupNetworks);
  }

  // even though we specify .exe for windows, the args that use them
  // are for windows only, so the settings still work for macos/linux
  const appFolder = path.dirname(process.execPath);
  const updateExe = path.resolve(appFolder, '..', 'Update.exe');
  const exeName = path.basename(process.execPath);

  app.setLoginItemSettings({
    args: ['--processStart', `"${exeName}"`],
    openAtLogin: startupNetworks.length > 0,
    path: updateExe,
  });

  window.store.set('startup', startup);
  event.sender.send('setStartup');
});

ipcMain.on('swapNetwork', (event, { network }) => {
  const window = BrowserWindow.fromWebContents(
    event.sender,
  )! as ModifiedBrowserWindow;

  window.network = network;
  window.store = loadStore(network);

  event.sender.send('swapNetwork');
});

ipcMain.on('unmaximize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.unmaximize();
  event.sender.send('unmaximize');
});
