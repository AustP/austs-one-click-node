import flux from '@aust/react-flux';
import algosdk from 'algosdk';
import { nodeRequest } from 'algoseas-libs/build/algo';
import { useEffect, useState } from 'react';

import AntennaIcon from '@components/icons/Antenna';
import { Step } from '@/render/flux/wizardStore';
import { abbreviateNumber, formatNumber } from '@/render/utils';

import AccountViewer from './AccountViewer';
import StatNumber from './StatNumber';

const HEALTH_INTERVAL = 15000; // if we haven't seen a block for 15 seconds, do a health check
const PARTICIPATION_INTERVAL = 10; // every 10 blocks we will check for participation

export default function Dashboard() {
  const [lastBlock, setLastBlock] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');

  const accounts = flux.accounts.useState('list');
  const totalProposals = flux.accounts.selectState('totalProposals');
  const totalStake = flux.accounts.selectState('totalStake');
  const totalVotes = flux.accounts.selectState('totalVotes');

  useEffect(() => {
    let terminated = false;

    async function fetchBlockAfter(blockNumber: number) {
      let timeout = setTimeout(() => {
        if (flux.wizard.selectState('currentStep') === Step.Dashboard) {
          flux.dispatch('wizard/checkContainerRunning');
        }
      }, HEALTH_INTERVAL);

      try {
        const status = await nodeRequest(
          `/v2/status/wait-for-block-after/${blockNumber}`,
          { fetchTimeoutMs: HEALTH_INTERVAL, maxRetries: 0 },
        );
        clearTimeout(timeout);
        if (terminated) {
          return;
        }

        const lastRound = status['last-round'];
        const response = await nodeRequest(
          `/v2/blocks/${lastRound}?format=msgpack`,
        );

        const accounts = flux.accounts.selectState('list');
        const proposer = algosdk.encodeAddress(response.cert.prop.oprop);
        // check if any of our accounts were the proposer
        for (const account of accounts) {
          if (account === proposer) {
            flux.dispatch('accounts/stats/addProposal', account, lastRound);
            break;
          }
        }

        for (const vote of response.cert.vote) {
          const voter = algosdk.encodeAddress(vote.snd);
          // check if any of our accounts were voters
          for (const account of accounts) {
            if (account === voter) {
              flux.dispatch('accounts/stats/addVote', account);
              break;
            }
          }
        }

        // every 10 blocks, check all of our accounts for participation
        if (lastRound % PARTICIPATION_INTERVAL === 0) {
          let promises = [];
          for (const account of accounts) {
            promises.push(flux.dispatch('accounts/add', account, false));
          }

          await Promise.all(promises);
          flux.dispatch('accounts/save');
        }

        setLastBlock(lastRound);
        fetchBlockAfter(lastRound);
      } catch (err) {
        // any errors means the node is not running
        // our health check will fix it, so just ignore
        console.error(err);
      }
    }

    fetchBlockAfter(0);

    return () => void (terminated = true);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] w-[calc(67vw-72px)]">
      <div className="grid grid-cols-3 grid-rows-2">
        <StatNumber label="Current Block" stat={formatNumber(lastBlock)} />
        <StatNumber
          label="Blocks Proposed"
          stat={formatNumber(totalProposals)}
        />
        <StatNumber label="Blocks Voted" stat={formatNumber(totalVotes)} />
        <StatNumber label="Accounts" stat={formatNumber(accounts.length)} />
        <StatNumber
          label="Participating Stake"
          stat={abbreviateNumber(totalStake / 1000000)}
        />
        <AntennaIcon className="h-16 place-self-center text-slate-200 dark:text-slate-800 w-16" />
      </div>
      <AccountViewer
        lastBlock={lastBlock}
        selectedAccount={selectedAccount}
        setSelectedAccount={setSelectedAccount}
      />
    </div>
  );
}
