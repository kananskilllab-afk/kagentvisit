import React from 'react';

export const Card = ({ children, className = '', ...rest }) => (
  <div
    className={`bg-white rounded-lg shadow-meridian-card ${className}`}
    {...rest}
  >
    {children}
  </div>
);
