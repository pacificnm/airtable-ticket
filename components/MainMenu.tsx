import React from 'react';
import { AirtableRecord } from '../lib/airtable-hooks';
import { AppView } from './Header';
import {
  CloseIcon,
  GridViewIcon,
  AssignmentIndIcon,
  ConfirmationNumberIcon,
  DevicesIcon,
  AppsIcon,
  LocationOnIcon,
  PeopleIcon,
  CategoryIcon,
  SpeedIcon,
  FolderSpecialIcon,
  PlaylistAddCheckIcon,
  ShieldIcon,
  KeyIcon,
  DashboardIcon,
  DescriptionIcon,
  SearchIcon,
  CodeIcon,
} from './Icons';
import { UserSelector } from './UserSelector';
import { RoleGuard } from './RoleGuard';

interface MainMenuProps {
  open: boolean;
  onClose: () => void;
  view: AppView;
  onViewChange: (view: AppView) => void;
  peopleRecords: AirtableRecord[];
}

function MenuButton({ selected, onClick, icon, label }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full py-1.5 px-3 text-[0.8125rem] font-medium transition-colors ${
        selected
          ? 'bg-[rgba(0,63,45,0.5)] text-core_palette-primary-2'
          : 'text-core_palette-primary-5 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      <span className="w-5 flex items-center justify-center flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

export function MainMenu({ open, onClose, view, onViewChange, peopleRecords }: MainMenuProps) {
  const navigate = (target: AppView) => {
    onViewChange(target);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative z-50 w-[280px] h-full bg-core_palette-primary-3 text-white flex flex-col sidesheet-enter" style={{ animation: 'slideInLeft 0.25s cubic-bezier(0.75, 0.02, 0.5, 1) forwards' }}>
        <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>

        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-core_palette-primary-1 flex items-center justify-center">
              <GridViewIcon size={16} className="text-white" />
            </div>
            <h2 className="font-serif text-base font-normal">Service Desk</h2>
          </div>
          <button onClick={onClose} className="p-1 text-core_palette-primary-5 hover:text-white transition-colors" aria-label="Close menu">
            <CloseIcon size={18} />
          </button>
        </div>

        <hr className="border-white/10 m-0" />

        <nav className="flex-1 px-2 py-3 flex flex-col gap-4 overflow-auto">
          <div>
            <span className="block px-3 mb-1 text-[0.575rem] font-semibold uppercase tracking-[0.1em] text-white/35">
              Tickets
            </span>
            <MenuButton
              selected={view === 'home'}
              onClick={() => navigate('home')}
              icon={<AssignmentIndIcon size={18} />}
              label="My Work"
            />
            <MenuButton
              selected={view === 'kanban' || view === 'table'}
              onClick={() => navigate(view === 'table' ? 'table' : 'kanban')}
              icon={<ConfirmationNumberIcon size={18} />}
              label="All Tickets"
            />
            <MenuButton
              selected={view === 'devices'}
              onClick={() => navigate('devices')}
              icon={<DevicesIcon size={18} />}
              label="Devices"
            />
            <MenuButton
              selected={view === 'software'}
              onClick={() => navigate('software')}
              icon={<AppsIcon size={18} />}
              label="Software"
            />
            <MenuButton
              selected={view === 'locations'}
              onClick={() => navigate('locations')}
              icon={<LocationOnIcon size={18} />}
              label="Locations"
            />
            <MenuButton
              selected={view === 'dos'}
              onClick={() => navigate('dos')}
              icon={<DescriptionIcon size={18} />}
              label="DOS"
            />
            <MenuButton
              selected={view === 'tableau'}
              onClick={() => navigate('tableau')}
              icon={<DashboardIcon size={18} />}
              label="Tableau Dashboards"
            />
          </div>

          <RoleGuard permission="config.view">
            <div>
              <span className="block px-3 mb-1 text-[0.575rem] font-semibold uppercase tracking-[0.1em] text-white/35">
                Configuration
              </span>
              <MenuButton
                selected={view === 'technicians'}
                onClick={() => navigate('technicians')}
                icon={<PeopleIcon size={18} />}
                label="Technicians"
              />
              <MenuButton
                selected={view === 'people'}
                onClick={() => navigate('people')}
                icon={<PeopleIcon size={18} />}
                label="People"
              />
              <MenuButton
                selected={view === 'categories'}
                onClick={() => navigate('categories')}
                icon={<CategoryIcon size={18} />}
                label="Categories"
              />
              <MenuButton
                selected={view === 'servicelevels'}
                onClick={() => navigate('servicelevels')}
                icon={<SpeedIcon size={18} />}
                label="Service Levels"
              />
              <MenuButton
                selected={view === 'groups'}
                onClick={() => navigate('groups')}
                icon={<FolderSpecialIcon size={18} />}
                label="Ticket Groups"
              />
              <MenuButton
                selected={view === 'defaulttasks'}
                onClick={() => navigate('defaulttasks')}
                icon={<PlaylistAddCheckIcon size={18} />}
                label="Default Tasks"
              />
              <MenuButton
                selected={view === 'roles'}
                onClick={() => navigate('roles')}
                icon={<ShieldIcon size={18} />}
                label="Roles"
              />
              <MenuButton
                selected={view === 'permissions'}
                onClick={() => navigate('permissions')}
                icon={<KeyIcon size={18} />}
                label="Permissions"
              />
              <MenuButton
                selected={view === 'dossearchconfig'}
                onClick={() => navigate('dossearchconfig')}
                icon={<SearchIcon size={18} />}
                label="Ask DOS Config"
              />
              <MenuButton
                selected={view === 'devreference'}
                onClick={() => navigate('devreference')}
                icon={<CodeIcon size={18} />}
                label="Developer Reference"
              />
            </div>
          </RoleGuard>
        </nav>

        <hr className="border-white/10 m-0" />
        <UserSelector peopleRecords={peopleRecords} />
      </div>
    </div>
  );
}
