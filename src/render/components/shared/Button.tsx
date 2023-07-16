export default function Button({
  children,
  className = '',
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`bg-sky-600 dark:bg-sky-900 ${
        disabled ? 'opacity-50' : 'cursor-pointer hover:opacity-90'
      } inline-block px-3 py-2 rounded-md text-center text-slate-50 ${className}`}
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}
