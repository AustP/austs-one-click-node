export default function Success({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-green-200 dark:bg-green-700 font-medium p-4 rounded-md text-green-900 dark:text-green-100 ${className}`}
    >
      {children}
    </div>
  );
}
