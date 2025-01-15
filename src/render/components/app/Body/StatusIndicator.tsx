import { Status } from '@/render/flux/wizardStore';

import OpenNewWindow from '@components/icons/OpenNewWindow';

export default function StatusIndicator({
  active = false,
  children = null,
  className = '',
  href = '',
  label,
  status,
}: {
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  href?: string;
  label: React.ReactNode;
  status: Status;
}) {
  const Tag = href ? 'a' : 'div';

  return (
    <div className={className}>
      <Tag
        className={`flex group items-center rounded-full ${
          href
            ? 'cursor-pointer -m-2 p-2 hover:text-slate-600 dark:hover:text-slate-400'
            : ''
        }`}
        href={href}
        target="_blank"
      >
        <div className="relative">
          {active && (
            <div
              className={`absolute animate-ping [animation-duration:3000ms] ${
                status === Status.Success
                  ? 'bg-green-500'
                  : status === Status.Pending
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              } h-2 mx-2 rounded-full w-2`}
            />
          )}
          <div
            className={`${
              status === Status.Success
                ? 'bg-green-500'
                : status === Status.Pending
                ? 'bg-yellow-500'
                : 'bg-red-500'
            } h-2 mx-2 rounded-full w-2`}
          />
        </div>
        <div
          className={`${
            status === Status.Success
              ? 'text-slate-500'
              : !active
              ? 'text-slate-700 dark:text-slate-300'
              : ''
          } ${
            href
              ? 'group-hover:text-slate-600 dark:group-hover:text-slate-400'
              : ''
          }`}
        >
          {label}
        </div>
        {href ? (
          <>
            <div className="grow" />
            <OpenNewWindow
              className={`h-4 ml-2 w-4 ${
                status === Status.Success
                  ? 'text-slate-500'
                  : !active
                  ? 'text-slate-700 dark:text-slate-300'
                  : ''
              } ${
                href
                  ? 'group-hover:text-slate-600 dark:group-hover:text-slate-400'
                  : ''
              }`}
            />
          </>
        ) : null}
      </Tag>
      {status !== Status.Success && children && (
        <div className="bg-slate-300 dark:bg-slate-700 mt-2 p-2 rounded-md text-xs">
          {children}
        </div>
      )}
    </div>
  );
}
