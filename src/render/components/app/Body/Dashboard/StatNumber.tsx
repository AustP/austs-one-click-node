export default function StatNumber({
  label,
  className = '',
  stat,
}: {
  label: React.ReactNode;
  className?: string;
  stat: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-sm ${className}`}
    >
      <div className="text-3xl">{stat}</div>
      <div className="text-center text-slate-600 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}
