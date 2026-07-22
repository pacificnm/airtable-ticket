import React, { useState } from 'react';
import { AirtableRecord } from '../lib/airtable-hooks';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { MainMenu } from './MainMenu';
import { MainMenuIcon } from './MainMenuIcon';
import { NotificationIcon } from './NotificationIcon';
import { AppBarTitle } from './AppBarTitle';
import { AppBarTabs } from './AppBarTabs';
import { AppBarAvatar } from './AppBarAvatar';
import { AddIcon, ViewColumnIcon, TableChartIcon, TimelineIcon, AssignmentIndIcon } from './Icons';
import { RoleGuard } from './RoleGuard';

export type AppView = 'home' | 'kanban' | 'table' | 'timeline' | 'groups' | 'technicians' | 'people' | 'categories' | 'servicelevels' | 'documents' | 'devices' | 'software' | 'locations' | 'dos' | 'tableau' | 'defaulttasks' | 'roles' | 'permissions' | 'dossearchconfig' | 'devreference';

interface HeaderProps {
  view: AppView;
  onViewChange: (view: AppView) => void;
  onNewTicket: () => void;
  ticketCount: number;
  unreadCount: number;
  onNotificationsClick: () => void;
  peopleRecords: AirtableRecord[];
  softwareRecords: AirtableRecord[];
}

export function Header({ view, onViewChange, onNewTicket, ticketCount, unreadCount, onNotificationsClick, peopleRecords, softwareRecords }: HeaderProps) {
  const isTicketView = view === 'kanban' || view === 'table' || view === 'timeline';
  const tabValue = isTicketView ? 0 : view === 'documents' ? 1 : false;
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser } = useCurrentUser();

  const userName = currentUser?.name || '';

  return (
    <header className="bg-core_palette-primary-3 flex-shrink-0">
      <nav className="flex items-center gap-4 px-3 h-12">
        <MainMenuIcon onClick={() => setMenuOpen(true)} />

        <MainMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          view={view}
          onViewChange={onViewChange}
          peopleRecords={peopleRecords}
        />

        <AppBarTitle title="Service Desk" subtitle={`${ticketCount} tickets`} />

        <button
          onClick={() => onViewChange('home')}
          aria-label="My Work"
          className={`flex items-center gap-1.5 px-2 py-1 text-[0.8125rem] font-medium transition-colors ${
            view === 'home'
              ? 'text-white border-b-2 border-core_palette-primary-2'
              : 'text-core_palette-primary-5 hover:text-white border-b-2 border-transparent'
          }`}
        >
          <AssignmentIndIcon size={16} />
          My Work
        </button>

        <AppBarTabs tabValue={tabValue} onViewChange={onViewChange} />

        <div className="flex-1" />

        {isTicketView && (
          <div className="flex items-center gap-3">
            <div className="flex bg-[rgba(0,63,45,0.4)]">
              <button
                onClick={() => onViewChange('kanban')}
                aria-label="Board view"
                className={`flex items-center gap-1 px-3 py-1 text-[0.75rem] font-medium transition-colors ${
                  view === 'kanban'
                    ? 'bg-core_palette-primary-1 text-white'
                    : 'text-core_palette-primary-5 hover:text-white'
                }`}
              >
                <ViewColumnIcon size={16} />
                Board
              </button>
              <button
                onClick={() => onViewChange('table')}
                aria-label="Table view"
                className={`flex items-center gap-1 px-3 py-1 text-[0.75rem] font-medium transition-colors ${
                  view === 'table'
                    ? 'bg-core_palette-primary-1 text-white'
                    : 'text-core_palette-primary-5 hover:text-white'
                }`}
              >
                <TableChartIcon size={16} />
                Table
              </button>
              <button
                onClick={() => onViewChange('timeline')}
                aria-label="Timeline view"
                className={`flex items-center gap-1 px-3 py-1 text-[0.75rem] font-medium transition-colors ${
                  view === 'timeline'
                    ? 'bg-core_palette-primary-1 text-white'
                    : 'text-core_palette-primary-5 hover:text-white'
                }`}
              >
                <TimelineIcon size={16} />
                Timeline
              </button>
            </div>

            <RoleGuard permission="tickets.create">
              <button
                onClick={onNewTicket}
                className="flex items-center gap-1.5 bg-core_palette-primary-1 hover:bg-[#004D37] text-white text-[0.75rem] font-medium px-3 py-1 min-h-[32px] transition-colors"
              >
                <AddIcon size={16} />
                New Ticket
              </button>
            </RoleGuard>
          </div>
        )}

        <NotificationIcon unreadCount={unreadCount} onClick={onNotificationsClick} />

        <AppBarAvatar userName={userName} softwareRecords={softwareRecords} />
      </nav>
    </header>
  );
}
