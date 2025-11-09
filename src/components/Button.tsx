import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'sm';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const base =
    size === 'sm'
      ? 'px-4 py-1 rounded-lg font-semibold text-sm w-auto min-w-[40px] focus:outline-none transition'
      : 'w-full py-3 rounded-xl font-semibold text-lg focus:outline-none transition';
  const variants = {
    primary: 'bg-sky-400 text-white hover:bg-sky-500',
    secondary:
      'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
