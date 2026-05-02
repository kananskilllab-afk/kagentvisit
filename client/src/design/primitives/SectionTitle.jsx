import React from 'react';

export const SectionTitle = ({ children, action, className = '' }) => (
  <div className={`flex items-center justify-between mb-[18px] ${className}`}>
    <h2 className="text-sm font-bold text-meridian-text font-display">
      {children}
    </h2>
    {action}
  </div>
);
