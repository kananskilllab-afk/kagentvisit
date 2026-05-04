import React from 'react';

const VARIANT_CLASSES = {
  primary:   'bg-meridian-navy text-white border border-transparent hover:bg-slate-900',
  secondary: 'bg-white text-meridian-sub border-[1.5px] border-meridian-border hover:border-meridian-blue/30 hover:text-meridian-text',
  danger:    'bg-[#FEF2F2] text-meridian-red border-[1.5px] border-[#FECACA] hover:bg-red-100',
  ghost:     'bg-transparent text-meridian-sub border border-transparent hover:bg-meridian-bg hover:text-meridian-text',
  blue:      'bg-meridian-blue text-white border border-transparent hover:bg-blue-700',
};

const SIZE_CLASSES = {
  sm: 'h-[30px] px-[10px] text-xs',
  md: 'h-9 px-[14px] text-[13px]',
  lg: 'h-11 px-5 text-sm',
};

export const Btn = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  type = 'button',
  disabled = false,
  className = '',
  ...rest
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-1.5 font-semibold rounded-md shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 active:shadow-sm disabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
    {...rest}
  >
    {icon}
    {children}
  </button>
);
