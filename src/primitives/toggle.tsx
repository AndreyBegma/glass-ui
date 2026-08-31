'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelledBy?: string;
}

export function Toggle({ checked, onChange, labelledBy }: ToggleProps) {
  return (
    <span className="inline-flex min-h-[44px] items-center">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelledBy}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-(--dur-fast) ${checked ? 'bg-ink' : 'bg-line-strong'}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full shadow-sm transform transition-transform duration-(--dur-fast) ${checked ? 'translate-x-6 bg-ground' : 'translate-x-1 bg-ink'}`}
        />
      </button>
    </span>
  );
}
