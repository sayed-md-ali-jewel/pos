// components/Common/FilterSelect.tsx
import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

type Option = { value: string; label: string };

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  icon?: React.ReactNode;
};

export function FilterSelect({ value, onChange, options, placeholder, icon }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`input-field w-full flex items-center gap-2 text-sm text-left transition ${
          open ? 'border-sky-500 ring-2 ring-sky-100' : ''
        }`}
      >
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <span className={`flex-1 truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[160px] rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60 overflow-hidden">
          {/* All / reset option */}
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition hover:bg-slate-50 ${
              value === '' ? 'text-sky-600 font-semibold bg-sky-50' : 'text-slate-500'
            }`}
          >
            {placeholder}
            {value === '' && <Check size={14} />}
          </button>

          <div className="h-px bg-slate-100 mx-2" />

          <div className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition hover:bg-slate-50 ${
                  value === opt.value ? 'text-sky-600 font-semibold bg-sky-50/60' : 'text-slate-700'
                }`}
              >
                {opt.label}
                {value === opt.value && <Check size={14} className="text-sky-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
