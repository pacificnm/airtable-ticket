import React from 'react';
import { CheckCircleOutlineIcon, WarningAmberIcon } from './Icons';
import { SLAStatus } from '../utils';

export function SLAIndicator({ sla, compact }: { sla: SLAStatus | null; compact?: boolean }) {
  if (!sla) return <span className="text-[#999999] text-[0.75rem]">No SLA</span>;

  if (sla.label === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1">
        <CheckCircleOutlineIcon size={14} className="text-[#006400]" />
        {!compact && <span className="text-[#006400] text-[0.75rem]">Done</span>}
      </span>
    );
  }

  const isOverdue = sla.isOverdue;
  const isWarning = !isOverdue && sla.percentUsed > 75;

  const bgColor = isOverdue ? '#FFF0F0' : isWarning ? '#FFF8E1' : '#F0FAF0';
  const textColor = isOverdue ? '#B10F41' : isWarning ? '#AF6002' : '#006400';
  const barColor = isOverdue ? '#E81717' : isWarning ? '#FFBA05' : '#048A0E';

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {isOverdue && <WarningAmberIcon size={14} style={{ color: textColor }} />}
        <span
          className="inline-block px-1.5 py-0.5 text-[0.75rem] font-medium font-mono h-[22px] leading-[18px]"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {sla.label}
        </span>
      </div>
      {!compact && (
        <div className="h-1 w-full bg-[#E6EAEA]">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${Math.min(sla.percentUsed, 100)}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  );
}
