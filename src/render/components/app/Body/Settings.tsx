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
  const [nodeName, setNodeName] = useState('');
  const [port, setPort] = useState('');
  const [startup, setStartup] = useState(false);
  const [settingNetwork, setSettingNetwork] = useState(false);
  const [settingPort, setSettingPort] = useState(false);
  const [settingTelemetry, setSettingTelemetry] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);

  const networks = flux.wizard.selectState('networks');

  const otherNetwork = networks.find(
    (n) => n.value !== flux.wizard.selectState('network'),
  )!;

  const infraHash = flux.wizard.useState('infraHash');

  useEffect(() => {
    (async () => {
      const network = flux.wizard.selectState('network');
      const nodeName = (await window.store.get('nodeName')) as string;
      const port = (await window.store.get('port')) as number;
      const startup = (await window.store.get('startup')) as boolean;

      setNetwork(network);
      setNodeName(nodeName);
      setPort(port.toString());
      setStartup(startup);
      setTelemetryEnabled(nodeName !== '');
    })();
  }, [infraHash]);

  return (
    <Flush className={`w-full ${className}`}>
      <div className="font-light mb-6 text-xl">Settings</div>
      <Checkbox
        checked={startup}
        label="Start Node On Startup"
        onChange={async (checked) => {
          await window.electron.setStartup(checked);
          setStartup(checked);
        }}
      />
      <div className="mt-4">
        <div className="mb-1 text-slate-500 text-sm">
          Port (Changing this setting will cause the node to restart)
        </div>
        <div className="flex items-center">
          <TextInput
            className="w-24"
            onChange={(value) => setPort(value)}
            type="number"
            value={port}
          />
          <Button
            className="inline-flex items-center ml-2"
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
      </div>
      <div className="mt-4">
        <div className="mb-1 text-slate-500 text-sm">
          Network (Changing this setting will cause the node to restart)
        </div>
        <div className="flex items-center">
          <Select
            items={networks}
            onChange={(value) => setNetwork(value)}
            value={network}
          />
          <Button
            className="flex items-center ml-2 shrink-0"
            disabled={
              network === flux.wizard.selectState('network') || settingNetwork
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
            window.electron.newWindow(otherNetwork.value);
          }}
        >
          Start {otherNetwork.label} Node
        </Button>
      </div>
      <div className="mt-4">
        <div className="mb-1 text-slate-500 text-sm">
          Telemetry (Changing this setting will cause the node to restart)
        </div>
        <div className="flex items-center">
          <TextInput
            className="w-72"
            onChange={(value) => setNodeName(value)}
            placeholder="Name your node"
            value={nodeName}
          />
          <Button
            className="inline-flex items-center ml-2"
            disabled={nodeName === '' && !telemetryEnabled}
            onClick={async () => {
              setSettingTelemetry(true);

              // setting the telemetry to an empty string will disable it
              await flux.dispatch('wizard/stopNode');
              await flux.dispatch(
                'wizard/setTelemetry',
                telemetryEnabled ? '' : nodeName,
              );
              flux.dispatch('wizard/checkNodeRunning');

              setTelemetryEnabled(!telemetryEnabled);
              setSettingTelemetry(false);
            }}
          >
            {settingTelemetry ? (
              <>
                <Spinner className="!h-6 mr-2 !w-4" />
                <div>Setting...</div>
              </>
            ) : telemetryEnabled ? (
              'Disable Telemetry'
            ) : (
              'Enable Telemetry'
            )}
          </Button>
        </div>
      </div>
    </Flush>
  );
}
