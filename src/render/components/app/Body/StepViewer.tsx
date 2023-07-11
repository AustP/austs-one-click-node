import flux from '@aust/react-flux';

import { Status, Step } from '@/render/flux/wizardStore';

import Button from '@components/shared/Button';
import Error from '@components/shared/Error';
import Link from '@components/shared/Link';
import Spinner from '@components/shared/Spinner';

import Flush from './Flush';

export default function StepViewer({
  className = '',
  error,
  status,
  step,
}: {
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
  }

  return null;
}
