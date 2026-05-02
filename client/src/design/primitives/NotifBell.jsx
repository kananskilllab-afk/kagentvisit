import React from 'react';
import { Icon, IC } from '../icons';

export const NotifBell = ({ count = 0, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
    className={`relative w-9 h-9 rounded-[7px] border-[1.5px] border-meridian-border bg-white flex items-center justify-center text-meridian-sub cursor-pointer ${className}`}
  >
    <Icon path={IC.bell} size={16} />
    {count > 0 && (
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-meridian-red text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
        {count}
      </span>
    )}
  </button>
);
