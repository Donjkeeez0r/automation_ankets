export interface FilterChip<T extends string> {
  value: T;
  label: string;
  // если задано — показывается счётчик рядом с подписью
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: FilterChip<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export default function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: FilterChipsProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              active
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] leading-none ${
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
