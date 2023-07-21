import { parseNumber } from '@/render/utils';

export default function TextInput({
  className = '',
  icon = '',
  label = '',
  max = '',
  min = '',
  multiline = false,
  onChange,
  onKeyUp = undefined,
  placeholder = '',
  required = false,
  step = 'any',
  type = 'text',
  value,
}: {
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  max?: string;
  min?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  onKeyUp?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type?: string;
  value: string;
}) {
  const Element = multiline ? 'textarea' : 'input';

  return (
    <div className={`relative ${className}`}>
      <input
        className={`absolute bottom-0 ${
          icon ? 'left-12' : ''
        } opacity-0 pointer-events-none`}
        max={max}
        min={min}
        onChange={() => {}}
        required={required}
        step={step}
        tabIndex={-1}
        type={type}
        value={type === 'number' ? parseNumber(value) || '' : value}
      />
      {label && (
        <div
          className={`mb-1 [.validated>input:invalid~&]:text-red-500 text-slate-500 text-sm`}
        >
          {label}
        </div>
      )}
      <div className="flex">
        <Element
          className={`bg-transparent border focus:border-sky-600 border-slate-500 [.validated>input:invalid~div>&]:border-red-500 order-1 focus:outline-none peer px-4 py-2 placeholder:text-slate-500 ${
            icon ? 'rounded-r' : 'rounded'
          } focus:shadow transition w-full`}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={onKeyUp}
          placeholder={placeholder}
          required={required}
          rows={4}
          type="text"
          value={value}
        />
        {icon && (
          <div
            className={`bg-transparent [.validated>input:invalid~div>&]:bg-red-500 peer-focus:bg-sky-600 inline-block leading-none p-3 rounded-l peer-focus:shadow transition w-10`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
