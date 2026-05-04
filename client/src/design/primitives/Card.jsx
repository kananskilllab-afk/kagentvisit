import React from 'react';

export const Card = ({ children, className = '', ...rest }) => (
  <div
    className={`rounded-lg border border-meridian-border/80 bg-white shadow-meridian-card transition-all duration-200 ease-out ${className}`}
    {...rest}
  >
    {children}
  </div>
);
