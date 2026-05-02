import React from 'react';
import { VISIT_STATUS } from '../tokens';

export const StatusBadge = ({ status, map = VISIT_STATUS }) => {
  const s = map[status] || map.draft;
  return (
    <span
      className="inline-block text-[10px] font-bold px-2 py-[3px] rounded whitespace-nowrap"
      style={{
        background: s.bg,
        color: s.text,
        letterSpacing: 0.4,
      }}
    >
      {s.label}
    </span>
  );
};
