import React, { useState, useRef, useEffect } from "react";

export type SelectOption = {
  id: string;
  label: string;
};

type SelectDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
};

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  error,
  className = "",
}: SelectDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find the selected option's label
  const selectedOption = options.find((opt) => opt.id === value);
  const displayText = selectedOption?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (): void => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionId: string): void => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 font-geist text-[16px] font-normal tracking-[-0.16px] outline-none transition-colors bg-white cursor-pointer ${
          error
            ? "border-[#DC2626] focus:border-[#DC2626]"
            : "border-[#E3E3E3] hover:border-[#999] focus:border-black"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span className={!selectedOption ? "text-[#6A7282]" : "text-[#030712]"}>
          {displayText}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`transition-transform text-[#6A7282] ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-60 overflow-auto">
          {/* Empty option for clearing selection */}
          <button
            type="button"
            onClick={() => handleSelect("")}
            className={`w-full px-4 py-2.5 text-left font-geist text-[14px] transition-colors cursor-pointer ${
              value === ""
                ? "bg-[#F9FAFB] text-[#030712] font-medium"
                : "text-[#6A7282] hover:bg-[#F9FAFB]"
            }`}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`w-full px-4 py-2.5 text-left font-geist text-[14px] transition-colors cursor-pointer ${
                value === option.id
                  ? "bg-[#F9FAFB] text-[#030712] font-medium"
                  : "text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 font-geist text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}
