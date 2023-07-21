import flux, { Store } from '@aust/react-flux';
import { addNode, nodeRequest, removeNode } from 'algoseas-libs/build/algo';
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
  Settings,
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

  // selectors
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
  'wizard/overview/goto',
  (_, step) => (state) =>
    produce(state, (draft) => {
      // make sure the last step is still good
      if (
        step > 0 &&
        draft.stepStatus[
          (step - (step - 1 === Step.Settings ? 2 : 1)) as Step
        ] !== Status.Success
      ) {
        return;
      }

      // the settings page can restart the node,
      // but we want the user to stay on the settings page
      if (draft.currentStep !== Step.Settings) {
        draft.currentStep = step;
      }

      draft.buffers = { stderr: [], stdout: [] };

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

store.register('wizard/checkContainerBuilt', () => {
  flux.dispatch('wizard/overview/goto', Step.Check_Container_Built);
  flux.dispatch('wizard/checkContainerBuilt/results');
});

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

store.register('wizard/buildContainer', () => {
  flux.dispatch('wizard/overview/goto', Step.Container_Building);
  flux.dispatch('wizard/buildContainer/results');
});

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

store.register('wizard/checkContainerRunning', (_, follow) => {
  return (state) =>
    produce(state, (draft) => {
      if (follow) {
        draft.currentStep = Step.Check_Container_Running;
      }

      flux.dispatch('wizard/overview/goto', Step.Check_Container_Running);
      flux.dispatch('wizard/checkContainerRunning/results');
    });
});

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

store.register('wizard/startContainer', () => {
  flux.dispatch('wizard/overview/goto', Step.Container_Starting);
  flux.dispatch('wizard/startContainer/results');
});

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

store.register('wizard/checkNodeRunning', () => {
  flux.dispatch('wizard/overview/goto', Step.Check_Node_Running);
  flux.dispatch('wizard/checkNodeRunning/results');
});

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

store.register('wizard/startNode', () => {
  flux.dispatch('wizard/overview/goto', Step.Node_Starting);
  flux.dispatch('wizard/startNode/results');
});

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

  flux.dispatch('wizard/overview/goto', Step.Check_Node_Synced);
  flux.dispatch('wizard/checkNodeSynced/results');
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

store.register('wizard/syncNode', () => {
  flux.dispatch('wizard/overview/goto', Step.Node_Syncing);
  flux.dispatch('wizard/syncNode/results');

  return (state) =>
    produce(state, (draft) => {
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

      // see if we need to return to checking Docker Installation
      if (draft.stepStatus[Step.Check_Docker_Installed] === Status.Failure) {
        draft.currentStep = Step.Check_Docker_Installed;
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

store.register('wizard/setPort', async (_, port) => {
  if (nodeAdded) {
    removeNode(`http://localhost:${store.selectState('port')}`);
    nodeAdded = false;
  }

  await window.electron.setPort(port);
  await window.docker.remap();

  return (state) =>
    produce(state, (draft) => {
      draft.port = port;
    });
});

store.register('wizard/stopNode', async () => {
  await window.docker.stop();
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

store.addSelector(
  'running',
  (state) => state.stepStatus[Step.Dashboard] !== Status.Failure,
);
