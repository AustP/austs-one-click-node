import { Status } from '@/render/flux/wizardStore';

export default function StatusIndicator({
  active = false,
  children = null,
  className = '',
  label,
  status,
}: {
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  label: React.ReactNode;
  status: Status;
}) {
  return (
    <div className={className}>
      <div className="flex items-center rounded-full">
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
          }`}
        >
          {label}
        </div>
      </div>
      {status !== Status.Success && children && (
        <div className="bg-slate-300 dark:bg-slate-700 mt-2 p-2 rounded-md text-xs">
          {children}
        </div>
      )}
    </div>
  );
}
