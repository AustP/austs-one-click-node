export default function Flush({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`pt-4 text-slate-700 dark:text-slate-300 text-sm ${className}`}
    >
      {children}
    </div>
  );
}
