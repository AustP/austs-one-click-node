import { createPortal } from 'react-dom';

export default function Modal({
  children,
  className = '',
  close,
}: {
  children: any;
  className?: string;
  close: () => void;
}) {
  return createPortal(
    <div className="absolute h-full flex items-center justify-center top-0 w-full">
      <div className="absolute bg-slate-500/50 h-full w-full" onClick={close} />
      <div
        className={`bg-slate-100 dark:bg-slate-900 h-1/2 rounded-lg text-slate-900 dark:text-slate-100 w-1/2 z-10 ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
