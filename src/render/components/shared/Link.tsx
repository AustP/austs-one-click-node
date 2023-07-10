export default function Link({
  children,
  className = '',
  href,
}: {
  children?: React.ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <a
      className={`-m-1 p-1 underline ${className}`}
      href={href}
      target="_blank"
    >
      {children}
    </a>
  );
}
