"use client";

import React, { useState, useRef, useEffect } from "react";

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownMenuProps = {
  items: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function DropdownMenu({
  items,
  value,
  onChange,
  label,
  title = "Select Option",
  icon,
  className = "",
}: DropdownMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const displayLabel = label || items.find((item) => item.value === value)?.label || value;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="font-public flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white text-[14px] font-medium tracking-[-0.14px] text-[#030712] hover:bg-[#F5F5F5] transition-colors w-full cursor-pointer"
      >
        {icon}
        {displayLabel}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full sm:w-[240px] bg-white rounded-lg shadow-[0_4px_16px_0_rgba(0,0,0,0.12)] border border-[#E5E7EB] z-50">
          <div className="px-4 pt-4 pb-3">
            <h3 className="font-geist text-[14px] font-medium text-[#030712]">{title}</h3>
          </div>
          <div className="border-t border-[#E5E7EB]"></div>
          <div className="px-4 pt-3 pb-4">
            <div className="flex flex-col">
              {items.map((option, index) => (
                <div key={option.value}>
                  <label
                    className="flex items-center gap-3 py-3 cursor-pointer group"
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className="relative flex items-center justify-center w-5 h-5">
                      {value === option.value ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="9" fill="#6366F1" stroke="#6366F1" strokeWidth="2"/>
                          <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-[#D1D5DB] group-hover:border-[#9CA3AF] transition-colors"></div>
                      )}
                    </div>
                    <span className="font-public text-[14px] font-normal text-[#030712]">
                      {option.label}
                    </span>
                  </label>
                  {index < items.length - 1 && (
                    <div className="border-t border-[#E5E7EB]"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
