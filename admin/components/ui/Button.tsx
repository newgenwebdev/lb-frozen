import React, { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  type?: "button" | "submit" | "reset";
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-[#333]",
  secondary: "bg-white border border-[#E5E5E5] text-black hover:bg-[#F5F5F5]",
  ghost: "bg-transparent text-[#999] hover:text-black",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2 text-[14px]",
  lg: "px-6 py-3 text-[16px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    children,
    icon,
    disabled = false,
    onClick,
    className = "",
    type = "button",
  },
  ref
): React.JSX.Element {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-geist flex items-center justify-center gap-2 rounded-lg font-medium tracking-[-0.12px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
});
