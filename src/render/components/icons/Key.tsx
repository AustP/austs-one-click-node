// svg from iconoir.com

export default function Key({ className = '' }: { className?: string }) {
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
        d="M14 12a4 4 0 108 0 4 4 0 00-8 0zm0 0H2v3M6 12v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
    </svg>
  );
}
