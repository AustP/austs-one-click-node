import { useEffect, useState } from 'react';

import MinusIcon from '@components/icons/Minus';
import SquareIcon from '@components/icons/Square';
import XIcon from '@components/icons/X';

import DarkMode from './DarkMode';

export default function Header() {
  const [platform, setPlatform] = useState('');

  useEffect(
    () => void (async () => setPlatform(await window.electron.platform()))(),
    [],
  );

  const isMac = platform === 'darwin';

  return (
    <div className="bg-sky-200 dark:bg-sky-800">
      <div className="flex items-center">
        {isMac ? (
          <>
            <div
              className="cursor-pointer pl-2 pr-1 py-2"
              onClick={window.electron.quit}
            >
              <div className="bg-[#ff605c] h-3 rounded-full shrink-0 w-3" />
            </div>
            <div
              className="cursor-pointer px-1 py-2"
              onClick={window.electron.minimize}
            >
              <div className="bg-[#ffbd44] h-3 rounded-full shrink-0 w-3" />
            </div>
            <div
              className="cursor-pointer px-1 py-2"
              onClick={window.electron.maximize}
            >
              <div className="bg-[#00ca4e] h-3 rounded-full shrink-0 w-3" />
            </div>
            <div className="grow self-stretch [-webkit-app-region:drag]" />
          </>
        ) : (
          <>
            <div className="grow self-stretch [-webkit-app-region:drag]" />
            <div className="cursor-pointer" onClick={window.electron.minimize}>
              <MinusIcon className="cursor-pointer hover:bg-sky-300 dark:hover:bg-sky-700 p-1 shrink-0 hover:text-black dark:hover:text-white transition w-12" />
            </div>
            <div className="cursor-pointer" onClick={window.electron.maximize}>
              <SquareIcon className="cursor-pointer hover:bg-sky-300 dark:hover:bg-sky-700 p-2 shrink-0 hover:text-black dark:hover:text-white transition w-12" />
            </div>
            <div className="cursor-pointer" onClick={window.electron.quit}>
              <XIcon className="cursor-pointer hover:bg-red-500 p-1 shrink-0 hover:text-white transition w-12" />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between pb-4 pt-2 px-6">
        <div className="font-extralight text-2xl">Aust's Two-Click Node</div>
        <DarkMode />
      </div>
    </div>
  );
}
