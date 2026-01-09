import React from "react";

type UserFormInputProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "email" | "password";
  icon?: "grid" | "gear";
  autoComplete?: string;
};

export function UserFormInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  icon = "grid",
  autoComplete = "off",
}: UserFormInputProps): React.JSX.Element {
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
    <div>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {icon === "grid" ? GridIcon : GearIcon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-lg border pl-10 pr-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] ${
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

