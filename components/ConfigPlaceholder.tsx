import React from 'react';

interface ConfigPlaceholderProps {
  title: string;
  description: string;
  icon: string;
}

export function ConfigPlaceholder({ title, description, icon }: ConfigPlaceholderProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
      <div className="w-14 h-14 bg-core_palette-primary-1 flex items-center justify-center mb-4">
        <span className="text-white text-2xl">
          {icon === 'people' ? '\u{1F465}' : icon === 'speed' ? '\u26A1' : '\u{1F4C2}'}
        </span>
      </div>
      <h3 className="text-[1.25rem] font-serif font-normal text-semantic-text mb-2">{title}</h3>
      <p className="text-xs text-[#666666] max-w-[360px] leading-relaxed font-sans">{description}</p>
      <p className="text-[#999999] mt-4 text-[0.75rem] font-sans">Coming soon</p>
    </div>
  );
}
