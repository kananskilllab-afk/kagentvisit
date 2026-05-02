import React from 'react';
import { ROLE_META } from '../tokens';

export const RolePill = ({ role, className = '' }) => {
  const r = ROLE_META[role] || { label: role, bg: '#F1F5F9', text: '#475569' };
  return (
    <span
      className={`inline-block text-[9px] font-bold px-1.5 py-[2px] rounded-[3px] uppercase ${className}`}
      style={{
        background: r.bg,
        color: r.text,
        letterSpacing: 0.5,
      }}
    >
      {r.label}
    </span>
  );
};
