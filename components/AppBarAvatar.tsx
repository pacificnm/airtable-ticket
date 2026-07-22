import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AirtableRecord, getLinkedRecordIds } from '../lib/airtable-hooks';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getInitials } from '../utils/userUtils';
import { OpenInNewIcon, CloseIcon, PersonIcon } from './Icons';

interface AppBarAvatarProps {
  userName: string;
  softwareRecords: AirtableRecord[];
}

interface SoftwareApp {
  id: string;
  name: string;
  url: string;
}

export function AppBarAvatar({ userName, softwareRecords }: AppBarAvatarProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { currentUser } = useCurrentUser();

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

  const userServices = currentUser?.serviceNames || [];
  const userRoles = currentUser?.roleNames || [];

  const matchingSoftware: SoftwareApp[] = useMemo(() => {
    if (!userServices.length || !softwareRecords.length) return [];

    const serviceNamesLower = new Set(userServices.map(s => s.toLowerCase()));

    return softwareRecords
      .filter(r => {
        const svcField = (r as any).fields?.['Services'];
        if (!svcField) return false;

        if (Array.isArray(svcField)) {
          return svcField.some((s: any) => {
            const name = typeof s === 'string' ? s : s?.name;
            return name && serviceNamesLower.has(name.toLowerCase());
          });
        }
        if (typeof svcField === 'string') {
          return serviceNamesLower.has(svcField.toLowerCase());
        }
        return false;
      })
      .map(r => ({
        id: r.id,
        name: r.getCellValueAsString('Name'),
        url: r.getCellValueAsString('URL') || r.getCellValueAsString('Website') || '',
      }))
      .filter(a => a.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [softwareRecords, userServices]);

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
              {currentUser?.serviceNames?.[0] && (
                <p className="text-[0.6875rem] text-white/60 truncate">{currentUser.serviceNames[0]}</p>
              )}
              {userRoles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {userRoles.map(role => (
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

          {userServices.length > 0 && (
            <div className="px-4 py-2 border-b border-[rgba(202,209,211,0.3)] bg-[#FAFBFB]">
              <span className="block text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[rgba(67,82,84,0.4)] mb-1">Services</span>
              <div className="flex flex-wrap gap-1">
                {userServices.map(svc => (
                  <span key={svc} className="inline-block px-1.5 py-0.5 text-[0.6875rem] font-medium bg-[#E6EAEA] text-semantic-text">
                    {svc}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto min-h-0">
            <div className="px-4 py-2 border-b border-[rgba(202,209,211,0.15)] bg-[#FAFBFB] sticky top-0 z-10">
              <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[rgba(67,82,84,0.4)]">
                Applications
                <span className="ml-1 normal-case tracking-normal font-normal text-[rgba(67,82,84,0.3)]">
                  ({matchingSoftware.length})
                </span>
              </span>
            </div>

            {matchingSoftware.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[0.8125rem] text-[#999999]">No applications for your services</p>
              </div>
            ) : (
              <div className="py-1">
                {matchingSoftware.map(app => (
                  <SoftwareRow key={app.id} app={app} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SoftwareRow({ app }: { app: SoftwareApp }) {
  if (app.url) {
    return (
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-1.5 hover:bg-[#F5F7F7] transition-colors group"
      >
        <div className="w-6 h-6 bg-core_palette-primary-1/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[0.5625rem] font-bold text-core_palette-primary-1">
            {app.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="flex-1 text-[0.8125rem] text-semantic-text truncate">{app.name}</span>
        <OpenInNewIcon size={12} className="text-[#CAD1D3] group-hover:text-core_palette-primary-1 transition-colors flex-shrink-0" />
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="w-6 h-6 bg-[#F2F4F8] flex items-center justify-center flex-shrink-0">
        <span className="text-[0.5625rem] font-bold text-[#999999]">
          {app.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className="flex-1 text-[0.8125rem] text-[#999999] truncate">{app.name}</span>
    </div>
  );
}
