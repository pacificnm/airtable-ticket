import React from 'react';

interface AppErrorProps {
  title?: string;
  message?: string;
}

export function AppError({ title = 'Unable to load', message = 'Failed to connect to the database.' }: AppErrorProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center h-screen bg-[#F5F7F7]">
      <div className="bg-white border border-[#FFD4E0] p-6 max-w-[400px]">
        <h2 className="text-[1.125rem] font-serif font-normal text-semantic-text mb-2">{title}</h2>
        <p className="text-xs text-[#666666] font-sans">{message}</p>
      </div>
    </div>
  );
}
