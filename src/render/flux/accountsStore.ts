import flux, { Store } from '@aust/react-flux';
import algosdk from 'algosdk';
import { nodeRequest } from 'algoseas-libs/build/algo';
import { produce } from 'immer';

const VOTE_SAVE_INTERVAL = 60_000; // 30 seconds

type ParticipationDetails = {
  id?: string;
  selectionKey?: string;
  stateProofKey?: string;
  voteFirst?: number;
  voteKey?: string;
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

const store = flux.addStore('accounts', {
  accounts: {},
}) as any as Store<AccountsStoreState>;

store.register('node/ready', () => void flux.dispatch('accounts/load'));

store.register('accounts/load', async () => {
  const accounts = (await window.store.get('accounts', {})) as Record<
    string,
    Account
  >;

  // reset node participation so we can always use the latest information
  for (const address of Object.keys(accounts)) {
    accounts[address].nodeParticipation = {};
  }

  // figure out what the last round was
  const status = await nodeRequest(`/v2/status/`);
  const lastRound = status['last-round'];

  // figure out which keys are stored on this node
  const nodeKeys = (await nodeRequest('/v2/participation')) || [];
  for (const nodeKey of nodeKeys) {
    // delete any key that is expired
    if (nodeKey.key['vote-last-valid'] < lastRound) {
      await window.goal.deletepartkey(nodeKey.id);
      continue;
    }

    // make sure we display the latest key
    if (
      accounts[nodeKey.address] &&
      (accounts[nodeKey.address].nodeParticipation.voteLast || 0) <
        nodeKey.key['vote-last-valid']
    ) {
      accounts[nodeKey.address].nodeParticipation = {
        id: nodeKey.id,
        selectionKey: nodeKey.key['selection-participation-key'],
        stateProofKey: nodeKey.key['state-proof-key'],
        voteFirst: nodeKey.key['vote-first-valid'],
        voteKey: nodeKey.key['vote-participation-key'],
        voteKeyDilution: nodeKey.key['vote-key-dilution'],
        voteLast: nodeKey.key['vote-last-valid'],
      };

      accounts[nodeKey.address].stats.lastProposedBlock = Math.max(
        nodeKey['last-block-proposal'] || 0,
        accounts[nodeKey.address].stats.lastProposedBlock,
      );
    }
  }

  return (state) =>
    produce(state, (draft) => {
      draft.accounts = accounts;
    });
});

store.register('accounts/add', async (_, address: string) => {
  try {
    const response = await nodeRequest(`/v2/accounts/${address}`);
    const chainKey = response.participation;

    const nodeKeys = (await nodeRequest('/v2/participation')) || [];
    const nodeKey = nodeKeys
      .filter((k: any) => k.address === address)
      .reduce((nodeKey: any, currentKey: any) => {
        if (
          !nodeKey ||
          nodeKey.key['vote-last-valid'] < currentKey.key['vote-last-valid']
        ) {
          return currentKey;
        }

        return nodeKey;
      }, null);

    return (state) =>
      produce(state, (draft) => {
        draft.accounts[address] = {
          address,
          algoAmount: response.amount,
          chainParticipation: chainKey
            ? {
                selectionKey: chainKey['selection-participation-key'],
                stateProofKey: chainKey['state-proof-key'],
                voteFirst: chainKey['vote-first-valid'],
                voteKey: chainKey['vote-participation-key'],
                voteKeyDilution: chainKey['vote-key-dilution'],
                voteLast: chainKey['vote-last-valid'],
              }
            : {},
          nodeParticipation: nodeKey
            ? {
                id: nodeKey.id,
                selectionKey: nodeKey.key['selection-participation-key'],
                stateProofKey: nodeKey.key['state-proof-key'],
                voteFirst: nodeKey.key['vote-first-valid'],
                voteKey: nodeKey.key['vote-participation-key'],
                voteKeyDilution: nodeKey.key['vote-key-dilution'],
                voteLast: nodeKey.key['vote-last-valid'],
              }
            : {},
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
