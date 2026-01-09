import React from "react";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  className = "",
}: ToggleSwitchProps): React.JSX.Element {
  return (
    <label className={`relative inline-flex cursor-pointer items-center ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <div
        className={`h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-[#030712]" : "bg-[#E5E7EB]"
        } after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform ${
          checked ? "after:translate-x-5" : ""
        }`}
      />
    </label>
  );
}

