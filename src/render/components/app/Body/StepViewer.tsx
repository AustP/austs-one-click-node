import flux from '@aust/react-flux';

import { Status, Step } from '@/render/flux/wizardStore';

import Button from '@components/shared/Button';
import Console from '@components/shared/Console';
import Error from '@components/shared/Error';
import Link from '@components/shared/Link';
import Spinner from '@components/shared/Spinner';

import Flush from './Flush';

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
  switch (step) {
    case Step.Check_Docker_Installed:
      switch (status) {
        case Status.Pending:
          return (
            <Flush className={className}>
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Checking that Docker is installed...</div>
              </div>
            </Flush>
          );
        case Status.Failure:
          return (
            <Flush className={className}>
              <div>
                It seems that docker has not been installed on your system.
                Please download and install docker before continuing. View the{' '}
                <Link href="https://docs.docker.com/get-docker/">
                  official docker documentation
                </Link>{' '}
                for more information.
              </div>
              <Button
                className="mt-4"
                onClick={() => flux.dispatch('wizard/checkDocker')}
              >
                Check Again
              </Button>
            </Flush>
          );
      }

    case Step.Check_Container_Built:
      switch (status) {
        case Status.Pending:
          return (
            <Flush className={className}>
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Checking that the container is built...</div>
              </div>
            </Flush>
          );
        // failures go directly to Container_Building
      }

    case Step.Container_Building:
      switch (status) {
        case Status.Pending:
          return (
            <Flush
              className={`flex flex-col h-[calc(100vh-128px)] w-[calc(67vw-124px)] ${className}`}
            >
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Building the container...</div>
              </div>
              {buffers.stderr.length > 0 && (
                <Console className="mt-8">{buffers.stderr}</Console>
              )}
            </Flush>
          );
        case Status.Failure:
          return (
            <Flush
              className={`flex flex-col h-[calc(100vh-128px)] w-[calc(67vw-124px)] ${className}`}
            >
              <div>
                The container could not be built. Please make sure you are
                connected to the internet and have at least 1GB of free hard
                drive space.
              </div>
              <Button
                className="mt-4 w-fit"
                onClick={() => flux.dispatch('wizard/buildContainer')}
              >
                Try Again
              </Button>
              {buffers.stderr.length > 0 && (
                <Console className="mt-8">{buffers.stderr}</Console>
              )}
            </Flush>
          );
      }

    case Step.Check_Container_Running:
      switch (status) {
        case Status.Pending:
          return (
            <Flush className={className}>
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Checking that the container is running...</div>
              </div>
            </Flush>
          );
        // failures go directly to Container_Starting
      }

    case Step.Container_Starting:
      switch (status) {
        case Status.Pending:
          return (
            <Flush className={className}>
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Starting the container...</div>
              </div>
            </Flush>
          );
        case Status.Failure:
          return (
            <Flush className={className}>
              <div>
                The container could not be started. Try changing the port number
                to something higher and try again.
              </div>
              <Button
                className="mt-4"
                onClick={() => flux.dispatch('wizard/startContainer')}
              >
                Try Again
              </Button>
              <Error className="mt-8">{buffers.stderr}</Error>
            </Flush>
          );
      }

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
              className={`flex flex-col h-[calc(100vh-128px)] w-[calc(67vw-124px)] ${className}`}
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
              className={`flex flex-col h-[calc(100vh-128px)] w-[calc(67vw-124px)] ${className}`}
            >
              <div>
                The node could not be synced. Please make sure you are connected
                to the internet and have at least 1GB of free hard drive space.
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
  }

  return null;
}
