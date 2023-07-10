export default function Column({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-800 p-4 rounded-lg shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}
