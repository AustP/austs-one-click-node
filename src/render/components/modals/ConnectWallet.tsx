import { useWallet } from '@txnlab/use-wallet';

import Modal from './Modal';

export default function ConnectWallet() {
  const { providers, activeAccount } = useWallet();
  console.log('activeAccount', activeAccount);

  return (
    <Modal
      className="p-4"
      close={() => {
        console.log('time to close');
      }}
    >
      {providers?.map((provider) => (
        <div
          className="bg-slate-200 dark:bg-slate-800 cursor-pointer flex items-center p-4 rounded-md"
          key={provider.metadata.id}
          onClick={provider.isActive ? provider.disconnect : provider.connect}
        >
          <div className="overflow-hidden rounded-full shadow-md">
            <img
              alt={`${provider.metadata.name} icon`}
              className="h-12 object-cover w-12"
              src={provider.metadata.icon}
            />
          </div>
          <div className="ml-4">{provider.metadata.name}</div>
        </div>
      ))}
    </Modal>
  );
}
