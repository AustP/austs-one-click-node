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

const electron = {
  isDev: () => sendIPC('isDev'),
  loadConfig: async () => {
    const { network, port } = await sendIPC('loadConfig');
    return {
      network,
      port,
      store: createStoreBindings(network),
    };
  },
  maximize: () => sendIPC('maximize'),
  maximized: () => sendIPC('maximized'),
  minimize: () => sendIPC('minimize'),
  newWindow: (network: string) => sendIPC('newWindow', { network }),
  platform: () => sendIPC('platform'),
  quit: () => sendIPC('quit'),
  refresh: () => sendIPC('refresh'),
  setStartup: (startup: boolean) => sendIPC('setStartup', { startup }),
  swapNetwork: (network: string) => sendIPC('swapNetwork', { network }),
  unmaximize: () => sendIPC('unmaximize'),
};

const goal = {
  addpartkey: (
    { account, firstValid, lastValid } = {
      account: '',
      firstValid: 0,
      lastValid: 0,
    },
  ) =>
    sendIPC('goal.addpartkey', {
      account,
      firstValid,
      lastValid,
    }),
  catchpoint: () => sendIPC('goal.catchpoint'),
  catchup: (catchpoint: string) => sendIPC('goal.catchup', { catchpoint }),
  deletepartkey: (id: string) => sendIPC('goal.deletepartkey', { id }),
  running: () => sendIPC('goal.running'),
  start: () => sendIPC('goal.start'),
  status: () => sendIPC('goal.status'),
  stop: () => sendIPC('goal.stop'),
  telemetry: (nodeName: string) => sendIPC('goal.telemetry', { nodeName }),
  token: () => sendIPC('goal.token'),
};

contextBridge.exposeInMainWorld('electron', electron);
contextBridge.exposeInMainWorld('goal', goal);

declare global {
  interface Window {
    electron: typeof electron;
    goal: typeof goal;
    store: ReturnType<typeof createStoreBindings>;
  }
}
