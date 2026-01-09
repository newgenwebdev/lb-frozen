import React from "react";

type FormSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function FormSection({
  title,
  children,
  className = "",
}: FormSectionProps): React.JSX.Element {
  return (
    <div className={`rounded-lg border border-[#E5E7EB] bg-white p-6 ${className}`}>
      <h3 className="mb-4 font-geist text-[16px] font-medium leading-[150%] tracking-[-0.16px] text-[#030712]">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

