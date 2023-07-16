import flux from '@aust/react-flux';
import { DeflyWalletConnect } from '@blockshake/defly-connect';
import {
  WalletProvider,
  useInitializeProviders,
  PROVIDER_ID,
} from '@txnlab/use-wallet';
import { useEffect } from 'react';

import GearIcon from '@components/icons/Gear';
import { Status, Step } from '@/render/flux/wizardStore';

import Column from './Column';
import Dashboard from './Dashboard';
import StatusIndicator from './StatusIndicator';
import StepViewer from './StepViewer';

export default function Body() {
  const buffers = flux.wizard.useState('buffers');
  const step = flux.wizard.selectState('currentStep');
  const stepStatus = flux.wizard.selectState('stepStatus');

  // when the component first loads, load config and start going through the steps
  useEffect(() => void flux.dispatch('wizard/loadConfig'), []);
  useEffect(() => void flux.dispatch('wizard/checkDocker'), []);
  useEffect(() => void flux.dispatch('accounts/load'), []);

  const anyParticipating = flux.accounts.useState('anyParticipating');

  const providers = useInitializeProviders({
    providers: [{ id: PROVIDER_ID.DEFLY, clientStatic: DeflyWalletConnect }],
  });

  return (
    <WalletProvider value={providers}>
      <div className="flex gap-6 grow p-6">
        <Column className="flex flex-col w-1/3">
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
            status={
              step === Step.Dashboard
                ? anyParticipating
                  ? Status.Success
                  : Status.Pending
                : stepStatus[Step.Dashboard]
            }
          />
          <div className="grow" />
          {/* TODO: if it says stop, make the button blue */}
          <div className="bg-green-600 cursor-pointer flex items-center overflow-hidden rounded-md text-slate-100">
            <div className="hover:bg-green-500 border-r border-green-300 grow h-full place-self-center py-2 text-center text-2xl">
              Start
            </div>
            <div className="hover:bg-green-500 h-full flex items-center p-2">
              <GearIcon className="h-5 w-5" />
            </div>
          </div>
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
