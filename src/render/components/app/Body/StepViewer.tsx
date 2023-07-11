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
  error,
  status,
  step,
}: {
  buffers: {
    stderr: string[];
    stdout: string[];
  };
  className?: string;
  error: string;
  status: Status;
  step: Step;
}) {
  switch (step) {
    case Step.Docker_Installed:
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
              <Error className="mt-8">{error}</Error>
            </Flush>
          );
      }

    case Step.Container_Built:
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
      }

    case Step.Container_Building:
      switch (status) {
        case Status.Pending:
          return (
            <Flush
              className={`flex flex-col h-[calc(100vh-124px)] w-[calc(67vw-124px)] ${className}`}
            >
              <div className="flex items-center gap-2">
                <Spinner className="!h-6 !w-6" />
                <div>Building the container...</div>
              </div>
              <Console className="mt-6">{buffers.stderr}</Console>
            </Flush>
          );
        case Status.Failure:
          return (
            <Flush
              className={`flex flex-col h-[calc(100vh-124px)] w-[calc(67vw-124px)] ${className}`}
            >
              <Error>The container could not be built.</Error>
              <Console className="mt-6">{buffers.stderr}</Console>
            </Flush>
          );
      }
  }

  return null;
}
