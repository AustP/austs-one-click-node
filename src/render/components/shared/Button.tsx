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
      className={`bg-slate-900 dark:bg-slate-100 ${
        disabled ? 'opacity-50' : 'cursor-pointer hover:opacity-90'
      } inline-block px-3 py-2 rounded-md text-center text-slate-100 dark:text-slate-900 ${className}`}
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
