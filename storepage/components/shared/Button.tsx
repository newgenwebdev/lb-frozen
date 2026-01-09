import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export default function Button({ 
  children, 
  variant = 'primary', 
  fullWidth = true,
  disabled,
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = 'py-3.5 px-4 font-medium transition-all shadow-sm';
  
  const variantClasses = {
    primary: disabled 
      ? 'bg-gradient-to-b from-[#6C80BC] to-[#DD7E83] text-white cursor-not-allowed'
      : 'bg-gradient-to-b from-[#23429B] to-[#C52129] text-white hover:opacity-90',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  };
  
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
