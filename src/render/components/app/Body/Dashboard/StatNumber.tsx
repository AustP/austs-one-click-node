export default function StatNumber({
  label,
  className = '',
  small = false,
  stat,
}: {
  label: React.ReactNode;
  className?: string;
  small?: boolean;
  stat: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        small ? 'px-2' : 'p-6'
      } ${className}`}
    >
      <div className={small ? 'text-sm' : 'text-3xl'}>{stat}</div>
      <div
        className={`text-center text-slate-600 dark:text-slate-400 ${
          small ? 'text-xs' : 'text-sm'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
