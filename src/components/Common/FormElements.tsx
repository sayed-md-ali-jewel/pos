import React from 'react';
import Link from 'next/link';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none ${className}`}
    >
      {title && (
        <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-slate-100">{title}</h3>
      )}
      {children}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary:
      'bg-slate-950 text-white shadow-sm shadow-slate-300 hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-slate-400 dark:bg-sky-600 dark:shadow-sky-900/40 dark:hover:bg-sky-500',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700',
    danger:
      'bg-rose-600 text-white shadow-sm shadow-rose-200 hover:-translate-y-0.5 hover:bg-rose-700 focus:ring-rose-300',
  };

  const sizeStyles = {
    sm: 'min-h-9 px-3 py-1.5 text-sm',
    md: 'min-h-10 px-4 py-2 text-sm',
    lg: 'min-h-12 px-5 py-3 text-base',
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled || isLoading ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : ''
      } ${className}`}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'view' | 'edit' | 'delete' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  label?: string;
  href?: string;
  title?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  icon,
  label,
  href,
  title,
  disabled,
  className = '',
  ...props
}) => {
  const variantStyles: Record<string, string> = {
    view: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700',
    edit: 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-300',
    delete: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-300',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-700',
    danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-300',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  const content = (
    <>
      {icon && <span className="inline-flex items-center">{icon}</span>}
      {label ? <span>{label}</span> : <span className="sr-only">{title || label}</span>}
    </>
  );

  const buttonClass = `inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
  const titleText = title ?? label;

  if (href) {
    return (
      <Link href={href} className={buttonClass} title={titleText}>
        {content}
      </Link>
    );
  }

  return (
    <button {...props} disabled={disabled} title={titleText} className={buttonClass}>
      {content}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          className={`input-field ${error ? 'border-rose-500 focus:ring-rose-300' : ''} ${className}`}
        />
        {error && (
          <p className="mt-1 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

const FormElements = { Card, Button, ActionButton, Input };
