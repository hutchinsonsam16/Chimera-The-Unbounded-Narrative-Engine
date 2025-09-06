import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'normal' | 'sm';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', size = 'normal', ...props }) => {
  const baseClasses = 'font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md';
  
  const sizeClasses = {
      normal: 'px-4 py-2',
      sm: 'px-2 py-1 text-xs'
  }

  const variantClasses = {
    primary: 'bg-sky-500 hover:bg-sky-60al text-white focus:ring-sky-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
