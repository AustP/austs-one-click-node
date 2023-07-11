import flux, { Store } from '@aust/react-flux';
import { nodeRequest } from 'algoseas-libs/build/algo';
import { produce } from 'immer';

export enum Step {
  Docker_Installed,
  Container_Built,
  Container_Running,
  Node_Running,
  Node_Synced,
  Participating,
}

export enum Status {
  Pending,
  Success,
  Failure,
}

type WizardStoreState = {
  currentStep: Step;
  error: string;
  stepStatus: Record<Step, Status>;
};

declare global {
  interface Flux {
    wizard: Store<WizardStoreState>;
  }
}

const store = flux.addStore('wizard', {
  currentStep: Step.Docker_Installed,
  error: '',
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

store.register('wizard/checkDocker', async (dispatch) => {
  return (state) =>
    produce(state, (draft) => {
      draft.currentStep = Step.Docker_Installed;
      draft.stepStatus[Step.Docker_Installed] = Status.Pending;
      dispatch('wizard/checkDocker/results');
    });
});

store.register('wizard/checkDocker/results', async () => {
  // checking is so fast that we intentionally slow it down for UX
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await window.docker.version();
    return (state) =>
      produce(state, (draft) => {
        draft.currentStep = Step.Container_Built;
        draft.stepStatus[Step.Docker_Installed] = Status.Success;
        draft.stepStatus[Step.Container_Built] = Status.Pending;
      });
  } catch (err) {
    return (state) =>
      produce(state, (draft) => {
        draft.error = err.message;
        draft.stepStatus[Step.Docker_Installed] = Status.Failure;
      });
  }
});
