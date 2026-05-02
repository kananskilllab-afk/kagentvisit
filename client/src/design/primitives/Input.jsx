import React from 'react';

export const Input = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  icon,
  className = '',
  ...rest
}) => (
  <div className="relative">
    {icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-meridian-sub">
        {icon}
      </div>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full h-10 border-[1.5px] border-meridian-border rounded-[7px] bg-white ${icon ? 'pl-[38px]' : 'pl-3'} pr-3 text-[13px] text-meridian-text outline-none font-sans focus:border-meridian-blue ${className}`}
      {...rest}
    />
  </div>
);
