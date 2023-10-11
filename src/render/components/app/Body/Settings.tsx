import flux from '@aust/react-flux';
import { useEffect, useState } from 'react';

import Button from '@components/shared/Button';
import Checkbox from '@components/shared/Checkbox';
import Select from '@components/shared/Select';
import Spinner from '@components/shared/Spinner';
import TextInput from '@components/shared/TextInput';
import { parseNumber } from '@/render/utils';

import Flush from './Flush';

let initialDataDir = '';
export default function Settings({ className = '' }: { className?: string }) {
  const [dataDir, setDataDir] = useState('');
  const [network, setNetwork] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [port, setPort] = useState('');
  const [startup, setStartup] = useState(false);
  const [settingDataDir, setSettingDataDir] = useState(false);
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
      const dataDir = (await window.store.get('dataDir')) as string;
      const network = flux.wizard.selectState('network');
      const nodeName = (await window.store.get('nodeName')) as string;
      const port = (await window.store.get('port')) as number;
      const startup = (await window.store.get('startup')) as boolean;

      initialDataDir = dataDir;

      setDataDir(dataDir);
      setNetwork(network);
      setNodeName(nodeName);
      setPort(port.toString());
      setStartup(startup);
      setTelemetryEnabled(nodeName !== '');
    })();

    // if a bad data directory is entered (i.e. permissions issue)
    // electron will reset the dataDir in the store to the last known good one
    // this code will detect that and update the UI to match
    let interval = window.setInterval(async () => {
      const dataDir = (await window.store.get('dataDir')) as string;
      if (dataDir !== initialDataDir) {
        flux.dispatch('wizard/setDataDir', dataDir);
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [infraHash]);

  return (
    <Flush className={`w-full ${className}`}>
      <div className="font-light text-xl">Settings</div>
      <div className="mt-2 text-slate-500 text-sm">
        Note: Changing most settings will cause the node to restart.
      </div>
      <Checkbox
        checked={startup}
        className="mt-8"
        label="Start Node On Startup"
        onChange={async (checked) => {
          await window.electron.setStartup(checked);
          setStartup(checked);
        }}
      />
      <div className="mt-4">
        <div className="mb-1 text-slate-500 text-sm">Port</div>
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
        <div className="mb-1 text-slate-500 text-sm">Network</div>
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
        <div className="mb-1 text-slate-500 text-sm">Telemetry</div>
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
      <div className="mt-4">
        <div className="mb-1 text-slate-500 text-sm">Data Directory</div>
        <div className="flex items-center">
          <TextInput
            className="w-full"
            onChange={(value) => setDataDir(value)}
            value={dataDir}
          />
          <Button
            className="inline-flex items-center ml-2 shrink-0"
            disabled={dataDir === initialDataDir}
            onClick={async () => {
              setSettingDataDir(true);

              await flux.dispatch('wizard/stopNode');
              await flux.dispatch('wizard/setDataDir', dataDir);
              flux.dispatch('wizard/checkNodeRunning');

              setSettingDataDir(false);
            }}
          >
            {settingDataDir ? (
              <>
                <Spinner className="!h-6 mr-2 !w-4" />
                <div>Setting...</div>
              </>
            ) : (
              'Set Data Directory'
            )}
          </Button>
        </div>
      </div>
      <div className="mt-8">
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
    </Flush>
  );
}
