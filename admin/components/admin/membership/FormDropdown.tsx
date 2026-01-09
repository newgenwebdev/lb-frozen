import React, { useState, useRef, useEffect } from "react";

type FormDropdownProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
  className?: string;
};

export function FormDropdown({
  label,
  value,
  onChange,
  options,
  error,
  className = "",
}: FormDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors bg-white ${
          error
            ? "border-[#DC2626] focus:border-[#DC2626]"
            : "border-[#E5E5E5] focus:border-[#030712]"
        } ${className}`}
      >
        <span>{value || "Select..."}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left font-public text-[14px] transition-colors ${
                value === option
                  ? "bg-[#F9FAFB] text-[#030712] font-medium"
                  : "text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}

