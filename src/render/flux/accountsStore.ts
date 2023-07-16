import flux, { Store } from '@aust/react-flux';
import algosdk from 'algosdk';
import { nodeRequest } from 'algoseas-libs/build/algo';
import { produce } from 'immer';

const VOTE_SAVE_INTERVAL = 60_000; // 30 seconds

type ParticipationDetails = {
  selectionKey?: Uint8Array;
  stateProofKey?: Uint8Array;
  voteFirst?: number;
  voteKey?: Uint8Array;
  voteKeyDilution?: number;
  voteLast?: number;
};

type Account = {
  address: string;
  algoAmount: number;
  chainParticipation: ParticipationDetails;
  nodeParticipation: ParticipationDetails;
  pk: Uint8Array;
  stats: {
    lastProposedBlock: number;
    proposals: number;
    votes: number;
  };
};

type AccountsStoreState = {
  accounts: Record<string, Account>;

  // selectors
  anyParticipating: boolean;
  get: Account;
  list: string[];
  participating: boolean;
  totalProposals: number;
  totalStake: number;
  totalVotes: number;
};

declare global {
  interface Flux {
    accounts: Store<AccountsStoreState>;
  }
}

function b64ToUint8Array(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

const store = flux.addStore('accounts', {
  accounts: {},
}) as any as Store<AccountsStoreState>;

store.register('accounts/load', async () => {
  const accounts = await window.store.get('accounts', {});
  return (state) =>
    produce(state, (draft) => {
      draft.accounts = accounts;
    });
});

store.register('accounts/add', async (_, address: string) => {
  try {
    const response = await nodeRequest(`/v2/accounts/${address}`);
    return (state) =>
      produce(state, (draft) => {
        draft.accounts[address] = {
          address,
          algoAmount: response.amount,
          chainParticipation: {
            selectionKey: response.participation?.[
              'selection-participation-key'
            ]
              ? b64ToUint8Array(
                  response.participation['selection-participation-key'],
                )
              : undefined,
            stateProofKey: response.participation?.['state-proof-key']
              ? b64ToUint8Array(response.participation['state-proof-key'])
              : undefined,
            voteFirst: response.participation?.['vote-first-valid'],
            voteKey: response.participation?.['vote-participation-key']
              ? b64ToUint8Array(
                  response.participation['vote-participation-key'],
                )
              : undefined,
            voteKeyDilution: response.participation?.['vote-key-dilution'],
            voteLast: response.participation?.['vote-last-valid'],
          },
          nodeParticipation: state.accounts[address]?.nodeParticipation || {},
          pk: algosdk.decodeAddress(address).publicKey,
          stats: {
            lastProposedBlock:
              state.accounts[address]?.stats.lastProposedBlock || 0,
            proposals: state.accounts[address]?.stats.proposals || 0,
            votes: state.accounts[address]?.stats.votes || 0,
          },
        };

        flux.dispatch('accounts/save');
      });
  } catch (err) {
    flux.dispatch(
      'notices/error',
      `Failed to fetch account: ${err.message}\n${err.toString()}`,
    );
  }
});

store.register(
  'accounts/remove',
  (_, account: string) => (state) =>
    produce(state, (draft) => {
      delete draft.accounts[account];
      flux.dispatch('accounts/save');
    }),
);

store.register(
  'accounts/reset-stats',
  (_, account: string) => (state) =>
    produce(state, (draft) => {
      draft.accounts[account].stats.proposals = 0;
      draft.accounts[account].stats.votes = 0;
      flux.dispatch('accounts/save');
    }),
);

store.register(
  'accounts/save',
  () => void window.store.set('accounts', store.selectState().accounts),
);

store.register(
  'accounts/stats/addProposal',
  (_, address: string, block: number) => (state) =>
    produce(state, (draft) => {
      draft.accounts[address].stats.lastProposedBlock = block;
      draft.accounts[address].stats.proposals++;
      flux.dispatch('accounts/save');
    }),
);

let lastVoteSave = 0;
store.register(
  'accounts/stats/addVote',
  (_, address: string) => (state) =>
    produce(state, (draft) => {
      draft.accounts[address].stats.votes++;
      let now = new Date().getTime();
      if (now - lastVoteSave > VOTE_SAVE_INTERVAL) {
        lastVoteSave = now;
        flux.dispatch('accounts/save');
      }
    }),
);

store.addSelector('anyParticipating', (state) =>
  Object.values(state.accounts).some(
    (account) => account.chainParticipation.voteKey !== undefined,
  ),
);

store.addSelector('get', (state, address) => state.accounts[address]);

store.addSelector('list', (state) =>
  Object.values(state.accounts)
    .sort((a, b) => b.algoAmount - a.algoAmount)
    .map((a) => a.address),
);

store.addSelector(
  'participating',
  (state, address) =>
    state.accounts[address]?.chainParticipation.voteKey !== undefined,
);

store.addSelector('totalProposals', (state) =>
  Object.values(state.accounts)
    .map((account) => account.stats.proposals)
    .reduce((total, proposals) => total + proposals, 0),
);

store.addSelector('totalStake', (state) =>
  Object.values(state.accounts)
    .filter((account) => store.selectState('participating', account.address))
    .map((account) => account.algoAmount)
    .reduce((total, algoAmount) => total + algoAmount, 0),
);

store.addSelector('totalVotes', (state) =>
  Object.values(state.accounts)
    .map((account) => account.stats.votes)
    .reduce((total, votes) => total + votes, 0),
);
