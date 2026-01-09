import React from "react";

type PromoFormSectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function PromoFormSection({
  title,
  children,
  className = "",
}: PromoFormSectionProps): React.JSX.Element {
  return (
    <div
      className={`rounded-lg border border-[#E5E7EB] bg-white p-6 ${className}`}
    >
      <h2 className="mb-6 font-geist text-[16px] font-semibold tracking-[-0.16px] text-[#030712]">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
