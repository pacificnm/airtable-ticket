import React from 'react';
import {
  EditIcon,
  AccessTimeIcon,
  TimerIcon,
  ConfirmationNumberIcon,
  CategoryIcon,
} from './Icons';
import {
  useInspectAttrs,
  DataValue,
  trackTransform,
} from '../lib/airtable-hooks';
import { SLNode, formatHours } from '../pages/ServiceLevelsPage';

const PRIORITY_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Critical': { bg: '#FFE0CC', text: '#AA2D00', border: '#FFBA7A' },
  'High': { bg: '#FFD4E0', text: '#B10F41', border: '#FFA3BA' },
  'Medium': { bg: '#FFEAB6', text: '#AF6002', border: '#FFD06B' },
  'Low': { bg: '#D1E2FF', text: '#0D52AC', border: '#9CBCF8' },
};

interface ServiceLevelCardProps {
  node: SLNode;
  catMap: Record<string, string>;
  maxResolution: number;
  onEdit: () => void;
}

export function ServiceLevelCard({ node, catMap, maxResolution, onEdit }: ServiceLevelCardProps) {
  const nameAttrs = useInspectAttrs(node.record, 'Name');
  const descAttrs = useInspectAttrs(node.record, 'Description');
  const responseAttrs = useInspectAttrs(node.record, 'Response Time (hours)');
  const resolutionAttrs = useInspectAttrs(node.record, 'Resolution Time (hours)');
  const priorityAttrs = useInspectAttrs(node.record, 'Priority Order');

  const badgeColors = PRIORITY_BADGE_COLORS[node.name] || { bg: '#F2F4F8', text: '#41454D', border: '#D0D5DD' };

  const responseBarPct = Math.min((node.responseHours / maxResolution) * 100, 100);
  const resolutionBarPct = Math.min((node.resolutionHours / maxResolution) * 100, 100);

  const categoryNames = node.categoryIds.map(id => catMap[id]).filter(Boolean);

  const ticketCountProvenance = trackTransform(
    String(node.ticketIds.length),
    node.record.getProvenance('Tickets'),
    { type: 'count', description: 'Number of linked tickets' }
  );

  const catCountProvenance = trackTransform(
    String(node.categoryIds.length),
    node.record.getProvenance('Categories'),
    { type: 'count', description: 'Number of linked categories' }
  );

  return (
    <div
      className="bg-white border border-semantic-surface overflow-hidden transition-colors"
      style={{ borderColor: undefined }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = badgeColors.text)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
    >
      <div className="flex">
        {/* Colored left bar */}
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: badgeColors.text }} />

        <div className="flex-1 p-4">
          {/* Header row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                {...priorityAttrs}
                className="inline-flex items-center px-1 h-5 text-[0.625rem] font-bold font-mono"
                style={{
                  backgroundColor: badgeColors.bg,
                  color: badgeColors.text,
                  border: `1px solid ${badgeColors.border}`,
                }}
              >
                P{node.priorityOrder}
              </span>
              <span
                {...nameAttrs}
                className="text-[0.875rem] font-semibold font-sans"
                style={{ color: badgeColors.text }}
              >
                {node.name}
              </span>
            </div>
            <button
              onClick={onEdit}
              className="text-semantic-system-5 hover:opacity-80 p-0.5"
              style={{ color: undefined }}
              onMouseEnter={e => (e.currentTarget.style.color = badgeColors.text)}
              onMouseLeave={e => (e.currentTarget.style.color = '')}
              aria-label={`Edit ${node.name}`}
            >
              <EditIcon size={14} />
            </button>
          </div>

          {/* Description */}
          {node.description && (
            <p
              {...descAttrs}
              className="text-[0.75rem] text-semantic-system-5 leading-relaxed mb-3 line-clamp-2"
            >
              {node.description}
            </p>
          )}

          {/* Time bars */}
          <div className="flex gap-6 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <AccessTimeIcon size={12} style={{ color: badgeColors.text, opacity: 0.6 }} />
                <span className="text-[0.5625rem] font-medium uppercase tracking-wider" style={{ color: badgeColors.text, opacity: 0.7 }}>
                  Response
                </span>
              </div>
              <p {...responseAttrs} className="text-[1rem] font-semibold font-mono mb-0.5" style={{ color: badgeColors.text }}>
                {formatHours(node.responseHours)}
              </p>
              <div className="h-1 w-full" style={{ backgroundColor: badgeColors.bg }}>
                <div className="h-full" style={{ width: `${responseBarPct}%`, backgroundColor: badgeColors.text }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <TimerIcon size={12} style={{ color: badgeColors.text, opacity: 0.6 }} />
                <span className="text-[0.5625rem] font-medium uppercase tracking-wider" style={{ color: badgeColors.text, opacity: 0.7 }}>
                  Resolution
                </span>
              </div>
              <p {...resolutionAttrs} className="text-[1rem] font-semibold font-mono mb-0.5" style={{ color: badgeColors.text }}>
                {formatHours(node.resolutionHours)}
              </p>
              <div className="h-1 w-full" style={{ backgroundColor: badgeColors.bg }}>
                <div className="h-full" style={{ width: `${resolutionBarPct}%`, backgroundColor: badgeColors.text, opacity: 0.6 }} />
              </div>
            </div>
          </div>

          {/* Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1 px-1.5 h-5 text-[0.625rem] font-medium"
              style={{ backgroundColor: badgeColors.bg, color: badgeColors.text }}
            >
              <ConfirmationNumberIcon size={11} style={{ color: badgeColors.text }} />
              <DataValue provenance={ticketCountProvenance}>{node.ticketIds.length} tickets</DataValue>
            </span>
            {node.categoryIds.length > 0 && (
              <span
                className="inline-flex items-center gap-1 px-1.5 h-5 text-[0.625rem] font-medium"
                style={{ backgroundColor: '#E6FCE8', color: '#006400' }}
              >
                <CategoryIcon size={11} style={{ color: '#006400' }} />
                <DataValue provenance={catCountProvenance}>
                  {categoryNames.length > 2 ? `${categoryNames.length} categories` : categoryNames.join(', ')}
                </DataValue>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
