import React from 'react';

interface AppBarTitleProps {
  title: string;
  subtitle: string;
}

export function AppBarTitle({ title, subtitle }: AppBarTitleProps) {
  return (
    <div>
      <h1 className="font-serif text-[1.125rem] leading-none font-normal text-white">
        {title}
      </h1>
      <p className="text-core_palette-primary-5 mt-0.5 text-[0.75rem]">
        {subtitle}
      </p>
    </div>
  );
}
