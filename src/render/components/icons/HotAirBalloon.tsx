// svg from iconoir.com

export default function HotAirBalloon({
  className = '',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      width="32px"
      height="32px"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      color="currentColor"
    >
      <path
        d="M4 9.5c0 4.571 5.714 8 5.714 8h4.572S20 14.071 20 9.5s-3.582-8-8-8-8 3.429-8 8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
      <path
        d="M9 2c-3 6 1 15.5 1 15.5M14.884 2c3 6-1 15.5-1 15.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      ></path>
      <path
        d="M13.4 23h-2.8a.6.6 0 01-.6-.6v-1.8a.6.6 0 01.6-.6h2.8a.6.6 0 01.6.6v1.8a.6.6 0 01-.6.6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      ></path>
    </svg>
  );
}
