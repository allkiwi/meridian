interface Option {
  label: string
  value: string
  disabled?: boolean
}

interface ViewToggleProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
}

export function ViewToggle({ options, value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          disabled={opt.disabled}
          onClick={() => !opt.disabled && onChange(opt.value)}
          title={opt.disabled ? 'Coming soon' : undefined}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-all
            ${opt.disabled ? 'cursor-not-allowed opacity-40 text-white/50' : ''}
            ${!opt.disabled && value === opt.value
              ? 'bg-amber-500 text-navy-900 shadow-sm'
              : !opt.disabled
              ? 'text-white/60 hover:text-white/90'
              : ''
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
