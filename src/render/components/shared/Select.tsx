export default function Select({
  className = '',
  items,
  onChange,
  value,
}: {
  className?: string;
  items: { label: string; value: string }[];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      className={`appearance-none bg-transparent border focus:border-sky-600 border-slate-500 cursor-pointer focus:outline-none peer pl-4 pr-9 py-2 rounded focus:shadow transition sw-full ${className}`}
      onChange={(e) => onChange(e.target.value)}
      value={value}
    >
      {items.map((item) => (
        <option
          className="dark:bg-slate-900 bg-slate-100 dark:text-slate-100 text-slate-900"
          key={item.value}
          value={item.value}
        >
          {item.label}
        </option>
      ))}
    </select>
  );
}
