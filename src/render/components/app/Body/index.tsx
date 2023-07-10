import Button from '@components/shared/Button';
import Link from '@components/shared/Link';

import Column from './Column';
import StatusIndicator from './StatusIndicator';

export default function Body() {
  return (
    <div className="flex gap-6 grow p-6">
      <Column className="w-1/3">
        <div className="font-light mb-6 text-xl">Node Overview</div>
        <StatusIndicator active label="Docker Installed" status="failed" />
        <StatusIndicator
          className="mt-2"
          label="Container Built"
          status="failed"
        />
        <StatusIndicator
          active
          className="mt-2"
          label="Container Running"
          status="failed"
        />
        <StatusIndicator
          className="mt-2"
          label="Node Running"
          status="failed"
        />
        <StatusIndicator
          className="mt-2"
          label="Node Caught Up"
          status="failed"
        />
        <StatusIndicator
          className="mt-2"
          label="Participating in Consensus"
          status="failed"
        />
      </Column>
      <div className="grow pt-4 text-slate-700 dark:text-slate-300 text-sm">
        <div>
          It seems that docker has not been installed on your system. Please
          download and install docker before continuing. View the{' '}
          <Link href="https://docs.docker.com/get-docker/">
            official docker documentation
          </Link>{' '}
          for more information.
        </div>
        <Button className="mt-4" onClick={() => {}}>
          Check Again
        </Button>
      </div>
    </div>
  );
}
