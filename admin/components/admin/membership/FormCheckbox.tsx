import React from "react";

type FormCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export function FormCheckbox({
  label,
  checked,
  onChange,
  className = "",
}: FormCheckboxProps): React.JSX.Element {
  return (
    <label className={`flex cursor-pointer items-center gap-3 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div className="flex h-4 w-4 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
        <svg
          className="h-3 w-3 text-white opacity-0 transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="font-public text-[14px] text-[#030712]">{label}</span>
    </label>
  );
}

