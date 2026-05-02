import React from 'react';

const VARIANT_CLASSES = {
  primary:   'bg-meridian-navy text-white border border-transparent',
  secondary: 'bg-white text-meridian-sub border-[1.5px] border-meridian-border',
  danger:    'bg-[#FEF2F2] text-meridian-red border-[1.5px] border-[#FECACA]',
  ghost:     'bg-transparent text-meridian-sub border border-transparent',
  blue:      'bg-meridian-blue text-white border border-transparent',
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
    className={`inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
    {...rest}
  >
    {icon}
    {children}
  </button>
);
