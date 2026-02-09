// src/components/RadioGroup.tsx
// Reusable radio button group component.
// Displays a row of selectable options with visual active state.
// Supports optional labels map for displaying localized text.
// Used in CharacterEditor for pitch, speed, emotion, etc.

interface RadioGroupProps<T extends string> {
  /** Label displayed above the radio group */
  label: string;
  /** Available options */
  options: readonly T[];
  /** Currently selected value */
  value: T;
  /** Callback when an option is selected */
  onChange: (value: T) => void;
  /** Optional display labels for each option (if omitted, raw value is shown) */
  labels?: Partial<Record<T, string>>;
}

export function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  labels,
}: RadioGroupProps<T>) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-slate-400 mb-1.5 uppercase tracking-widest">
        {label}
      </label>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 text-xs border rounded-md transition-all font-sans
              ${value === opt
                ? "border-amber-500 bg-amber-500/15 text-amber-400"
                : "border-slate-700 bg-transparent text-slate-400 hover:border-slate-500"
              }`}
          >
            {labels?.[opt] ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}
