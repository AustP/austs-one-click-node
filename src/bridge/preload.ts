import { contextBridge, ipcRenderer } from 'electron';
import { createStoreBindings } from 'electron-persist-secure/lib/bindings';

// we keep a registry of all pending IPC events with their corresponding callbacks
let ipcRegistry: Record<string, any> = {};
function sendIPC<T = any>(eventName: string, ...args: any[]) {
  return new Promise<T>((resolve, reject) => {
    // make sure we only ever have one listener for each event
    if (!ipcRegistry[eventName]) {
      ipcRenderer.on(eventName, (...args) => ipcRegistry[eventName](...args));
    } else if (!ipcRegistry[eventName].fired) {
      // if the event has been registered but not fired, reject the previous promise
      ipcRegistry[eventName].reject(
        new Error(`Event ${eventName} was re-registered before it was fired.`),
      );
    }

    ipcRegistry[eventName] = (_: any, err: any, result: any) => {
      ipcRegistry[eventName].fired = true;
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    };
    ipcRegistry[eventName].fired = false;
    ipcRegistry[eventName].reject = reject;

    ipcRenderer.send(eventName, ...args);
  });
}

const docker = {
  build: () => sendIPC('docker.build'),
  run: ({ port } = { port: 4160 }) => sendIPC('docker.run', { port }),
  stop: () => sendIPC('docker.stop'),
  version: () => sendIPC('docker.version'),
};

const electron = {
  maximize: () => sendIPC('maximize'),
  minimize: () => sendIPC('minimize'),
  quit: () => sendIPC('quit'),
};

const goal = {
  catchup: () => sendIPC('goal.catchup'),
  start: () => sendIPC('goal.start'),
  status: () => sendIPC('goal.status'),
  stop: () => sendIPC('goal.stop'),
};

const store = createStoreBindings('config');

contextBridge.exposeInMainWorld('docker', docker);
contextBridge.exposeInMainWorld('electron', electron);
contextBridge.exposeInMainWorld('goal', goal);
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
contextBridge.exposeInMainWorld('store', {
  ...store,
});

declare global {
  interface Window {
    docker: typeof docker;
    electron: typeof electron;
    goal: typeof goal;
    ipcRenderer: typeof ipcRenderer;
    store: typeof store;
  }
}
