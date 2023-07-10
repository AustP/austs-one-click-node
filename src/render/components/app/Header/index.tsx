import DarkMode from './DarkMode';

export default function Header() {
  return (
    <div className="bg-sky-200 dark:bg-sky-800 flex items-center justify-between px-6 py-4">
      <div className="font-extralight text-2xl">Aust's Two-Click Node</div>
      <DarkMode />
    </div>
  );
}
