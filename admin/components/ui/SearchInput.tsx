import React from "react";

type SearchInputProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SearchInput({
  placeholder = "Search data",
  value,
  onChange,
  className = "",
}: SearchInputProps): React.JSX.Element {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:w-[200px] px-4 py-2 pl-10 rounded-lg border border-[#E5E5E5] font-public text-[14px] font-medium tracking-[-0.14px] outline-none focus:border-black transition-colors placeholder:text-[#99A1AF] placeholder:font-public placeholder:text-[14px] placeholder:font-medium placeholder:tracking-[-0.14px]"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7.37593" cy="7.37495" r="4.70796" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.3376 13.3385L10.7031 10.7041" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}
