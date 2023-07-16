import flux from '@aust/react-flux';
import { useWallet } from '@txnlab/use-wallet';
import algosdk from 'algosdk';
import { nodeRequest } from 'algoseas-libs/build/algo';
import Dropdown from 'algoseas-libs/build/react/Dropdown';
import { useEffect, useState } from 'react';

import AntennaIcon from '@components/icons/Antenna';
import Button from '@components/shared/Button';
import GearIcon from '@components/icons/Gear';
import HotAirBalloonIcon from '@components/icons/HotAirBalloon';
import KeyIcon from '@components/icons/Key';
import { abbreviateNumber, formatNumber } from '@/render/utils';

import AccountSelector from './AccountSelector';
import StatNumber from './StatNumber';

const EXPIRING_KEYS_THRESHOLD = 200000; // about a week's worth of blocks

export default function Dashboard() {
  const [lastBlock, setLastBlock] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');

  const { connectedAccounts } = useWallet();

  const accounts = flux.accounts.useState('list');
  const totalProposals = flux.accounts.selectState('totalProposals');
  const totalStake = flux.accounts.selectState('totalStake');
  const totalVotes = flux.accounts.selectState('totalVotes');

  const account = flux.accounts.selectState('get', selectedAccount);
  const hasKeys = account?.nodeParticipation.selectionKey !== undefined;
  const participating = flux.accounts.selectState(
    'participating',
    selectedAccount,
  );
  const canRemove = !participating || (participating && !hasKeys);
  const accountConnected = connectedAccounts
    .map((account) => account.address)
    .includes(selectedAccount);
  const keysExpiringSoon =
    (account?.nodeParticipation.voteLast || 0) - lastBlock <
    EXPIRING_KEYS_THRESHOLD;

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
      <div className="bg-slate-200 dark:bg-slate-800 flex flex-col grow p-4 rounded-md text-sm">
        <div className="flex items-center">
          <AccountSelector
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
          />
          {account && (
            <>
              <div className="flex items-center ml-4">
                <div
                  className={`${
                    participating ? 'bg-green-500' : 'bg-red-500'
                  } h-2 mx-2 rounded-full w-2`}
                />
                <div>{!participating && 'Not '}Participating</div>
              </div>
              <div className="flex flex-col grow text-center" />
              <Dropdown
                closeWhenClicked
                preferredX="right"
                render={() => (
                  <div className="bg-slate-100 dark:bg-slate-900 overflow-hidden rounded-md shadow-md text-slate-900 dark:text-slate-100 text-sm">
                    <div
                      className="hover:bg-slate-300 dark:hover:bg-slate-700 border-b border-slate-500 cursor-pointer px-4 py-2"
                      onClick={() =>
                        flux.dispatch('accounts/reset-stats', selectedAccount)
                      }
                    >
                      Reset Stats
                    </div>
                    <div
                      className={`${
                        canRemove
                          ? 'hover:bg-red-600 cursor-pointer'
                          : 'text-slate-500'
                      } px-4 py-2`}
                      onClick={() => {
                        if (canRemove) {
                          flux.dispatch('accounts/remove', selectedAccount);
                          setSelectedAccount('');
                        }
                      }}
                    >
                      Remove Account
                    </div>
                  </div>
                )}
              >
                <GearIcon className="hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer p-1 rounded-md text-slate-700 dark:text-slate-300" />
              </Dropdown>
            </>
          )}
        </div>
        {!account ? (
          <div className="flex flex-col grow items-center justify-center">
            <HotAirBalloonIcon className="h-32 text-slate-300 dark:text-slate-700 opacity-70 w-32" />
            <div className="mb-12 mt-4 text-slate-500">
              Connect an account to get started.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 grow mt-6">
            <div className="flex items-center justify-between">
              <StatNumber
                label={
                  participating ? 'Participating Stake' : 'Available Stake'
                }
                small
                stat={formatNumber(account.algoAmount / 1000000)}
              />
              <StatNumber
                label="Last Proposed Block"
                small
                stat={
                  account.stats.lastProposedBlock > 0
                    ? formatNumber(account.stats.lastProposedBlock)
                    : 'N/A'
                }
              />
              <StatNumber
                label="Blocks Proposed"
                small
                stat={formatNumber(account.stats.proposals)}
              />
              <StatNumber
                label="Blocks Voted"
                small
                stat={formatNumber(account.stats.votes)}
              />
            </div>
            <div className="flex flex-col grow justify-center w-full">
              {!hasKeys ? (
                <div className="flex items-center">
                  <div className="h-32 ml-4 relative w-32">
                    <KeyIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 h-32 text-slate-300 dark:text-slate-700 opacity-70 w-32" />
                    <KeyIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 h-32 text-slate-300 dark:text-slate-700 opacity-70 w-32" />
                    <KeyIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[135deg] h-32 text-slate-300 dark:text-slate-700 opacity-70 w-32" />
                  </div>
                  <div className="flex flex-col grow ml-10 text-slate-700 dark:text-slate-300">
                    <div>
                      <div>No keys have been generated for this account.</div>
                      <div className="mt-4 text-xs">
                        Generating keys takes about five minutes. These keys are
                        used only for consensus, and are incapable of spending
                        funds.
                      </div>
                    </div>
                    <Button className="mt-4 w-fit" onClick={() => {}}>
                      Generate Keys
                    </Button>
                  </div>
                </div>
              ) : (
                <></>
              )}
            </div>
            <div className="flex items-center">
              {participating ? (
                <Button disabled={!accountConnected} onClick={() => {}}>
                  Go Offline
                </Button>
              ) : hasKeys ? (
                <Button disabled={!accountConnected} onClick={() => {}}>
                  Go Online
                </Button>
              ) : null}
              {(participating || hasKeys) && !accountConnected && (
                <div className="ml-4 text-amber-600 dark:text-yellow-500">
                  Connect your account to issue transactions.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
