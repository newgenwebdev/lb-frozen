"use client";

import React, { useState, useRef, useEffect } from "react";

type PromoFormDropdownProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  error?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function PromoFormDropdown({
  label,
  value,
  onChange,
  options,
  error,
  icon,
  className = "",
}: PromoFormDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={className} ref={dropdownRef}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6A7282]">
            {icon}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full cursor-pointer items-center justify-between rounded-lg border bg-white px-4 py-3 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors ${
            icon ? "pl-12" : ""
          } ${
            error
              ? "border-[#DC2626] focus:border-[#DC2626]"
              : "border-[#E5E5E5] focus:border-[#030712]"
          }`}
        >
          <span className={selectedOption ? "text-[#030712]" : "text-[#99A1AF]"}>
            {selectedOption?.label || "Select..."}
          </span>
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
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full cursor-pointer px-4 py-2 text-left font-public text-[14px] transition-colors ${
                  value === option.value
                    ? "bg-[#F9FAFB] font-medium text-[#030712]"
                    : "text-[#030712] hover:bg-[#F9FAFB]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}
