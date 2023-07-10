import Header from '@components/app/Header';

import './index.css';

const App = () => {
  return (
    <div className="bg-slate-100 flex h-full dark:bg-slate-900 dark:text-white">
      <Header />
      <div>Body</div>
    </div>
  );
};

export default App;
