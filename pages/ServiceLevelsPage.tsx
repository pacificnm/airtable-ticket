import React, { useState, useMemo } from 'react';
import { AddIcon, SpeedIcon } from '../components/Icons';
import {
  AirtableRecord,
  Table,
  useRecords,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { ServiceLevelDrawer } from '../components/ServiceLevelDrawer';
import { ServiceLevelCard } from '../components/ServiceLevelCard';

interface ServiceLevelsPageProps {
  slTable: Table;
  catRecords: AirtableRecord[];
}

export interface SLNode {
  id: string;
  record: AirtableRecord;
  name: string;
  description: string;
  responseHours: number;
  resolutionHours: number;
  priorityOrder: number;
  ticketIds: string[];
  categoryIds: string[];
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
  if (hours >= 24) {
    const d = Math.floor(hours / 24);
    const h = hours % 24;
    return `${d}d ${h}h`;
  }
  return `${hours}h`;
}

export function ServiceLevelsPage({ slTable, catRecords }: ServiceLevelsPageProps) {
  const { records: slRecords, loading, refetch: refetchSLs } = useRecords(slTable);

  const [showCreate, setShowCreate] = useState(false);
  const [editSL, setEditSL] = useState<SLNode | null>(null);

  const catMap = useMemo(() => {
    const map: Record<string, string> = {};
    catRecords.forEach(r => { map[r.id] = r.getCellValueAsString('Name'); });
    return map;
  }, [catRecords]);

  const slNodes: SLNode[] = useMemo(() =>
    slRecords.map(r => ({
      id: r.id,
      record: r,
      name: r.getCellValueAsString('Name'),
      description: r.getCellValueAsString('Description'),
      responseHours: (r.getCellValue('Response Time (hours)') as number) || 0,
      resolutionHours: (r.getCellValue('Resolution Time (hours)') as number) || 0,
      priorityOrder: (r.getCellValue('Priority Order') as number) || 99,
      ticketIds: getLinkedRecordIds((r as any).fields?.['Tickets']),
      categoryIds: getLinkedRecordIds((r as any).fields?.['Categories']),
    })).filter(n => n.name).sort((a, b) => a.priorityOrder - b.priorityOrder),
    [slRecords]
  );

  const maxResolution = useMemo(() =>
    Math.max(...slNodes.map(n => n.resolutionHours), 1),
    [slNodes]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SpeedIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Service Levels</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-mono bg-semantic-surface text-semantic-system-5">
              {slNodes.length}
            </span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors"
          >
            <AddIcon size={14} />
            New Service Level
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-core_palette-primary-1 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
          </div>
        ) : slNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
              <SpeedIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">No service levels yet</p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              Define SLA tiers with response and resolution time targets for your tickets.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1"
            >
              <AddIcon size={14} />
              Create service level
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {slNodes.map(node => (
              <ServiceLevelCard
                key={node.id}
                node={node}
                catMap={catMap}
                maxResolution={maxResolution}
                onEdit={() => setEditSL(node)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <ServiceLevelDrawer
          mode="create"
          slTable={slTable}
          onClose={() => setShowCreate(false)}
          onSaved={async () => {
            await refetchSLs();
            setShowCreate(false);
          }}
        />
      )}

      {editSL && (
        <ServiceLevelDrawer
          mode="edit"
          slTable={slTable}
          editNode={editSL}
          onClose={() => setEditSL(null)}
          onSaved={async () => {
            await refetchSLs();
            setEditSL(null);
          }}
        />
      )}
    </div>
  );
}
