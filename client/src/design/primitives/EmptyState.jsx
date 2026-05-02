import React from 'react';
import { Icon } from '../icons';

export const EmptyState = ({ icon, title, sub }) => (
  <div className="flex flex-col items-center justify-center px-5 py-[60px] gap-3">
    <div className="w-12 h-12 rounded-xl bg-meridian-bg flex items-center justify-center text-meridian-muted">
      <Icon path={icon} size={20} />
    </div>
    <div className="text-meridian-text text-sm font-bold font-display">{title}</div>
    {sub && <div className="text-meridian-muted text-xs">{sub}</div>}
  </div>
);
