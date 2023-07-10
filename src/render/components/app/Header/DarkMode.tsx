import { useEffect, useState } from 'react';

import Circle from '@components/icons/Circle';
import Moon from '@components/icons/Moon';
import Sun from '@components/icons/Sun';

export default function DarkMode({ className = '' }: { className?: string }) {
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    (async () => {
      const prefersDarkMode = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;

      const darkMode = await window.store.get('darkMode', prefersDarkMode);
      setDarkMode(darkMode);

      if (darkMode) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    })();
  }, [setDarkMode]);

  return (
    <div
      className={`bg-slate-100 cursor-pointer flex items-center p-1 rounded-full text-slate-900 ${className}`}
      onClick={() => {
        const darkMode = document.body.classList.toggle('dark');
        window.store.set('darkMode', darkMode);
        setDarkMode(darkMode);
      }}
    >
      {darkMode ? (
        <Circle className="h-4 w-4" fill="currentColor" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      {darkMode ? (
        <Moon className="h-4 ml-2 w-4" />
      ) : (
        <Circle className="h-4 ml-2 w-4" fill="currentColor" />
      )}
    </div>
  );
}
