import React from 'react';

export const SparkArea = ({ data, color, height = 80, uid = 'x' }) => {
  const max = Math.max(...data);
  const n = data.length;
  const pts = data.map((v, i) => `${(i / (n - 1)) * 100},${height - (v / max) * (height - 4)}`).join(' ');
  const area = `0,${height} ${pts} 100,${height}`;
  const gid = `mer_sa_${uid}`;
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: `${height}px` }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
