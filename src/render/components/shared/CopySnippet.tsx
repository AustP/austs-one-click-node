import React, { useState } from 'react';

import ClipboardIcon from '@components/icons/Clipboard';

import Tooltip from './Tooltip';

export default function CopySnippet({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`overflow-hidden relative rounded ${className}`}>
      <pre className="bg-slate-300 dark:bg-slate-700 overflow-x-auto p-2 pr-8 text-xs w-full">
        {children}
      </pre>
      <Tooltip
        className="absolute top-0 right-0"
        open={showTooltip}
        tooltip="Copied!"
      >
        <div
          className="bg-slate-300 dark:bg-slate-700 cursor-pointer flex font-normal p-2"
          onClick={() => {
            navigator.clipboard.writeText(
              Array.isArray(children)
                ? children.join('')
                : (children as string),
            );
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 1500);
          }}
        >
          <ClipboardIcon className="h-4 w-4" />
        </div>
      </Tooltip>
    </div>
  );
}
