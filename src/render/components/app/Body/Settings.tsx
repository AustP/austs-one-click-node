import flux from '@aust/react-flux';
import { useEffect, useState } from 'react';

import Button from '@components/shared/Button';
import Checkbox from '@components/shared/Checkbox';
import Spinner from '@components/shared/Spinner';
import TextInput from '@components/shared/TextInput';
import { parseNumber } from '@/render/utils';

import Flush from './Flush';

export default function Settings({ className = '' }: { className?: string }) {
  const [port, setPort] = useState('');
  const [startup, setStartup] = useState(false);
  const [settingPort, setSettingPort] = useState(false);

  useEffect(() => {
    (async () => {
      const port = await window.store.get('port');
      const startup = await window.store.get('startup');

      setPort(port.toString());
      setStartup(startup);
    })();
  }, []);

  return (
    <Flush className={className}>
      <div className="font-light mb-6 text-xl">Settings</div>
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
          className="mt-4"
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

            const wasRunning = flux.wizard.selectState('running');
            await flux.dispatch('wizard/stopNode');
            await flux.dispatch('wizard/setPort', parseNumber(port));

            if (wasRunning) {
              flux.dispatch('wizard/checkContainerRunning', true);
            }

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
    </Flush>
  );
}
