import React from 'react';
import { MenuIcon } from './Icons';

interface MainMenuIconProps {
  onClick: () => void;
}

export function MainMenuIcon({ onClick }: MainMenuIconProps) {
  return (
    <button
      aria-label="Open menu"
      onClick={onClick}
      className="p-1.5 -ml-1.5 text-core_palette-primary-5 hover:text-white hover:bg-white/[0.08] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
    >
      <MenuIcon size={22} />
    </button>
  );
}
