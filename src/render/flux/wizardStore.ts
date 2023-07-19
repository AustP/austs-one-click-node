import flux, { Store } from '@aust/react-flux';
import { addNode, nodeRequest } from 'algoseas-libs/build/algo';
import { produce } from 'immer';

const CATCHUP_FINISH_DELAY = 7000; // wait this long after catchup is complete to check if node is synced
const CATCHUP_THRESHOLD = 720000; // catchup is triggered if node is this many blocks behind. ~100 blocks downloaded per sec. ~2 hrs to catchup
const READY_CHECKS_STARTUP = 7; // how many ready checks after startup to consider node synced
const SYNC_WATCH_DELAY = 1000; // how long during syncing to wait between checks

enum CatchUpStatus {
  Unchecked,
  CatchingUp,
  Completed,
  Unneeded,
}

export enum Step {
  Check_Docker_Installed,
  Check_Container_Built,
  Container_Building,
  Check_Container_Running,
  Container_Starting,
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
  port: number;
  stepStatus: Record<Step, Status>;
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
  currentStep: Step.Check_Docker_Installed,
  port: 4160,
  stepStatus: Object.entries(Step).reduce((acc, [, value]) => {
    if (typeof value === 'string') {
      return acc;
    }

    if (value === Step.Check_Docker_Installed) {
      acc[value] = Status.Pending;
      return acc;
    }

    acc[value] = Status.Failure;
    return acc;
  }, {} as Record<Step, Status>),
}) as any as Store<WizardStoreState>;

store.register('wizard/loadConfig', async () => {
  const port = await window.store.get('port');
  return (state) =>
    produce(state, (draft) => {
      draft.port = port;
    });
});

store.register(
  'wizard/checkDocker',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Check_Docker_Installed;
      draft.stepStatus[Step.Check_Docker_Installed] = Status.Pending;
      flux.dispatch('wizard/checkDocker/results');
    }),
);

store.register('wizard/checkDocker/results', async () => {
  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await window.docker.version();
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Docker_Installed] = Status.Success;
        flux.dispatch('wizard/checkContainerBuilt');
      });
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Docker_Installed] = Status.Failure;
      });
  }
});

store.register(
  'wizard/checkContainerBuilt',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Check_Container_Built;
      draft.stepStatus[Step.Check_Container_Built] = Status.Pending;
      flux.dispatch('wizard/checkContainerBuilt/results');
    }),
);

store.register('wizard/checkContainerBuilt/results', async () => {
  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const results = await window.docker.built();
  if (results === '') {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Container_Built] = Status.Success;
        flux.dispatch('wizard/buildContainer');
      });
  } else {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Container_Built] = Status.Success;
        draft.stepStatus[Step.Container_Building] = Status.Success;
        flux.dispatch('wizard/checkContainerRunning');
      });
  }
});

store.register(
  'wizard/buildContainer',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Container_Building;
      draft.stepStatus[Step.Container_Building] = Status.Pending;
      flux.dispatch('wizard/buildContainer/results');
    }),
);

store.register('wizard/buildContainer/results', async () => {
  try {
    await window.docker.build({
      stderr: (data) => flux.dispatch('wizard/stderr', data),
      stdout: (data) => flux.dispatch('wizard/stdout', data),
    });
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Container_Building] = Status.Success;
        flux.dispatch('wizard/checkContainerRunning');
      });
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Container_Building] = Status.Failure;
      });
  }
});

store.register(
  'wizard/checkContainerRunning',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Check_Container_Running;
      draft.stepStatus[Step.Check_Container_Running] = Status.Pending;
      flux.dispatch('wizard/checkContainerRunning/results');
    }),
);

store.register('wizard/checkContainerRunning/results', async () => {
  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const results = await window.docker.running();
  if (results === '') {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Container_Running] = Status.Success;
        flux.dispatch('wizard/startContainer');
      });
  } else {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Container_Running] = Status.Success;
        draft.stepStatus[Step.Container_Starting] = Status.Success;
        flux.dispatch('wizard/checkNodeRunning');
      });
  }
});

store.register(
  'wizard/startContainer',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Container_Starting;
      draft.stepStatus[Step.Container_Starting] = Status.Pending;
      flux.dispatch('wizard/startContainer/results');
    }),
);

store.register('wizard/startContainer/results', async () => {
  // starting is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await window.docker.run();
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Container_Starting] = Status.Success;
        flux.dispatch('wizard/checkNodeRunning');
      });
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.buffers.stderr = [err.toString()];
        draft.stepStatus[Step.Container_Starting] = Status.Failure;
      });
  }
});

store.register(
  'wizard/checkNodeRunning',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Check_Node_Running;
      draft.stepStatus[Step.Check_Node_Running] = Status.Pending;
      flux.dispatch('wizard/checkNodeRunning/results');
    }),
);

store.register('wizard/checkNodeRunning/results', async () => {
  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const results = await window.docker.running();
  if (results === '') {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Node_Running] = Status.Success;
        flux.dispatch('wizard/startNode');
      });
  } else {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Node_Running] = Status.Success;
        draft.stepStatus[Step.Node_Starting] = Status.Success;
        flux.dispatch('wizard/checkNodeSynced');
      });
  }
});

store.register(
  'wizard/startNode',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Node_Starting;
      draft.stepStatus[Step.Node_Starting] = Status.Pending;
      flux.dispatch('wizard/startNode/results');
    }),
);

store.register('wizard/startNode/results', async () => {
  // starting is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await window.goal.start();
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Node_Starting] = Status.Success;
        flux.dispatch('wizard/checkNodeSynced');
      });
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

  return (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Check_Node_Synced;
      draft.stepStatus[Step.Check_Node_Synced] = Status.Pending;
      flux.dispatch('wizard/checkNodeSynced/results');
    });
});

store.register('wizard/checkNodeSynced/results', async () => {
  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    // sometimes when the docker container starts, the node will report as ready
    // even though it is not ready. our workaround is to check for readiness
    // a few times.
    let readyTimes = 0;
    while (readyTimes < READY_CHECKS_STARTUP) {
      await nodeRequest('/ready', { maxRetries: 0 });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      readyTimes++;
    }

    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Node_Synced] = Status.Success;
        draft.stepStatus[Step.Node_Syncing] = Status.Success;
        flux.dispatch('wizard/showDashboard');
      });
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Check_Node_Synced] = Status.Success;
        flux.dispatch('wizard/syncNode');
      });
  }
});

store.register(
  'wizard/syncNode',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Node_Syncing;
      draft.stepStatus[Step.Node_Syncing] = Status.Pending;
      flux.dispatch('wizard/syncNode/results');
    }),
);

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
          setTimeout(() => flux.dispatch('wizard/syncNode/results'), delay);
        });
    }

    if (catchUpStatus === CatchUpStatus.Unchecked) {
      // get the catchpoint for the network
      const catchpoint = (
        await window.goal.catchpoint('algorand.mainnet')
      ).trim();
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
      return (state) =>
        produce(state, (draft) => {
          draft.stepStatus[Step.Node_Syncing] = Status.Success;
          flux.dispatch('wizard/showDashboard');
        });
    } catch (err) {
      // still not synced
      const output = await window.goal.status();
      return (state) =>
        produce(state, (draft) => {
          draft.buffers.stderr = [output];
          draft.catchUpStatus = catchUpStatus;
          setTimeout(
            () => flux.dispatch('wizard/syncNode/results'),
            SYNC_WATCH_DELAY,
          );
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
  return (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Dashboard;
      draft.stepStatus[Step.Dashboard] = Status.Pending;
    });
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
