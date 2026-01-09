import React, { useState, useEffect } from "react";

type FormCurrencyInputProps = {
  label: string;
  value: number; // Value in dollars (e.g., 9.99)
  onChange: (value: number) => void;
  error?: string;
  min?: number;
  className?: string;
  placeholder?: string;
};

export function FormCurrencyInput({
  label,
  value,
  onChange,
  error,
  min = 0,
  className = "",
  placeholder = "0.00",
}: FormCurrencyInputProps): React.JSX.Element {
  // Keep display value as string for better decimal handling
  const [displayValue, setDisplayValue] = useState<string>(
    value > 0 ? value.toFixed(2) : ""
  );

  // Sync display value when external value changes
  useEffect(() => {
    const currentNumeric = parseFloat(displayValue) || 0;
    if (Math.abs(currentNumeric - value) > 0.001) {
      setDisplayValue(value > 0 ? value.toFixed(2) : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const inputValue = e.target.value;

    // Allow empty input
    if (inputValue === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    // Only allow valid decimal number format
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(inputValue)) {
      setDisplayValue(inputValue);
      const numericValue = parseFloat(inputValue) || 0;
      onChange(numericValue);
    }
  };

  const handleBlur = (): void => {
    // Format to 2 decimal places on blur
    const numericValue = parseFloat(displayValue) || 0;
    if (numericValue > 0) {
      setDisplayValue(numericValue.toFixed(2));
    }
  };

  return (
    <div className={className}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-public text-[14px] font-medium text-[#6A7282]">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full rounded-lg border py-2 pl-8 pr-4 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors ${
            error
              ? "border-[#DC2626] focus:border-[#DC2626]"
              : "border-[#E5E5E5] focus:border-[#030712]"
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}
