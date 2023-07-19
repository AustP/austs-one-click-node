import { useEffect, useState } from 'react';

import Dropdown from 'algoseas-libs/build/react/Dropdown';

export default function Tooltip({
  children,
  className = '',
  open = undefined,
  tooltip,
}: {
  children: React.ReactNode;
  className?: string;
  open?: boolean;
  tooltip: React.ReactNode;
}) {
  const [_open, setOpen] = useState(false);
  if (open === undefined) {
    open = _open;
  }

  const [opacity, setOpacity] = useState('opacity-0');
  useEffect(() => {
    if (open) {
      setOpacity('opacity-100');
    } else {
      setOpacity('opacity-0');
    }
  }, [open, setOpacity]);

  return (
    <Dropdown
      center
      className={className}
      open={open}
      preferredY="top"
      renderClassName="!z-[51]"
      render={(useBottom) => (
        <div
          className={`bg-black ${
            !useBottom ? 'mt-1' : 'mb-1'
          } max-w-[256px] ${opacity} px-4 py-2 relative rounded shadow text-center text-sm text-white transition`}
        >
          <div
            className={`absolute bg-black h-3 left-1/2 rotate-45 -translate-x-1/2 w-3 ${
              !useBottom
                ? 'mt-px top-0 -translate-y-1/2'
                : 'bottom-0 mb-px translate-y-1/2'
            }`}
          />
          <div>{tooltip}</div>
        </div>
      )}
    >
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => open && setOpen(false)}
      >
        {children}
      </div>
    </Dropdown>
  );
}
