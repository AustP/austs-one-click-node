import flux from '@aust/react-flux';
import algosdk from 'algosdk';
import { nodeRequest } from 'algoseas-libs/build/algo';
import { useEffect, useState } from 'react';

import AntennaIcon from '@components/icons/Antenna';
import { abbreviateNumber, formatNumber } from '@/render/utils';

import AccountSelector from './AccountSelector';
import StatNumber from './StatNumber';

export default function Dashboard() {
  const [lastBlock, setLastBlock] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');

  const accounts = flux.accounts.useState('list');
  const totalProposals = flux.accounts.selectState('totalProposals');
  const totalStake = flux.accounts.selectState('totalStake');
  const totalVotes = flux.accounts.selectState('totalVotes');

  useEffect(() => {
    let shouldUpdate = true;

    (async () => {
      const status = await nodeRequest(
        `/v2/status/wait-for-block-after/${lastBlock}`,
      );
      const lastRound = status['last-round'];
      const response = await nodeRequest(
        `/v2/blocks/${lastRound}?format=msgpack`,
      );

      if (shouldUpdate) {
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

        setLastBlock(lastRound);
      }
    })();

    return () => void (shouldUpdate = false);
  }, [accounts, lastBlock]);

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] grow">
      <div className="grid grid-cols-3 grid-rows-2">
        <StatNumber label="Current Block" stat={formatNumber(lastBlock)} />
        <StatNumber label="Blocks Proposed" stat={totalProposals} />
        <StatNumber label="Blocks Verified" stat={totalVotes} />
        <StatNumber label="Accounts" stat={accounts.length} />
        <StatNumber
          label="Participating Stake"
          stat={abbreviateNumber(totalStake / 1000000)}
        />
        <AntennaIcon className="h-16 place-self-center text-slate-200 dark:text-slate-800 w-16" />
      </div>
      <div className="bg-slate-200 dark:bg-slate-800 grow p-4 rounded-md text-sm">
        <AccountSelector
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
        />
      </div>
    </div>
  );
}
