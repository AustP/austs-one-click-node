// svg from iconoir.com

export default function Circle({
  className = '',
  fill = 'none',
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      className={className}
      width="32px"
      height="32px"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
      color="currentColor"
    >
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
    </svg>
  );
}
