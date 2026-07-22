import React from 'react';
import { NotificationsIcon } from './Icons';

export function NotificationIcon({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) {
  return (
    <button
      aria-label="Notifications"
      onClick={onClick}
      className="relative p-1 text-core_palette-primary-5 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center"
    >
      <NotificationsIcon size={20} />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 bg-semantic-error text-white text-[0.5625rem] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
