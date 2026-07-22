import React from 'react';
import { AirtableRecord, useInspectAttrs } from '../lib/airtable-hooks';
import { timeAgo, formatDateTime } from '../utils';
import {
  FiberNewIcon,
  SwapHorizIcon,
  PersonAddIcon,
  PersonRemoveIcon,
  NoteAddIcon,
  LinkIcon,
  PhotoCameraIcon,
  DevicesOtherIcon,
  RemoveCircleOutlineIcon,
  HistoryIcon,
  ArrowForwardIcon,
} from './Icons';

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  'Created': { icon: <FiberNewIcon size={16} />, color: '#003F2D' },
  'Status Changed': { icon: <SwapHorizIcon size={16} />, color: '#538184' },
  'Assigned': { icon: <PersonAddIcon size={16} />, color: '#032842' },
  'Reassigned': { icon: <SwapHorizIcon size={16} />, color: '#80BBAD' },
  'Unassigned': { icon: <PersonRemoveIcon size={16} />, color: '#7F8480' },
  'Note Added': { icon: <NoteAddIcon size={16} />, color: '#AF6002' },
  'External Ticket Linked': { icon: <LinkIcon size={16} />, color: '#6B5CE7' },
  'Screenshot Uploaded': { icon: <PhotoCameraIcon size={16} />, color: '#2E7D87' },
  'Device Added': { icon: <DevicesOtherIcon size={16} />, color: '#1976D2' },
  'Device Removed': { icon: <RemoveCircleOutlineIcon size={16} />, color: '#E81717' },
};

export interface TicketHistoryTabProps {
  historyRecords: AirtableRecord[];
}

export function TicketHistoryTab({ historyRecords }: TicketHistoryTabProps) {
  if (historyRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="text-[rgba(202,209,211,0.5)] mb-4">
          <HistoryIcon size={40} />
        </div>
        <h3 className="text-[1rem] font-semibold text-semantic-text mb-1.5">No history yet</h3>
        <p className="text-[0.875rem] text-[#666666] max-w-[280px] leading-normal">Changes to this ticket will appear here as a timeline.</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-4">
      {historyRecords.map((record, i) => (
        <HistoryTimelineItem
          key={record.id}
          record={record}
          isLast={i === historyRecords.length - 1}
        />
      ))}
    </div>
  );
}

function HistoryTimelineItem({ record, isLast }: { record: AirtableRecord; isLast: boolean }) {
  const summary = record.getCellValueAsString('Summary');
  const action = record.getCellValueAsString('Action');
  const changedBy = record.getCellValueAsString('Created By');
  const oldValue = record.getCellValueAsString('Old Value');
  const newValue = record.getCellValueAsString('New Value');
  const details = record.getCellValueAsString('Details');
  const timestamp = record.getCellValueAsString('Created');

  const summaryAttrs = useInspectAttrs(record, 'Summary');
  const detailsAttrs = useInspectAttrs(record, 'Details');

  const config = ACTION_CONFIG[action] || { icon: <HistoryIcon size={16} />, color: '#999' };
  const hasValueChange = oldValue || newValue;

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-[72px] pt-1.5 text-right pr-3">
        <p className="text-[0.6875rem] text-[rgba(67,82,84,0.5)] leading-tight">
          {timestamp ? timeAgo(timestamp) : ''}
        </p>
        {timestamp && (
          <p className="text-[0.6rem] text-[rgba(67,82,84,0.5)] mt-0.5 leading-tight">
            {formatDateTime(timestamp)}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-7 h-7 flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {config.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[rgba(202,209,211,0.3)] mt-1" />}
      </div>

      <div className={`flex-1 pt-1 ${isLast ? 'pb-2' : 'pb-5'}`}>
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span
            className="inline-block px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.04em]"
            style={{ backgroundColor: `${config.color}15`, color: config.color }}
          >
            {action}
          </span>
        </div>
        <p {...summaryAttrs} className="text-[0.8125rem] font-semibold text-semantic-text leading-snug">
          {summary}
        </p>

        {hasValueChange && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {oldValue && (
              <span className="inline-block px-1.5 py-0.5 text-[0.6875rem] font-medium line-through bg-[#FDE8E8] text-[#B10F41]">
                {oldValue}
              </span>
            )}
            {oldValue && newValue && (
              <ArrowForwardIcon size={12} className="text-[rgba(67,82,84,0.5)]" />
            )}
            {newValue && (
              <span className="inline-block px-1.5 py-0.5 text-[0.6875rem] font-medium bg-[#E6FCE8] text-[#006400]">
                {newValue}
              </span>
            )}
          </div>
        )}

        {details && (
          <p {...detailsAttrs} className="text-[0.75rem] text-[#666666] mt-1 leading-normal whitespace-pre-wrap">
            {details}
          </p>
        )}

        {changedBy && (
          <p className="text-[0.6875rem] text-[rgba(67,82,84,0.5)] mt-1">
            by {changedBy}
          </p>
        )}
      </div>
    </div>
  );
}
