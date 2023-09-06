import flux from '@aust/react-flux';
import { DeflyWalletConnect } from '@blockshake/defly-connect';
import {
  WalletProvider,
  useInitializeProviders,
  PROVIDER_ID,
} from '@txnlab/use-wallet';
import { useEffect, useState } from 'react';

import Button from '@components/shared/Button';
import GearIcon from '@components/icons/Gear';
import UndoIcon from '@components/icons/Undo';
import Spinner from '@components/shared/Spinner';
import { Status, Step } from '@/render/flux/wizardStore';

import Column from './Column';
import Dashboard from './Dashboard';
import Settings from './Settings';
import StatusIndicator from './StatusIndicator';
import StepViewer from './StepViewer';

export default function Body() {
  const buffers = flux.wizard.useState('buffers');
  const network = flux.wizard.selectState('network');
  const networks = flux.wizard.selectState('networks');
  const step = flux.wizard.selectState('currentStep');
  const stepStatus = flux.wizard.selectState('stepStatus');

  const [nodeStatus, setNodeStatus] = useState('starting');
  const checkNodeRunningStatus = stepStatus[Step.Check_Node_Running];
  const nodeSyncedStatus = stepStatus[Step.Node_Syncing];
  useEffect(() => {
    if (nodeStatus === 'stopped' && checkNodeRunningStatus === Status.Pending) {
      setNodeStatus('starting');
    }

    if (nodeStatus === 'starting' && nodeSyncedStatus === Status.Success) {
      setNodeStatus('started');
    }

    if (nodeStatus === 'started' && nodeSyncedStatus !== Status.Success) {
      setNodeStatus('stopped');
    }
  }, [checkNodeRunningStatus, nodeStatus, nodeSyncedStatus]);

  // when the component first loads, load config and start going through the steps
  useEffect(() => void flux.dispatch('wizard/loadConfig'), []);
  useEffect(() => void flux.dispatch('wizard/checkNodeRunning'), []);

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
            active={
              stepStatus[Step.Check_Node_Running] === Status.Pending ||
              stepStatus[Step.Node_Starting] === Status.Pending
            }
            className="mt-2"
            label="Node Running"
            status={
              stepStatus[Step.Check_Node_Running] !== Status.Success
                ? stepStatus[Step.Check_Node_Running]
                : stepStatus[Step.Node_Starting]
            }
          />
          <StatusIndicator
            active={
              stepStatus[Step.Check_Node_Synced] === Status.Pending ||
              stepStatus[Step.Node_Syncing] === Status.Pending
            }
            className="mt-2"
            label="Node Synced"
            status={
              stepStatus[Step.Check_Node_Synced] !== Status.Success
                ? stepStatus[Step.Check_Node_Synced]
                : stepStatus[Step.Node_Syncing]
            }
          />
          <StatusIndicator
            active={stepStatus[Step.Dashboard] !== Status.Failure}
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
          <div className="mb-2 text-sm text-slate-500">
            Connected to {networks.find((n) => n.value === network)!.label}
          </div>
          <div className="flex items-stretch overflow-hidden rounded-md">
            <Button
              className={`${
                nodeStatus === 'stopped' || nodeStatus === 'starting'
                  ? '!bg-green-600 !border-green-700'
                  : ''
              } border-r border-sky-700 dark:border-sky-950 flex grow items-center justify-center !rounded-none text-xl`}
              disabled={nodeStatus === 'starting' || nodeStatus === 'stopping'}
              onClick={async () => {
                if (nodeStatus === 'stopped') {
                  flux.dispatch('wizard/checkNodeRunning');
                } else if (nodeStatus === 'started') {
                  setNodeStatus('stopping');
                  await flux.dispatch('wizard/stopNode');
                  setNodeStatus('stopped');
                }
              }}
            >
              {(nodeStatus === 'starting' || nodeStatus === 'stopping') && (
                <Spinner className="!h-6 mr-2 !w-6" />
              )}
              {nodeStatus === 'stopped'
                ? 'Start'
                : nodeStatus === 'starting'
                ? 'Starting...'
                : nodeStatus === 'started'
                ? 'Stop'
                : nodeStatus === 'stopping'
                ? 'Stopping...'
                : null}
            </Button>
            <Button
              className={`${
                nodeStatus === 'stopped' || nodeStatus === 'starting'
                  ? '!bg-green-600 !hover:bg-green-500 !text-slate-50'
                  : ''
              } flex items-center justify-center !rounded-none`}
              onClick={() => {
                if (
                  step === Step.Settings &&
                  stepStatus[Step.Settings] !== Status.Pending
                ) {
                  flux.dispatch('wizard/return');
                } else {
                  flux.dispatch('wizard/showSettings');
                }
              }}
            >
              {step === Step.Settings &&
              stepStatus[Step.Settings] !== Status.Pending ? (
                <UndoIcon className="h-5 w-5" />
              ) : (
                <GearIcon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </Column>
        {step === Step.Dashboard ? (
          <Dashboard />
        ) : step === Step.Settings ? (
          <Settings />
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
