// svg from iconoir.com

export default function OpenNewWindow({
  className = '',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="32px"
      height="32px"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      color="currentColor"
    >
      <path
        d="M21 3L15 3M21 3L12 12M21 3V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
      <path
        d="M21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      ></path>
    </svg>
  );
}
