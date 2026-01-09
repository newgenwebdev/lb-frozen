import React from "react";

type FormInputProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "number" | "email" | "password";
  className?: string;
};

export function FormInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  className = "",
}: FormInputProps): React.JSX.Element {
  return (
    <div className={className}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={className.includes("bg-[#F9FAFB]")}
        className={`w-full rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] ${
          error
            ? "border-[#DC2626] focus:border-[#DC2626]"
            : "border-[#E5E5E5] focus:border-[#030712]"
        } ${className}`}
      />
      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}

