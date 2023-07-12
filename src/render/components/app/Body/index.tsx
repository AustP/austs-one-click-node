import flux from '@aust/react-flux';
import { useEffect } from 'react';

import Column from './Column';
import StatusIndicator from './StatusIndicator';
import StepViewer from './StepViewer';
import { Step } from '@/render/flux/wizardStore';

export default function Body() {
  const buffers = flux.wizard.useState('buffers');
  const step = flux.wizard.selectState('currentStep');
  const stepStatus = flux.wizard.selectState('stepStatus');

  // when the component first loads, start going through the steps
  useEffect(() => void flux.dispatch('wizard/checkDocker'), []);

  return (
    <div className="flex gap-6 grow p-6">
      <Column className="w-1/3">
        <div className="font-light mb-6 text-xl">Node Overview</div>
        <StatusIndicator
          active={step === Step.Docker_Installed}
          label="Docker Installed"
          status={stepStatus[Step.Docker_Installed]}
        />
        <StatusIndicator
          active={
            step === Step.Container_Built || step === Step.Container_Building
          }
          className="mt-2"
          label="Container Built"
          status={
            step === Step.Container_Built
              ? stepStatus[Step.Container_Built]
              : stepStatus[Step.Container_Building]
          }
        />
        <StatusIndicator
          active={
            step === Step.Container_Running || step === Step.Container_Starting
          }
          className="mt-2"
          label="Container Running"
          status={
            step === Step.Container_Running
              ? stepStatus[Step.Container_Running]
              : stepStatus[Step.Container_Starting]
          }
        />
        <StatusIndicator
          active={step === Step.Node_Running}
          className="mt-2"
          label="Node Running"
          status={stepStatus[Step.Node_Running]}
        />
        <StatusIndicator
          active={step === Step.Node_Synced}
          className="mt-2"
          label="Node Synced"
          status={stepStatus[Step.Node_Synced]}
        />
        <StatusIndicator
          active={step === Step.Participating}
          className="mt-2"
          label="Participating in Consensus"
          status={stepStatus[Step.Participating]}
        />
      </Column>
      <StepViewer
        buffers={buffers}
        className="grow"
        status={stepStatus[step]}
        step={step}
      />
    </div>
  );
}
