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

const docker = {
  build: (
    { stderr, stdout } = {
      stderr: (data: string) => {},
      stdout: (data: string) => {},
    },
  ) => sendIPC('docker.build', { stderr, stdout }),
  built: () => sendIPC('docker.built'),
  run: ({ port } = { port: 4160 }) => sendIPC('docker.run', { port }),
  running: () => sendIPC('docker.running'),
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
contextBridge.exposeInMainWorld('isDev', () => sendIPC('isDev'));
contextBridge.exposeInMainWorld('goal', goal);
contextBridge.exposeInMainWorld('store', store);

declare global {
  interface Window {
    docker: typeof docker;
    electron: typeof electron;
    isDev: () => Promise<boolean>;
    goal: typeof goal;
    store: typeof store;
  }
}
