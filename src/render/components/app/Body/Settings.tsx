import flux from '@aust/react-flux';
import { useEffect, useState } from 'react';

import Button from '@components/shared/Button';
import Checkbox from '@components/shared/Checkbox';
import Select from '@components/shared/Select';
import Spinner from '@components/shared/Spinner';
import TextInput from '@components/shared/TextInput';
import { parseNumber } from '@/render/utils';

import Flush from './Flush';

export default function Settings({ className = '' }: { className?: string }) {
  const [network, setNetwork] = useState('');
  const [port, setPort] = useState('');
  const [startup, setStartup] = useState(false);
  const [settingNetwork, setSettingNetwork] = useState(false);
  const [settingPort, setSettingPort] = useState(false);

  const isMainWindow = flux.wizard.useState('isMainWindow');
  const networks = flux.wizard.selectState('networks');

  const otherNetwork = networks.find(
    (n) => n.value !== flux.wizard.selectState('network'),
  )!;

  useEffect(() => {
    (async () => {
      const network = await window.store.get('network');
      const port = await window.store.get('port');
      const startup = await window.store.get('startup');

      setNetwork(network);
      setPort(port.toString());
      setStartup(startup);
    })();
  }, []);

  return (
    <Flush className={`w-full ${className}`}>
      <div className="font-light mb-6 text-xl">Settings</div>
      {!isMainWindow ? (
        <div className="text-slate-500 text-sm">
          Settings can only be changed from the main window. If you want to
          change the network or port, you should close all other windows first.
        </div>
      ) : (
        <>
          <Checkbox
            checked={startup}
            label="Start Node On Startup"
            onChange={async (checked) => {
              await window.electron.setStartup(checked);
              setStartup(checked);
            }}
          />
          <div className="flex items-end mt-4">
            <TextInput
              label="Port (Changing the port will cause the node to restart)"
              onChange={(value) => setPort(value)}
              type="number"
              value={port}
            />
            <Button
              className="flex items-center ml-2"
              disabled={
                !parseNumber(port) ||
                parseNumber(port) === flux.wizard.selectState('port') ||
                settingPort
              }
              onClick={async () => {
                setSettingPort(true);

                await flux.dispatch('wizard/stopNode');
                await flux.dispatch('wizard/setPort', parseNumber(port));
                flux.dispatch('wizard/checkNodeRunning');

                setSettingPort(false);
              }}
            >
              {settingPort ? (
                <>
                  <Spinner className="!h-6 mr-2 !w-4" />
                  <div>Setting...</div>
                </>
              ) : (
                'Set Port'
              )}
            </Button>
          </div>
          <div className="mt-4">
            <div className="mb-1 text-slate-500 text-sm">
              Network (Changing the network will cause the node to restart)
            </div>
            <div className="flex items-end">
              <Select
                items={networks}
                onChange={(value) => setNetwork(value)}
                value={network}
              />
              <Button
                className="flex items-center ml-2 shrink-0"
                disabled={
                  network === flux.wizard.selectState('network') ||
                  settingNetwork
                }
                onClick={async () => {
                  setSettingNetwork(true);

                  await flux.dispatch('wizard/stopNode');
                  await flux.dispatch('wizard/setNetwork', network);
                  flux.dispatch('wizard/checkNodeRunning');

                  setSettingNetwork(false);
                }}
              >
                {settingNetwork ? (
                  <>
                    <Spinner className="!h-6 mr-2 !w-4" />
                    <div>Setting...</div>
                  </>
                ) : (
                  'Set Network'
                )}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 text-slate-500 text-sm">
              Want to run a node for {otherNetwork.label} as well?
            </div>
            <Button
              onClick={async () => {
                window.newWindow();
              }}
            >
              Start {otherNetwork.label} Node
            </Button>
          </div>
        </>
      )}
    </Flush>
  );
}
