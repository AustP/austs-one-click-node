import flux, { Store } from '@aust/react-flux';
import { addNode, nodeRequest, removeNode } from 'algoseas-libs/build/algo';
import { produce } from 'immer';

const CATCHUP_FINISH_DELAY = 7000; // wait this long after catchup is complete to check if node is synced
const CATCHUP_THRESHOLD = 720000; // catchup is triggered if node is this many blocks behind. ~100 blocks downloaded per sec. ~2 hrs to catchup
const SYNC_WATCH_DELAY = 1000; // how long during syncing to wait between checks

enum CatchUpStatus {
  Unchecked,
  CatchingUp,
  Completed,
  Unneeded,
}

export enum Step {
  Settings,
  Check_Node_Running,
  Node_Starting,
  Check_Node_Synced,
  Node_Syncing,
  Dashboard,
}

export enum Status {
  Pending,
  Success,
  Failure,
}

type WizardStoreState = {
  buffers: {
    stderr: string[];
    stdout: string[];
  };
  catchUpStatus: CatchUpStatus;
  currentStep: Step;
  _network: 'algorand.mainnet' | 'voi.testnet';
  nodeName: '';
  _port: number;
  stepStatus: Record<Step, Status>;
  windowIndex: number;

  // selectors
  infraHash: string;
  isMainWindow: boolean;
  network: string;
  networks: { label: string; value: string }[];
  port: number;
  running: boolean;
};

declare global {
  interface Flux {
    wizard: Store<WizardStoreState>;
  }
}

const store = flux.addStore('wizard', {
  buffers: {
    stderr: [],
    stdout: [],
  },
  catchUpStatus: CatchUpStatus.Unchecked,
  currentStep: Step.Check_Node_Running,
  _network: 'algorand.mainnet',
  nodeName: '',
  _port: 4160,
  stepStatus: Object.entries(Step).reduce((stepStatus, [, value]) => {
    if (typeof value === 'string') {
      return stepStatus;
    }

    if (value === Step.Check_Node_Running) {
      stepStatus[value] = Status.Pending;
      return stepStatus;
    }

    stepStatus[value] = Status.Failure;
    return stepStatus;
  }, {} as Record<Step, Status>),
  windowIndex: 0,
}) as any as Store<WizardStoreState>;

store.register('wizard/loadConfig', async () => {
  window.setIndexCallback((index) =>
    flux.dispatch('wizard/setWindowIndex', index),
  );

  const network = await window.store.get('network');
  const port = await window.store.get('port');
  return (state) =>
    produce(state, (draft) => {
      draft._network = network;
      draft._port = port;
    });
});

store.register(
  'wizard/overview/goto',
  (_, step) => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };

      // if they are on the settings page, don't yank them away
      if (draft.currentStep !== Step.Settings) {
        draft.currentStep = step;
      }

      for (let _step in Step) {
        const index = Number(_step);
        if (isNaN(index)) {
          continue;
        }

        draft.stepStatus[index as Step] =
          index < step
            ? Status.Success
            : index === step
            ? Status.Pending
            : Status.Failure;
      }
    }),
);

store.register('wizard/checkNodeRunning', () => {
  flux.dispatch('wizard/overview/goto', Step.Check_Node_Running);
  flux.dispatch('wizard/checkNodeRunning/results');
});

store.register('wizard/checkNodeRunning/results', async () => {
  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const running = await window.goal.running();
  if (!running) {
    flux.dispatch('wizard/startNode');
  } else {
    flux.dispatch('wizard/checkNodeSynced');
  }
});

store.register('wizard/startNode', () => {
  flux.dispatch('wizard/overview/goto', Step.Node_Starting);
  flux.dispatch('wizard/startNode/results');
});

store.register('wizard/startNode/results', async () => {
  const hash = store.selectState('infraHash');

  // starting is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // make sure that the user didn't change the network or port
  if (hash !== store.selectState('infraHash')) {
    return;
  }

  try {
    await window.goal.start();
    flux.dispatch('wizard/checkNodeSynced');
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.buffers.stderr = [err.toString()];
        draft.stepStatus[Step.Node_Starting] = Status.Failure;
      });
  }
});

let nodeAdded = false;
store.register('wizard/checkNodeSynced', () => {
  if (!nodeAdded) {
    window.goal.token().then((token) => {
      addNode(
        `http://localhost:${store.selectState('port')}`,
        token,
        'X-Algo-API-Token',
      );
      nodeAdded = true;
      flux.dispatch('node/ready');
    });
  }

  flux.dispatch('wizard/overview/goto', Step.Check_Node_Synced);
  flux.dispatch('wizard/checkNodeSynced/results');
});

store.register('wizard/checkNodeSynced/results', async () => {
  const hash = store.selectState('infraHash');

  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // make sure that the user didn't change the network or port
  if (hash !== store.selectState('infraHash')) {
    return;
  }

  try {
    await nodeRequest('/ready', { maxRetries: 0 });
    flux.dispatch('wizard/showDashboard');
  } catch (err) {
    flux.dispatch('wizard/syncNode');
  }
});

store.register('wizard/syncNode', () => {
  flux.dispatch('wizard/overview/goto', Step.Node_Syncing);

  return (state) =>
    produce(state, (draft) => {
      flux.dispatch('wizard/syncNode/results');
      draft.catchUpStatus = CatchUpStatus.Unchecked;
    });
});

