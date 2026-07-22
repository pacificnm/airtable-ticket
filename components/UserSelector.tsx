import React from 'react';
import { AirtableRecord } from '../lib/airtable-hooks';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { SwapHorizIcon } from './Icons';

interface UserSelectorProps {
  peopleRecords: AirtableRecord[];
}

export function UserSelector({ peopleRecords }: UserSelectorProps) {
  const { currentUser, realUser, setCurrentUserId, clearImpersonation, isImpersonating, canImpersonate, identityLoading } = useCurrentUser();

  // Non-admins never see the switcher — they always act as the real signed-in viewer.
  if (!canImpersonate) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[0.575rem] font-semibold uppercase tracking-[0.1em] text-white/35">Signed in as</span>
        </div>
        <p className="text-white text-[0.8125rem] font-medium truncate">
          {identityLoading ? 'Identifying…' : currentUser?.name || 'Unknown viewer'}
        </p>
        {currentUser?.email && (
          <p className="text-white/40 text-[0.6875rem] truncate">{currentUser.email}</p>
        )}
      </div>
    );
  }

  const sortedPeople = [...peopleRecords].sort((a, b) =>
    a.getCellValueAsString('Name').localeCompare(b.getCellValueAsString('Name'))
  );

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <SwapHorizIcon size={14} className="text-white/35" />
        <span className="text-[0.575rem] font-semibold uppercase tracking-[0.1em] text-white/35">View as (admin)</span>
      </div>
      <select
        value={currentUser?.id || ''}
        onChange={(e: any) => setCurrentUserId(e.target.value)}
        aria-label="View the app as another person"
        className="w-full bg-white/[0.06] border border-white/15 text-white text-[0.8125rem] px-2 py-1.5 focus:outline-none focus:border-core_palette-primary-1 appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='rgba(255,255,255,0.4)'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
      >
        {sortedPeople.map(person => (
          <option key={person.id} value={person.id} className="bg-core_palette-primary-3 text-white">
            {person.getCellValueAsString('Name')}
          </option>
        ))}
      </select>
      {isImpersonating && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[0.625rem] text-core_palette-primary-2 truncate">
            Viewing as someone else
          </span>
          <button
            onClick={clearImpersonation}
            className="text-[0.6875rem] font-medium text-white/70 hover:text-white underline underline-offset-2 flex-shrink-0"
          >
            Back to {realUser?.name?.split(' ')[0] || 'me'}
          </button>
        </div>
      )}
    </div>
  );
}
