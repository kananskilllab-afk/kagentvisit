import React from 'react';
import { M } from '../tokens';

export const Avatar = ({ name = '', size = 32, color }) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let initials;
  if (words.length === 0) initials = '?';
  else if (words.length === 1) initials = words[0].slice(0, 2).toUpperCase();
  else initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const radius = size > 40 ? 10 : 7;
  const fontSize = size > 40 ? 14 : 11;
  const bg = color || M.navy;

  return (
    <div
      className="flex items-center justify-center text-white font-bold font-display flex-shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        fontSize,
      }}
    >
      {initials}
    </div>
  );
};
