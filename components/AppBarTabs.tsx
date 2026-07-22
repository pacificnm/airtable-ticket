import React from 'react';
import { AppView } from './Header';

interface AppBarTabsProps {
  tabValue: number | false;
  onViewChange: (view: AppView) => void;
}

export function AppBarTabs({ tabValue, onViewChange }: AppBarTabsProps) {
  const tabs = [
    { label: 'Tickets', index: 0, view: 'kanban' as AppView },
    { label: 'Documents', index: 1, view: 'documents' as AppView },
  ];

  return (
    <div className="flex items-stretch ml-4 gap-0 h-full relative">
      {tabs.map(tab => {
        const isActive = tabValue === tab.index;
        return (
          <button
            key={tab.label}
            onClick={() => onViewChange(tab.view)}
            className={`relative px-4 flex items-center text-[0.75rem] font-medium transition-colors ${
              isActive ? 'text-white' : 'text-core_palette-primary-5 hover:text-white'
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-core_palette-primary-2" />
            )}
          </button>
        );
      })}
    </div>
  );
}
