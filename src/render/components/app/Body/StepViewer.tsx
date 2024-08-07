import flux from '@aust/react-flux';
import { useEffect } from 'react';

import { Status, Step } from '@/render/flux/wizardStore';

import Button from '@components/shared/Button';
import Console from '@components/shared/Console';
import Error from '@components/shared/Error';
import Spinner from '@components/shared/Spinner';

import Flush from './Flush';

const RETRY_SYNC_INTERVAL = 60000; // wait this long to retry syncing after failure

export default function StepViewer({
  buffers,
  className = '',
  status,
  step,
}: {
  buffers: {
    stderr: string[];
    stdout: string[];
  };
  className?: string;
  status: Status;
  step: Step;
}) {
  const retrySync = step === Step.Node_Syncing && status === Status.Failure;
  useEffect(() => {
    if (retrySync) {
      const timeout = setTimeout(
        () => flux.dispatch('wizard/syncNode'),
        RETRY_SYNC_INTERVAL,
      );
      return () => clearTimeout(timeout);
    }
  }, [retrySync]);

  switch (step) {
    case Step.Check_Node_Running:
      switch (status) {
        case Status.Pending:
          return (
            <Flush className={className}>
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Checking that the node is running...</div>
              </div>
            </Flush>
          );
        // failures go directly to Node_Starting
      }

    case Step.Node_Starting:
      switch (status) {
        case Status.Pending:
          return (
            <Flush className={className}>
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Starting the node...</div>
              </div>
            </Flush>
          );
        case Status.Failure:
          return (
            <Flush className={className}>
              <div>The node could not be started. Please try again later.</div>
              <Button
                className="mt-4"
                onClick={() => flux.dispatch('wizard/startNode')}
              >
                Try Again
              </Button>
              <Error className="mt-8">{buffers.stderr}</Error>
            </Flush>
          );
      }

    case Step.Check_Node_Synced:
      switch (status) {
        case Status.Pending:
          return (
            <Flush className={className}>
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Checking that the node is synced...</div>
              </div>
            </Flush>
          );
        // failures go directly to Node_Syncing
      }

    case Step.Node_Syncing:
      switch (status) {
        case Status.Pending:
          return (
            <Flush
              className={`flex flex-col h-[calc(100vh-128px)] w-[calc(67vw-72px)] ${className}`}
            >
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Syncing the node... (Syncing can take a few hours)</div>
              </div>
              {buffers.stderr.length > 0 && (
                <Console className="mt-8">{buffers.stderr}</Console>
              )}
            </Flush>
          );
        case Status.Failure:
          return (
            <Flush
              className={`flex flex-col h-[calc(100vh-128px)] w-[calc(67vw-72px)] ${className}`}
            >
              <div>
                The node could not be synced. Please make sure you are connected
                to the internet and have at least 20GB of free hard drive space.
              </div>
              <Button
                className="mt-4 w-fit"
                onClick={() => flux.dispatch('wizard/syncNode')}
              >
                Try Again
              </Button>
              {buffers.stderr.length > 0 && (
                <Console className="mt-8">{buffers.stderr}</Console>
              )}
            </Flush>
          );
      }

    // dashboard is it's own component
    // settings is it's own component
  }

  return null;
}
