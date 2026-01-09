import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  titleClassName?: string;
};

export function Card({ children, className = "", title, action, titleClassName = "font-inter text-[16px] font-semibold text-black" }: CardProps): React.JSX.Element {
  return (
    <div className={`bg-white border border-[#E5E5E5] rounded-lg p-4 md:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h4 className={titleClassName}>{title}</h4>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
