import flux from '@aust/react-flux';
import { useWallet } from '@txnlab/use-wallet';
import algosdk from 'algosdk';
import Dropdown from 'algoseas-libs/build/react/Dropdown';
import { useCallback, useEffect, useState } from 'react';

import Button from '@components/shared/Button';
import CheckIcon from '@components/icons/Check';
import WalletIcon from '@components/icons/Wallet';

// include the string 'hidden' so tailwind will not purge this class
// the Dropdown component uses it
('hidden');

let fetchedAccounts: Record<string, boolean> = {};

export default function AccountSelector({
  className = '',
  disabled = false,
  selectedAccount,
  setSelectedAccount,
}: {
  className?: string;
  disabled?: boolean;
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
}) {
  const accounts = flux.accounts.useState('list');

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  const { providers, connectedAccounts } = useWallet();

  useEffect(() => {
    for (const account of connectedAccounts) {
      if (
        !accounts.includes(account.address) &&
        !fetchedAccounts[account.address]
      ) {
        fetchedAccounts[account.address] = true;
        flux.dispatch('accounts/add', account.address);
      }
    }
  }, [accounts, connectedAccounts]);

  const connectedAccountsList = connectedAccounts.map(
    (account) => account.address,
  );

  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setIsAdding(false);
    setNewAccount('');
  }, []);

  const setSelectedAccountAndClose = useCallback((account: string) => {
    setSelectedAccount(account);
    close();
  }, []);

  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState('');

  const newAccountIsValid = algosdk.isValidAddress(newAccount);
  const addNewAccount = useCallback(() => {
    flux.dispatch('accounts/add', newAccount);
    setNewAccount('');
    setIsAdding(false);

    setSelectedAccountAndClose(newAccount);
  }, [newAccount]);

  return (
    <Dropdown
      onOutsideClicked={close}
      open={open}
      render={() => (
        <div className="bg-slate-100 dark:bg-slate-900 max-h-80 -mt-10 overflow-y-auto rounded-md shadow-md text-slate-900 dark:text-slate-100 text-sm w-96">
          {providers?.map((provider) => (
            <div
              className="border-b border-slate-500 py-2"
              key={provider.metadata.name}
            >
              <div className="flex justify-between items-center px-4 py-2">
                <div className="flex font-bold items-center text-base">
                  <img
                    alt={`${provider.metadata.name} icon`}
                    className="h-8 mr-2 rounded-full w-8"
                    src={provider.metadata.icon}
                  />
                  <div>{provider.metadata.name}</div>
                </div>
                <Button
                  onClick={
                    provider.isConnected
                      ? provider.disconnect
                      : provider.connect
                  }
                >
                  {provider.isConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
              {provider.accounts.map((account) => (
                <div
                  className={`hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer flex items-center group px-4 py-1 ${
                    account.address === selectedAccount ? '' : 'text-slate-500'
                  }`}
                  key={account.address}
                  onClick={() => setSelectedAccountAndClose(account.address)}
                >
                  <div
                    className={`${
                      flux.accounts.selectState(
                        'participating',
                        account.address,
                      )
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    } h-2 mx-2 rounded-full w-2`}
                  />
                  <div>
                    {account.address.substring(0, 6)}...
                    {account.address.substring(account.address.length - 4)}
                  </div>
                  <div className="grow" />
                  <CheckIcon
                    className={`h-6 ${
                      account.address === selectedAccount ? '' : 'opacity-0'
                    } group-hover:opacity-100 ml-2 transition w-6`}
                  />
                </div>
              ))}
            </div>
          ))}
          <div className="py-2">
            <div className="flex justify-between items-center px-4 py-2">
              <div className="flex font-bold items-center text-base">
                <div className="bg-slate-600 flex h-8 items-center justify-center mr-2 rounded-full text-slate-100 text-sm w-8">
                  <div>D</div>
                </div>
                <div>Disconnected</div>
              </div>
              {!isAdding && (
                <Button onClick={() => setIsAdding(true)}>Add</Button>
              )}
            </div>
            {accounts
              .filter((account) => !connectedAccountsList.includes(account))
              .map((account) => (
                <div
                  className="hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer flex items-center group px-4 py-1"
                  key={account}
                  onClick={() => setSelectedAccountAndClose(account)}
                >
                  <div
                    className={`${
                      flux.accounts.selectState('participating', account)
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    } h-2 mx-2 rounded-full w-2`}
                  />
                  <div>
                    {account.substring(0, 6)}...
                    {account.substring(account.length - 4)}
                  </div>
                  <div className="grow" />
                  <CheckIcon
                    className={`h-6 ${
                      account === selectedAccount ? '' : 'opacity-0'
                    } group-hover:opacity-100 ml-2 transition w-6`}
                  />
                </div>
              ))}
            {isAdding && (
              <div className="flex items-center px-4 py-1">
                <input
                  className={`bg-transparent border ${
                    newAccountIsValid && newAccount.length > 0
                      ? 'border-slate-500'
                      : 'border-red-500'
                  } grow px-2 py-1 rounded-md`}
                  onChange={(e) => setNewAccount(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter' && newAccountIsValid) {
                      addNewAccount();
                    }
                  }}
                  placeholder="Enter account address"
                  type="text"
                  value={newAccount}
                />
                <Button
                  className="ml-2"
                  disabled={!newAccountIsValid}
                  onClick={addNewAccount}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    >
      <Button
        className={className}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center">
          <WalletIcon className="h-5 mr-2 w-5" />
          <div>
            {selectedAccount
              ? `${selectedAccount.substring(
                  0,
                  6,
                )}...${selectedAccount.substring(selectedAccount.length - 4)}`
              : accounts.length > 0
              ? 'Select Account'
              : 'Add Account'}
          </div>
        </div>
      </Button>
    </Dropdown>
  );
}
