import CheckIcon from '@components/icons/Check';

export default function Checkbox({
  checked,
  className = '',
  label = '',
  onChange,
}: {
  checked: boolean;
  className?: string;
  label?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`cursor-pointer flex items-center w-fit ${className}`}>
      <input
        checked={checked}
        className="absolute opacity-0 peer pointer-events-none"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <CheckIcon
        className={`border border-slate-500 h-5 rounded ${
          checked ? 'text-sky-600 dark:text-sky-600' : 'text-transparent'
        } w-5`}
      />
      {label && (
        <div
          className={`${
            checked ? 'font-medium' : ''
          } ml-3 peer-focus:text-sky-600 dark:peer-focus:text-sky-600`}
        >
          {label}
        </div>
      )}
    </label>
  );
}
