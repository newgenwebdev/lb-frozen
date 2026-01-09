import React from "react";

type FormNumberInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
};

export function FormNumberInput({
  label,
  value,
  onChange,
  error,
  min,
  max,
  step = 1,
  placeholder,
  className = "",
}: FormNumberInputProps): React.JSX.Element {
  return (
    <div className={className}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const numValue = parseFloat(e.target.value) || 0;
            onChange(numValue);
          }}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-4 py-2 pr-10 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors ${
            error
              ? "border-[#DC2626] focus:border-[#DC2626]"
              : "border-[#E5E5E5] focus:border-[#030712]"
          } [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
          <button
            type="button"
            onClick={() => {
              const newValue = value + step;
              onChange(max !== undefined ? Math.min(newValue, max) : newValue);
            }}
            className="h-3 w-4 flex items-center justify-center text-[#6A7282] hover:text-[#030712] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M9 7.5L6 4.5L3 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              const newValue = value - step;
              onChange(min !== undefined ? Math.max(newValue, min) : newValue);
            }}
            className="h-3 w-4 flex items-center justify-center text-[#6A7282] hover:text-[#030712] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}

