import flux from '@aust/react-flux';
import { useWallet } from '@txnlab/use-wallet';
import { TransactionGroup } from 'algoseas-libs/build/algo';
import Dropdown from 'algoseas-libs/build/react/Dropdown';
import { useCallback, useState } from 'react';

import Button from '@components/shared/Button';
import CopySnippet from '@components/shared/CopySnippet';
import Error from '@components/shared/Error';
import GearIcon from '@components/icons/Gear';
import HotAirBalloonIcon from '@components/icons/HotAirBalloon';
import KeyIcon from '@components/icons/Key';
import Spinner from '@components/shared/Spinner';
import { formatNumber } from '@/render/utils';

import AccountSelector from './AccountSelector';
import StatNumber from './StatNumber';

const EXPIRING_KEYS_THRESHOLD = 268800; // about two week's worth of blocks
const PARTICIPATION_PERIOD = 3000000; // about 3 months worth of blocks
const SIGNING_TIMEOUT = 15000;
const STATS_URL =
  'https://vp2apscqbf2e57yys6x4iczcyi0znuce.lambda-url.us-west-2.on.aws/';

const PARTICIPATING_NOTE = new Uint8Array(
  Array.from("Participating from Aust's One-Click Node.", (c) =>
    c.charCodeAt(0),
  ),
);

