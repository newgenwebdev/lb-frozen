"use client";

import React, { useState, useRef, useEffect } from "react";

type VariantTypeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
};

const VARIANT_TYPES = [
  "Color",
  "Size",
  "Material",
  "Style",
  "Pattern",
  "Weight",
  "Volume",
  "Custom",
];

export function VariantTypeSelector({
  value,
  onChange,
  onValuesChange,
  placeholder = "Choose Variant Type",
}: VariantTypeSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When variant type changes, reset the values
  const handleTypeChange = (type: string): void => {
    onChange(type);
    onValuesChange([]); // Reset values when type changes
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E3E3E3] bg-white px-4 py-3 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={value ? "text-[#030712]" : "text-[#6A7282]"}>
          {value || placeholder}
        </span>
        {/* Chevron icon */}
        <svg
          className={`h-4 w-4 text-[#030712] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#E3E3E3] bg-white shadow-lg"
        >
          {VARIANT_TYPES.map((type) => (
            <li
              key={type}
              role="option"
              aria-selected={value === type}
              onClick={() => handleTypeChange(type)}
              className={`cursor-pointer px-4 py-3 font-geist text-[16px] tracking-[-0.16px] text-[#030712] transition-colors hover:bg-[#F9FAFB] ${
                value === type ? "bg-[#F9FAFB] font-medium" : "font-normal"
              }`}
            >
              {type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
