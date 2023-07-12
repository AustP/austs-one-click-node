import flux, { Store } from '@aust/react-flux';
import { nodeRequest } from 'algoseas-libs/build/algo';
import { produce } from 'immer';

export enum Step {
  Docker_Installed,
  Container_Built,
  Container_Building,
  Container_Running,
  Container_Starting,
  Node_Running,
  Node_Starting,
  Node_Synced,
  Participating,
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
  currentStep: Step;
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
  currentStep: Step.Docker_Installed,
  stepStatus: Object.entries(Step).reduce((acc, [, value]) => {
    if (typeof value === 'string') {
      return acc;
    }

    if (value === Step.Docker_Installed) {
      acc[value] = Status.Pending;
      return acc;
    }

    acc[value] = Status.Failure;
    return acc;
  }, {} as Record<Step, Status>),
}) as any as Store<WizardStoreState>;

store.register(
  'wizard/checkDocker',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Docker_Installed;
      draft.stepStatus[Step.Docker_Installed] = Status.Pending;
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
        draft.stepStatus[Step.Docker_Installed] = Status.Success;
        flux.dispatch('wizard/checkContainerBuilt');
      });
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Docker_Installed] = Status.Failure;
      });
  }
});

store.register(
  'wizard/checkContainerBuilt',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Container_Built;
      draft.stepStatus[Step.Container_Built] = Status.Pending;
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
        draft.stepStatus[Step.Container_Built] = Status.Success;
        flux.dispatch('wizard/buildContainer');
      });
  } else {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Container_Built] = Status.Success;
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
      draft.currentStep = Step.Container_Running;
      draft.stepStatus[Step.Container_Running] = Status.Pending;
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
        draft.stepStatus[Step.Container_Running] = Status.Success;
        flux.dispatch('wizard/startContainer');
      });
  } else {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Container_Running] = Status.Success;
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
    await window.docker.run({ port: 4160 });
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
      draft.currentStep = Step.Node_Running;
      draft.stepStatus[Step.Node_Running] = Status.Pending;
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
        draft.stepStatus[Step.Node_Running] = Status.Success;
        flux.dispatch('wizard/startNode');
      });
  } else {
    return (state) =>
      produce(state, (draft) => {
        draft.stepStatus[Step.Node_Running] = Status.Success;
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

store.register(
  'wizard/checkNodeSynced',
  () => (state) =>
    produce(state, (draft) => {
      draft.buffers = { stderr: [], stdout: [] };
      draft.currentStep = Step.Node_Synced;
      draft.stepStatus[Step.Node_Synced] = Status.Pending;
      flux.dispatch('wizard/checkNodeSynced/results');
    }),
);

// TODO: delete this
store.register(
  'wizard/setStep',
  (_, step: Step, status: Status) => (state) =>
    produce(state, (draft) => {
      draft.currentStep = step;
      draft.stepStatus[step] = status;
    }),
);

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
