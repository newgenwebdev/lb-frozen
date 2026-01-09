import React, { useState, useRef, useEffect } from "react";

type UserFormDropdownProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  error?: string;
  icon?: "grid" | "gear";
};

export function UserFormDropdown({
  label,
  value,
  onChange,
  options,
  error,
  icon = "grid",
}: UserFormDropdownProps): React.JSX.Element {
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

  const GridIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.16667 6.5H3.33333C2.59667 6.5 2 5.90333 2 5.16667V3.33333C2 2.59667 2.59667 2 3.33333 2H5.16667C5.90333 2 6.5 2.59667 6.5 3.33333V5.16667C6.5 5.90333 5.90333 6.5 5.16667 6.5Z"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.6667 6.5H10.8333C10.0967 6.5 9.5 5.90333 9.5 5.16667V3.33333C9.5 2.59667 10.0967 2 10.8333 2H12.6667C13.4033 2 14 2.59667 14 3.33333V5.16667C14 5.90333 13.4033 6.5 12.6667 6.5Z"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.16667 14H3.33333C2.59667 14 2 13.4033 2 12.6667V10.8333C2 10.0967 2.59667 9.5 3.33333 9.5H5.16667C5.90333 9.5 6.5 10.0967 6.5 10.8333V12.6667C6.5 13.4033 5.90333 14 5.16667 14Z"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.6667 14H10.8333C10.0967 14 9.5 13.4033 9.5 12.6667V10.8333C9.5 10.0967 10.0967 9.5 10.8333 9.5H12.6667C13.4033 9.5 14 10.0967 14 10.8333V12.6667C14 13.4033 13.4033 14 12.6667 14Z"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const GearIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6667 8.66667C12.6667 8.66667 12.3333 9.33333 11.6667 10C12.3333 10.6667 12.6667 11.3333 12.6667 11.3333M3.33333 8.66667C3.33333 8.66667 3.66667 9.33333 4.33333 10C3.66667 10.6667 3.33333 11.3333 3.33333 11.3333M8.66667 12.6667C8.66667 12.6667 9.33333 12.3333 10 11.6667C10.6667 12.3333 11.3333 12.6667 11.3333 12.6667M8.66667 3.33333C8.66667 3.33333 9.33333 3.66667 10 4.33333C10.6667 3.66667 11.3333 3.33333 11.3333 3.33333M3.33333 7.33333C3.33333 7.33333 3.66667 6.66667 4.33333 6C3.66667 5.33333 3.33333 4.66667 3.33333 4.66667M12.6667 7.33333C12.6667 7.33333 12.3333 6.66667 11.6667 6C12.3333 5.33333 12.6667 4.66667 12.6667 4.66667M7.33333 3.33333C7.33333 3.33333 6.66667 3.66667 6 4.33333C5.33333 3.66667 4.66667 3.33333 4.66667 3.33333M7.33333 12.6667C7.33333 12.6667 6.66667 12.3333 6 11.6667C5.33333 12.3333 4.66667 12.6667 4.66667 12.6667"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div ref={dropdownRef}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {icon === "grid" ? GridIcon : GearIcon}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-lg border px-4 py-2 pl-10 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors bg-white cursor-pointer ${
            error
              ? "border-[#DC2626] focus:border-[#DC2626]"
              : "border-[#E5E5E5] focus:border-[#030712]"
          }`}
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
                className={`w-full px-4 py-2 text-left font-public text-[14px] transition-colors cursor-pointer ${
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
      </div>

      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}
