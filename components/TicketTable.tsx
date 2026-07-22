import React, { useState } from 'react';
import { AirtableRecord, useInspectAttrs } from '../lib/airtable-hooks';
import { STATUS_COLORS, PRIORITY_COLORS, TYPE_COLORS, ServiceLevel } from '../types';
import { calculateSLA, formatDate } from '../utils';
import { SLAIndicator } from './SLAIndicator';
import { ArrowUpwardIcon, ArrowDownwardIcon } from './Icons';

interface TicketTableProps {
  tickets: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  onSelectTicket: (record: AirtableRecord) => void;
}

type SortKey = 'Title' | 'Status' | 'Service Levels' | 'Assigned Technician' | 'Created Date' | 'Request Type (from Subcategory)';

export function TicketTable({ tickets, serviceLevels, onSelectTicket }: TicketTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('Created Date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...tickets].sort((a, b) => {
    const av = a.getCellValueAsString(sortKey);
    const bv = b.getCellValueAsString(sortKey);
    if (sortKey === 'Created Date') {
      const da = new Date(av).getTime() || 0;
      const db = new Date(bv).getTime() || 0;
      return sortDir === 'asc' ? da - db : db - da;
    }
    const cmp = av.localeCompare(bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[0.875rem] font-medium text-semantic-text">No tickets found</p>
        <p className="mt-1 text-[#999999] text-xs">Try adjusting your filters or create a new ticket.</p>
      </div>
    );
  }

  const columns: { label: string; field: SortKey }[] = [
    { label: 'Title', field: 'Title' },
    { label: 'Type', field: 'Request Type (from Subcategory)' },
    { label: 'Priority', field: 'Service Levels' },
    { label: 'Status', field: 'Status' },
    { label: 'Assignee', field: 'Assigned Technician' },
    { label: 'Created', field: 'Created Date' },
  ];

  return (
    <div className="overflow-x-auto" tabIndex={0}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-white">
            {columns.map(col => (
              <th
                key={col.field}
                onClick={() => handleSort(col.field)}
                className="text-left px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.7)] border-b border-[rgba(202,209,211,0.3)] cursor-pointer select-none hover:text-semantic-text transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.field && (
                    sortDir === 'asc'
                      ? <ArrowUpwardIcon size={14} className="text-core_palette-primary-1" />
                      : <ArrowDownwardIcon size={14} className="text-core_palette-primary-1" />
                  )}
                </span>
              </th>
            ))}
            <th className="text-left px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.7)] border-b border-[rgba(202,209,211,0.3)]">
              SLA
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(ticket => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              serviceLevels={serviceLevels}
              onSelect={() => onSelectTicket(ticket)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketRow({
  ticket,
  serviceLevels,
  onSelect,
}: {
  ticket: AirtableRecord;
  serviceLevels: ServiceLevel[];
  onSelect: () => void;
}) {
  const titleAttrs = useInspectAttrs(ticket, 'Title');
  const statusAttrs = useInspectAttrs(ticket, 'Status');
  const assigneeAttrs = useInspectAttrs(ticket, 'Assigned Technician');
  const createdAttrs = useInspectAttrs(ticket, 'Created Date');

  const title = ticket.getCellValueAsString('Title');
  const type = ticket.getCellValueAsString('Request Type (from Subcategory)');
  const priority = ticket.getCellValueAsString('Service Levels');
  const status = ticket.getCellValueAsString('Status');
  const assignee = ticket.getCellValueAsString('Assigned Technician');
  const createdDate = ticket.getCellValueAsString('Created Date');

  const sl = serviceLevels.find(s => s.name === priority) || null;
  const sla = calculateSLA(createdDate, sl, status);

  const statusColor = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS['Open'];
  const priorityColor = PRIORITY_COLORS[priority] || { bg: '#F2F4F8', text: '#41454D' };
  const typeColor = TYPE_COLORS[type] || null;

  return (
    <tr onClick={onSelect} className="cursor-pointer hover:bg-[#F5F7F7] transition-colors border-b border-[rgba(202,209,211,0.3)]">
      <td className="px-4 py-2.5 max-w-[300px]">
        <span {...titleAttrs} className="block text-[0.875rem] font-medium text-semantic-text truncate">
          {title}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {type && typeColor ? (
          <span className="inline-block px-1.5 py-0.5 text-[0.6875rem] font-medium" style={{ backgroundColor: typeColor.bg, color: typeColor.text }}>
            {type}
          </span>
        ) : (
          <span className="text-[#999999] text-xs">-</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className="inline-block px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.05em]" style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}>
          {priority || '-'}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span {...statusAttrs} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.75rem] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor.dot }} />
          {status}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span {...assigneeAttrs} className="text-[0.875rem] text-semantic-text">{assignee || '-'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span {...createdAttrs} className="text-[0.75rem] text-[#666666]">{formatDate(createdDate)}</span>
      </td>
      <td className="px-4 py-2.5">
        <SLAIndicator sla={sla} compact />
      </td>
    </tr>
  );
}
