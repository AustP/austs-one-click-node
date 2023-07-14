import flux from '@aust/react-flux';
import { DeflyWalletConnect } from '@blockshake/defly-connect';
import {
  WalletProvider,
  useInitializeProviders,
  PROVIDER_ID,
} from '@txnlab/use-wallet';
import { useEffect } from 'react';

import Column from './Column';
import Dashboard from './Dashboard';
import StatusIndicator from './StatusIndicator';
import StepViewer from './StepViewer';
import { Step } from '@/render/flux/wizardStore';

export default function Body() {
  const buffers = flux.wizard.useState('buffers');
  const step = flux.wizard.selectState('currentStep');
  const stepStatus = flux.wizard.selectState('stepStatus');

  // when the component first loads, load config and start going through the steps
  useEffect(() => void flux.dispatch('wizard/loadConfig'), []);
  // useEffect(() => void flux.dispatch('wizard/checkDocker'), []);
  useEffect(() => void flux.dispatch('wizard/checkNodeSynced'), []);

  const providers = useInitializeProviders({
    providers: [{ id: PROVIDER_ID.DEFLY, clientStatic: DeflyWalletConnect }],
  });

  return (
    <WalletProvider value={providers}>
      <div className="flex gap-6 grow p-6">
        <Column className="w-1/3">
          <div className="font-light mb-6 text-xl">Node Overview</div>
          <StatusIndicator
            active={step === Step.Check_Docker_Installed}
            label="Docker Installed"
            status={stepStatus[Step.Check_Docker_Installed]}
          />
          <StatusIndicator
            active={
              step === Step.Check_Container_Built ||
              step === Step.Container_Building
            }
            className="mt-2"
            label="Container Built"
            status={
              step === Step.Check_Container_Built
                ? stepStatus[Step.Check_Container_Built]
                : stepStatus[Step.Container_Building]
            }
          />
          <StatusIndicator
            active={
              step === Step.Check_Container_Running ||
              step === Step.Container_Starting
            }
            className="mt-2"
            label="Container Running"
            status={
              step === Step.Check_Container_Running
                ? stepStatus[Step.Check_Container_Running]
                : stepStatus[Step.Container_Starting]
            }
          />
          <StatusIndicator
            active={
              step === Step.Check_Node_Running || step === Step.Node_Starting
            }
            className="mt-2"
            label="Node Running"
            status={
              step === Step.Check_Node_Running
                ? stepStatus[Step.Check_Node_Running]
                : stepStatus[Step.Node_Starting]
            }
          />
          <StatusIndicator
            active={
              step === Step.Check_Node_Synced || step === Step.Node_Syncing
            }
            className="mt-2"
            label="Node Synced"
            status={
              step === Step.Check_Node_Synced
                ? stepStatus[Step.Check_Node_Synced]
                : stepStatus[Step.Node_Syncing]
            }
          />
          <StatusIndicator
            active={step === Step.Dashboard}
            className="mt-2"
            label="Participating in Consensus"
            status={stepStatus[Step.Dashboard]}
          />
        </Column>
        {step === Step.Dashboard ? (
          <Dashboard />
        ) : (
          <StepViewer
            buffers={buffers}
            className="grow"
            status={stepStatus[step]}
            step={step}
          />
        )}
      </div>
    </WalletProvider>
  );
}
