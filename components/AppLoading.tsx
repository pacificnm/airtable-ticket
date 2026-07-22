import React from 'react';

export interface AppLoadingProps {
  label?: string;
}

export function AppLoading({ label = 'Loading...' }: AppLoadingProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F5F7F7] gap-3">
      <div className="w-10 h-10 border-[3px] border-core_palette-primary-5 border-t-core_palette-primary-1 rounded-none animate-spin" role="status" aria-label="Loading" />
      <p className="text-xs text-[#666666] font-sans">{label}</p>
    </div>
  );
}
