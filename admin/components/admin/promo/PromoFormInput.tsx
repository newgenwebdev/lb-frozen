import React from "react";

type PromoFormInputProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "number" | "email" | "password";
  icon?: React.ReactNode;
  className?: string;
};

export function PromoFormInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  icon,
  className = "",
}: PromoFormInputProps): React.JSX.Element {
  return (
    <div className={className}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6A7282]">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-white px-4 py-3 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] ${
            icon ? "pl-12" : ""
          } ${
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
