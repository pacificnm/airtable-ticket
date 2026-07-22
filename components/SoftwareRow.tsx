import React from 'react';
import { OpenInNewIcon } from './Icons';

export interface SoftwareApp {
  id: string;
  name: string;
  url: string;
}

export function SoftwareRow({ app }: { app: SoftwareApp }) {
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
