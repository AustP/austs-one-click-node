import { useEffect } from 'react';

export default function DarkMode() {
  // select between dark and light mode
  useEffect(() => {
    (async () => {
      const prefersDarkMode = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;

      const darkMode = await window.store.get('darkMode', prefersDarkMode);

      if (darkMode) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    })();
  }, []);

  return null;
}
