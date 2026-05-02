import React from 'react';

export const Lbl = ({ children, className = '' }) => (
  <div
    className={`text-meridian-sub text-[10px] font-bold uppercase tracking-[0.16em] mb-[7px] ${className}`}
  >
    {children}
  </div>
);
