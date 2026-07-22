import React, { useState, useRef, useEffect } from 'react';
import { getInitials } from '../utils/userUtils';
import { CloseIcon, PersonIcon } from './Icons';

interface AvatarProps {
  userName: string;
  serviceNames?: string[];
  roleNames?: string[];
  children?: React.ReactNode;
}

export function Avatar({ userName, serviceNames = [], roleNames = [], children }: AvatarProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-label="User profile"
        className={`w-[30px] h-[30px] flex items-center justify-center text-[0.75rem] font-bold text-white cursor-pointer select-none transition-all ${
          open
            ? 'bg-core_palette-primary-2 text-core_palette-primary-3 border-2 border-core_palette-primary-2'
            : 'bg-core_palette-primary-1 border-2 border-white/20 hover:border-core_palette-primary-2/50'
        }`}
      >
        {getInitials(userName)}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+6px)] w-[320px] bg-white shadow-lg border border-[rgba(202,209,211,0.3)] z-[100] flex flex-col max-h-[calc(100vh-64px)]"
          style={{ animation: 'fadeSlideIn 0.15s ease-out forwards' }}
        >
          <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          <div className="bg-core_palette-primary-3 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-core_palette-primary-1 border-2 border-core_palette-primary-2/30 flex items-center justify-center flex-shrink-0">
              <PersonIcon size={22} className="text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.875rem] font-semibold text-white truncate">{userName || 'User'}</p>
              {serviceNames[0] && (
                <p className="text-[0.6875rem] text-white/60 truncate">{serviceNames[0]}</p>
              )}
              {roleNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {roleNames.map(role => (
                    <span key={role} className="inline-block px-1 py-0 text-[0.5625rem] font-semibold uppercase tracking-[0.06em] bg-core_palette-primary-2/20 text-core_palette-primary-2">
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 text-white/40 hover:text-white transition-colors flex-shrink-0"
              aria-label="Close profile"
            >
              <CloseIcon size={14} />
            </button>
          </div>

          {serviceNames.length > 0 && (
            <div className="px-4 py-2 border-b border-[rgba(202,209,211,0.3)] bg-[#FAFBFB]">
              <span className="block text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[rgba(67,82,84,0.4)] mb-1">Services</span>
              <div className="flex flex-wrap gap-1">
                {serviceNames.map(svc => (
                  <span key={svc} className="inline-block px-1.5 py-0.5 text-[0.6875rem] font-medium bg-[#E6EAEA] text-semantic-text">
                    {svc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {children && (
            <div className="flex-1 overflow-auto min-h-0">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
