import React from 'react';

interface AppBarTitleProps {
  ticketCount: number;
}

export function AppBarTitle({ ticketCount }: AppBarTitleProps) {
  return (
    <div>
      <h1 className="font-serif text-[1.125rem] leading-none font-normal text-white">
        Service Desk
      </h1>
      <p className="text-core_palette-primary-5 mt-0.5 text-[0.75rem]">
        {ticketCount} tickets
      </p>
    </div>
  );
}
