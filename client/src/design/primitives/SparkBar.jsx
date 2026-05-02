import React from 'react';

export const SparkBar = ({ data, color, height = 80, uid = 'y' }) => {
  const max = Math.max(...data);
  const w = 100 / data.length;
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: `${height}px` }}
    >
      {data.map((v, i) => (
        <rect
          key={i}
          x={i * w + w * 0.1}
          y={height - (v / max) * (height - 2)}
          width={w * 0.8}
          height={(v / max) * (height - 2)}
          rx="1.5"
          fill={color}
          opacity={0.2 + 0.8 * (i / (data.length - 1))}
        />
      ))}
    </svg>
  );
};
