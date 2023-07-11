export default function Error({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-red-100 dark:bg-red-500 font-medium p-4 rounded-md text-red-700 dark:text-red-100 whitespace-pre-wrap ${className}`}
    >
      {children}
    </div>
  );
}
