// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { createStoreBindings } from 'electron-persist-secure/lib/bindings';

// we keep a registry of all pending IPC events with their corresponding callbacks
let ipcRegistry: Record<string, any> = {};
function sendIPC<T = any>(
  eventName: string,
  { stderr, stdout, ...options }: any = {},
) {
  return new Promise<T>((resolve, reject) => {
    // make sure we only ever have one listener for each event
    if (!ipcRegistry[eventName]) {
      ipcRenderer.on(eventName, (_: any, err: any, result: any) =>
        ipcRegistry[eventName](err, result),
      );

      // handle buffers
      ipcRenderer.on(
        `${eventName}.stderr`,
        (_: any, err: any) =>
          ipcRegistry[eventName].stderr && ipcRegistry[eventName].stderr(err),
      );
      ipcRenderer.on(
        `${eventName}.stdout`,
        (_: any, __: any, result: any) =>
          ipcRegistry[eventName].stdout &&
          ipcRegistry[eventName].stdout(result),
      );
    } else if (!ipcRegistry[eventName].fired) {
      // if the event has been registered but not fired, reject the previous promise
      ipcRegistry[eventName].reject(
        new Error(`Event ${eventName} was re-registered before it was fired.`),
      );
    }

    ipcRegistry[eventName] = (err: any, result: any) => {
      ipcRegistry[eventName].fired = true;
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    };

    ipcRegistry[eventName].fired = false;
    ipcRegistry[eventName].reject = reject;
    ipcRegistry[eventName].stderr = stderr;
    ipcRegistry[eventName].stdout = stdout;

    ipcRenderer.send(eventName, options);
  });
}

import crypto from 'crypto';

let cryptoWrapper: any = {};

let cipher: crypto.Cipher;
cryptoWrapper.createCipheriv = (algo: any, key: any, iv: any, options: any) =>
  (cipher = crypto.createCipheriv(algo, key, iv, options));
cryptoWrapper._cipher_final = () => cipher.final();
cryptoWrapper._cipher_update = (data: any) => cipher.update(data);

let decipher: crypto.Decipher;
cryptoWrapper.createDecipheriv = (algo: any, key: any, iv: any, options: any) =>
  (decipher = crypto.createDecipheriv(algo, key, iv, options));
cryptoWrapper._decipher_final = () => decipher.final();
cryptoWrapper._decipher_update = (data: any) => decipher.update(data);

let hmac: crypto.Hmac;
cryptoWrapper.createHmac = (algo: any, key: any, options: any) =>
  (hmac = crypto.createHmac(algo, key, options));
cryptoWrapper._hmac_digest = () => hmac.digest();
cryptoWrapper._hmac_update = (data: any) => (hmac = hmac.update(data));

cryptoWrapper.randomBytes = (size: any) => crypto.randomBytes(size);

const docker = {
  build: (
    { stderr, stdout } = {
      stderr: (data: string) => {},
      stdout: (data: string) => {},
    },
  ) => sendIPC('docker.build', { stderr, stdout }),
  built: () => sendIPC('docker.built'),
  remap: () => sendIPC('docker.remap'),
  run: () => sendIPC('docker.run'),
  running: () => sendIPC('docker.running'),
  stop: () => sendIPC('docker.stop'),
  teardown: () => sendIPC('docker.teardown'),
  version: () => sendIPC('docker.version'),
};

const electron = {
  maximize: () => sendIPC('maximize'),
  minimize: () => sendIPC('minimize'),
  setPort: (port: number) => sendIPC('setPort', { port }),
  quit: () => sendIPC('quit'),
};

const goal = {
  catchpoint: (network: 'algorand.mainnet') =>
    sendIPC('goal.catchpoint', { network }),
  catchup: (catchpoint: string) => sendIPC('goal.catchup', { catchpoint }),
  start: () => sendIPC('goal.start'),
  status: () => sendIPC('goal.status'),
  stop: () => sendIPC('goal.stop'),
  token: () => sendIPC('goal.token'),
};

const store = createStoreBindings('config');

contextBridge.exposeInMainWorld('cryptoWrapper', cryptoWrapper);
contextBridge.exposeInMainWorld('docker', docker);
contextBridge.exposeInMainWorld('electron', electron);
contextBridge.exposeInMainWorld('isDev', () => sendIPC('isDev'));
contextBridge.exposeInMainWorld('goal', goal);
contextBridge.exposeInMainWorld('store', store);

declare global {
  interface Window {
    cryptoWrapper: typeof crypto;
    docker: typeof docker;
    electron: typeof electron;
    isDev: () => Promise<boolean>;
    goal: typeof goal;
    store: typeof store;
  }
}