store.register('wizard/syncNode/results', async () => {
  try {
    let catchUpStatus = store.selectState('catchUpStatus');
    if (catchUpStatus === CatchUpStatus.CatchingUp) {
      let delay = SYNC_WATCH_DELAY;
      try {
        // after catching up, the node will report as ready
        // but the node still needs to download more blocks
        // so if the request is successful, we know that
        // we are back to syncing normally. so we wait a bit
        // and then check sync results again
        await nodeRequest('/ready', { maxRetries: 0 });
        catchUpStatus = CatchUpStatus.Completed;
        delay = CATCHUP_FINISH_DELAY;
      } catch (err) {
        // still catching up
      }

      const output = await window.goal.status();
      return (state) =>
        produce(state, (draft) => {
          draft.buffers.stderr = [output];
          draft.catchUpStatus = catchUpStatus;

          const hash = store.selectState('infraHash');
          setTimeout(() => {
            // make sure that the user didn't change the network or port
            if (hash !== store.selectState('infraHash')) {
              return;
            }

            flux.dispatch('wizard/syncNode/results');
          }, delay);
        });
    }

    if (catchUpStatus === CatchUpStatus.Unchecked) {
      // get the catchpoint for the network
      const catchpoint = (await window.goal.catchpoint()).trim();
      const catchpointRound = +catchpoint.split('#')[0];

      // compare the node to the catchpoint
      const status = await nodeRequest('/v2/status');
      const isCatchingUp = status['catchpoint'] === catchpoint;
      const needsCatchUp =
        catchpointRound - status['last-round'] > CATCHUP_THRESHOLD;

      // we check to see if it is catching up in case the user
      // restarts the app during catchup
      if (isCatchingUp) {
        catchUpStatus = CatchUpStatus.CatchingUp;
      } else if (needsCatchUp) {
        await window.goal.catchup(catchpoint);
        catchUpStatus = CatchUpStatus.CatchingUp;
      } else {
        catchUpStatus = CatchUpStatus.Unneeded;
      }
    }

    try {
      await nodeRequest('/ready', { maxRetries: 0 });
      flux.dispatch('wizard/showDashboard');
    } catch (err) {
      // still not synced
      const output = await window.goal.status();
      return (state) =>
        produce(state, (draft) => {
          draft.buffers.stderr = [output];
          draft.catchUpStatus = catchUpStatus;

          const hash = store.selectState('infraHash');
          setTimeout(() => {
            // make sure that the user didn't change the network or port
            if (hash !== store.selectState('infraHash')) {
              return;
            }

            flux.dispatch('wizard/syncNode/results');
          }, SYNC_WATCH_DELAY);
        });
    }
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.buffers.stderr = [err.toString()];
        draft.stepStatus[Step.Node_Syncing] = Status.Failure;
      });
  }
});

store.register('wizard/showDashboard', () => {
  flux.dispatch('wizard/overview/goto', Step.Dashboard);
});

store.register(
  'wizard/showSettings',
  () => (state) =>
    produce(state, (draft) => {
      draft.currentStep = Step.Settings;
    }),
);

store.register(
  'wizard/return',
  () => (state) =>
    produce(state, (draft) => {
      // see if we need to return to the dashboard
      if (draft.stepStatus[Step.Dashboard] !== Status.Failure) {
        draft.currentStep = Step.Dashboard;
        return;
      }

      // return to the current pending step that's not settings
      for (let step in draft.stepStatus) {
        let index = Number(step);
        if (isNaN(index)) {
          continue;
        }

        if (
          index !== Step.Settings &&
          draft.stepStatus[index as Step] === Status.Pending
        ) {
          draft.currentStep = index;
          return;
        }
      }
    }),
);

store.register('wizard/setNetwork', async (_, network) => {
  if (nodeAdded) {
    removeNode(`http://localhost:${store.selectState('port')}`);
    nodeAdded = false;
  }

  await window.store.set('network', network);

  return (state) =>
    produce(state, (draft) => {
      draft._network = network;
    });
});

store.register('wizard/setPort', async (_, port) => {
  if (nodeAdded) {
    removeNode(`http://localhost:${store.selectState('port')}`);
    nodeAdded = false;
  }

  await window.store.set('port', port);

  return (state) =>
    produce(state, (draft) => {
      draft._port = port;
    });
});

store.register('wizard/setTelemetry', async (_, nodeName) => {
  await window.store.set('nodeName', nodeName);
  await window.goal.telemetry(nodeName);

  return (state) =>
    produce(state, (draft) => {
      draft.nodeName = nodeName;
    });
});

store.register(
  'wizard/setWindowIndex',
  (_, index) => (state) =>
    produce(state, (draft) => {
      draft.windowIndex = index;
    }),
);

store.register('wizard/stopNode', async () => {
  await window.goal.stop();
  flux.dispatch('wizard/overview/goto', Step.Settings);
});

store.register(
  'wizard/stderr',
  (_, data) => (state) =>
    produce(state, (draft) => void draft.buffers.stderr.push(data)),
);

store.register(
  'wizard/stdout',
  (_, data) => (state) =>
    produce(state, (draft) => void draft.buffers.stdout.push(data)),
);

// changing the network, port, or telemetry requires a node restart
// infraHash is a shortcut to check for that
store.addSelector(
  'infraHash',
  (state) => state._network + state.nodeName + state._port,
);

store.addSelector('isMainWindow', (state) => state.windowIndex === 0);

store.addSelector('networks', () => [
  { label: 'Algorand MainNet', value: 'algorand.mainnet' },
  { label: 'Voi TestNet', value: 'voi.testnet' },
]);

// this code is duplicated in main rather than passing
// these values back and forth with every IPC call
store.addSelector('network', (state) => {
  const isMainWindow = store.selectState('isMainWindow');
  if (isMainWindow) {
    return state._network;
  } else {
    // if we're not the main window, we need to use the other network
    return store
      .selectState('networks')
      .find((network) => network.value !== state._network)!.value;
  }
});
store.addSelector('port', (state) => state._port + state.windowIndex);

store.addSelector(
  'running',
  (state) => state.stepStatus[Step.Dashboard] !== Status.Failure,
);
