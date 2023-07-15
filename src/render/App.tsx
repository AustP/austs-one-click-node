import Body from '@components/app/Body';
import Header from '@components/app/Header';

import './flux';
import './index.css';

export default function App() {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 flex flex-col h-full text-slate-950 dark:text-slate-50">
      <Header />
      <Body />
    </div>
  );
}