export default function AccountViewer({
  className = '',
  lastBlock,
  selectedAccount,
  setSelectedAccount,
}: {
  className?: string;
  lastBlock: number;
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}) {
  const { connectedAccounts, signTransactions } = useWallet();
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [waitingFor, setWaitingFor] = useState<'' | 'signature' | 'submission'>(
    '',
  );
  const [submissionError, setSubmissionError] = useState('');

  const account = flux.accounts.selectState('get', selectedAccount);
  const hasKeys = account?.nodeParticipation.selectionKey !== undefined;
  const participating = flux.accounts.selectState(
    'participating',
    selectedAccount,
  );
  const sameKeys =
    account?.chainParticipation.voteKey === account?.nodeParticipation.voteKey;
  const canRemove = !generatingKeys && !(participating && sameKeys);
  const accountConnected = connectedAccounts
    .map((account) => account.address)
    .includes(selectedAccount);
  const keysExpiringSoon =
    (account?.nodeParticipation.voteLast || 0) - lastBlock <
    EXPIRING_KEYS_THRESHOLD;

  const generateKeys = useCallback(async () => {
    setGenerationError('');
    setGeneratingKeys(true);

    try {
      await window.goal.addpartkey({
        account: selectedAccount,
        firstValid: lastBlock,
        lastValid: lastBlock + PARTICIPATION_PERIOD,
      });

      // if we re-add the account, it will load the key information
      await flux.dispatch('accounts/add', selectedAccount);

      const account = flux.accounts.selectState('get', selectedAccount);
      fetch(STATS_URL, {
        body: JSON.stringify({
          address: selectedAccount,
          key: account.nodeParticipation.voteKey,
          type: 'keygen',
        }),
        method: 'POST',
      });
    } catch (err) {
      setGenerationError(err.toString());
    }

    setGeneratingKeys(false);
  }, [lastBlock, selectedAccount]);

  const signAndSubmit = useCallback(
    async (group: TransactionGroup) => {
      try {
        setSubmissionError('');
        setWaitingFor('signature');
        await group.makeTxns();

        const txns = await Promise.race([
          signTransactions(group.toUint8Array(), undefined, false),
          new Promise((_, reject) =>
            setTimeout(() => reject('Signing timed out.'), SIGNING_TIMEOUT),
          ) as Promise<never>,
        ]);
        group.storeSignatures(txns);

        setWaitingFor('submission');

        await Promise.race([
          group.submit(),
          new Promise((_, reject) =>
            setTimeout(() => reject('Submission timed out.'), SIGNING_TIMEOUT),
          ) as Promise<never>,
        ]);

        // re-load the account to get the new key information
        flux.dispatch('accounts/add', selectedAccount);
      } catch (err) {
        setSubmissionError(err.toString());
      }

      setWaitingFor('');
    },
    [selectedAccount, signTransactions],
  );

  return (
    <div
      className={`bg-slate-200 dark:bg-slate-800 flex flex-col h-[calc(100vh-336px)] p-4 rounded-md text-sm ${className}`}
    >
      <div className="flex items-center">
        <AccountSelector
          disabled={generatingKeys}
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
                      !generatingKeys
                        ? 'hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer'
                        : 'text-slate-500'
                    } border-b border-slate-500 px-4 py-2`}
                    onClick={() => {
                      if (!generatingKeys) {
                        generateKeys();
                      }
                    }}
                  >
                    {hasKeys ? 'Re-' : ''}Generate Keys
                  </div>
                  {hasKeys && (
                    <div
                      className={`${
                        !participating || !sameKeys
                          ? 'hover:bg-red-600 cursor-pointer hover:text-slate-100'
                          : 'text-slate-500'
                      } border-b border-slate-500 px-4 py-2`}
                      onClick={async () => {
                        if (!participating || !sameKeys) {
                          await window.goal.deletepartkey(
                            account.nodeParticipation.id!,
                          );
                          // re-load the account to get the new key information
                          flux.dispatch('accounts/add', selectedAccount);
                        }
                      }}
                    >
                      Remove Keys
                    </div>
                  )}
                  <div
                    className={`${
                      canRemove
                        ? 'hover:bg-red-600 cursor-pointer hover:text-slate-100'
                        : 'text-slate-500'
                    } px-4 py-2`}
                    onClick={async () => {
                      if (canRemove) {
                        await flux.dispatch('accounts/remove', selectedAccount);
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
        <>
          <div className="flex flex-col gap-4 grow my-4 -mx-4 overflow-y-auto px-4">
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
              {!hasKeys || generatingKeys ? (
                <div className="flex items-center">
                  <div className="h-20 ml-4 relative shrink-0 w-20">
                    <KeyIcon className="absolute h-32 left-1/2 opacity-70 -rotate-45 text-slate-300 dark:text-slate-700 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32" />
                    <KeyIcon className="absolute h-32 left-1/2 opacity-70 -rotate-90 text-slate-300 dark:text-slate-700 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32" />
                    <KeyIcon className="absolute h-32 left-1/2 opacity-70 -rotate-[135deg] text-slate-300 dark:text-slate-700 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32" />
                  </div>
                  <div className="flex flex-col grow ml-10 text-slate-700 dark:text-slate-300">
                    <div>
                      {generatingKeys ? (
                        <div className="flex items-center gap-2">
                          <Spinner className="!h-6 !w-6" />
                          <div>Generating keys...</div>
                        </div>
                      ) : (
                        <div>No keys have been generated for this account.</div>
                      )}
                      <div className="mt-4 text-xs">
                        Generating keys takes about five minutes. These keys are
                        used only for consensus, and are incapable of spending
                        funds.
                      </div>
                    </div>
                    <Button
                      className={`${
                        generatingKeys ? 'h-0 invisible' : 'mt-4'
                      } w-fit`}
                      disabled={generatingKeys}
                      onClick={generateKeys}
                    >
                      Generate Keys
                    </Button>
                    {generationError && (
                      <Error className="max-h-24 mt-4 overflow-auto">
                        Failed to generate keys: {generationError}
                      </Error>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="gap-2 grid grid-cols-4 items-center">
                    <div>Vote Key</div>
                    <CopySnippet className="col-span-3">
                      {account.nodeParticipation.voteKey}
                    </CopySnippet>
                    <div>Selection Key</div>
                    <CopySnippet className="col-span-3">
                      {account.nodeParticipation.selectionKey}
                    </CopySnippet>
                    <div>State Proof Key</div>
                    <CopySnippet className="col-span-3">
                      {account.nodeParticipation.stateProofKey}
                    </CopySnippet>
                  </div>
                  <div className="gap-2 grid grid-cols-3 items-center mt-2">
                    <StatNumber
                      label="Vote First Round"
                      small
                      stat={formatNumber(account.nodeParticipation.voteFirst!)}
                    />
                    <StatNumber
                      label="Vote Last Round"
                      small
                      stat={formatNumber(account.nodeParticipation.voteLast!)}
                    />
                    <StatNumber
                      label="Vote Key Dilution"
                      small
                      stat={formatNumber(
                        account.nodeParticipation.voteKeyDilution!,
                      )}
                    />
                  </div>
                  {!sameKeys && participating ? (
                    <div className="mt-4 text-amber-600 text-xs dark:text-yellow-500">
                      This account is participating with different keys than the
                      ones shown here.
                    </div>
                  ) : (
                    keysExpiringSoon && (
                      <div className="flex items-center mt-4">
                        <Button onClick={generateKeys}>Renew Keys</Button>
                        <div className="ml-4 text-amber-600 text-xs dark:text-yellow-500">
                          Renew your keys to continue participating.
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {hasKeys && (!participating || !sameKeys) ? (
              <Button
                className="!bg-green-600 !hover:bg-green-500 flex gap-4 items-center whitespace-nowrap"
                disabled={!accountConnected || waitingFor !== ''}
                onClick={async () => {
                  const group = new TransactionGroup({
                    description:
                      'This transaction will register your account online.',
                    name: 'Go Online',
                  });

                  group.addOnlineKeyReg(
                    {
                      from: selectedAccount,
                      note: PARTICIPATING_NOTE,
                      selectionKey: account.nodeParticipation.selectionKey!,
                      stateProofKey: account.nodeParticipation.stateProofKey!,
                      voteFirst: account.nodeParticipation.voteFirst!,
                      voteKey: account.nodeParticipation.voteKey!,
                      voteKeyDilution:
                        account.nodeParticipation.voteKeyDilution!,
                      voteLast: account.nodeParticipation.voteLast!,
                    },
                    'Registration Transaction',
                  );

                  await signAndSubmit(group);
                  fetch(STATS_URL, {
                    body: JSON.stringify({
                      address: selectedAccount,
                      type: 'online',
                    }),
                    method: 'POST',
                  });
                }}
              >
                {waitingFor !== '' && <Spinner className="!h-6 !w-6" />}
                {waitingFor === 'signature'
                  ? 'Waiting for signature...'
                  : waitingFor === 'submission'
                  ? 'Submitting...'
                  : !participating
                  ? 'Go Online'
                  : 'Update Keys'}
              </Button>
            ) : (
              participating && (
                <Button
                  className="flex gap-4 items-center whitespace-nowrap"
                  disabled={!accountConnected || waitingFor !== ''}
                  onClick={() => {
                    const group = new TransactionGroup({
                      description:
                        'This transaction will register your account offline.',
                      name: 'Go Offline',
                    });

                    group.addOfflineKeyReg(
                      { from: selectedAccount },
                      'Registration Transaction',
                    );

                    signAndSubmit(group);
                  }}
                >
                  {waitingFor !== '' && <Spinner className="!h-6 !w-6" />}
                  {waitingFor === 'signature'
                    ? 'Waiting for signature...'
                    : waitingFor === 'submission'
                    ? 'Submitting...'
                    : 'Go Offline'}
                </Button>
              )
            )}
            {(participating || hasKeys) && !accountConnected && (
              <div className="ml-4 text-amber-600 text-xs dark:text-yellow-500">
                Connect your account to issue transactions.
              </div>
            )}
            {submissionError ? (
              <Error className="grow max-h-12 ml-4 overflow-y-auto !px-3 !py-2">
                {submissionError}
              </Error>
            ) : (
              hasKeys &&
              accountConnected && (
                <div className="ml-4 text-slate-500 text-xs">
                  It takes 320 rounds to go online and offline. Plan
                  accordingly.
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
