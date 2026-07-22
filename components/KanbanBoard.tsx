import React from 'react';
import { AirtableRecord, useInspectAttrs } from '../lib/airtable-hooks';
import { STATUS_ORDER, STATUS_COLORS, PRIORITY_COLORS, TYPE_COLORS, TicketStatus, ServiceLevel } from '../types';
import { calculateSLA, formatDate, timeAgo } from '../utils';
import { SLAIndicator } from './SLAIndicator';

interface KanbanBoardProps {
  tickets: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  onSelectTicket: (record: AirtableRecord) => void;
}

export function KanbanBoard({ tickets, serviceLevels, onSelectTicket }: KanbanBoardProps) {
  const grouped = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = tickets.filter(t => t.getCellValueAsString('Status') === status);
    return acc;
  }, {} as Record<TicketStatus, AirtableRecord[]>);

  return (
    <div className="flex gap-4 px-6 py-4 overflow-x-auto min-h-0 flex-1" tabIndex={0}>
      {STATUS_ORDER.map(status => {
        const colors = STATUS_COLORS[status];
        const columnTickets = grouped[status] || [];
        return (
          <div key={status} className="flex-shrink-0 w-[280px] flex flex-col kanban-col">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: colors.dot }} />
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-semantic-text">
                {status}
              </span>
              <span className="font-mono text-[#999999] ml-auto text-[0.75rem]">
                {columnTickets.length}
              </span>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {columnTickets.map(ticket => (
                <KanbanCard
                  key={ticket.id}
                  ticket={ticket}
                  serviceLevels={serviceLevels}
                  onSelect={() => onSelectTicket(ticket)}
                />
              ))}
              {columnTickets.length === 0 && (
                <div className="border border-dashed border-[rgba(202,209,211,0.3)] py-8 flex items-center justify-center">
                  <span className="text-[#999999] text-[0.75rem]">No tickets</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  ticket,
  serviceLevels,
  onSelect,
}: {
  ticket: AirtableRecord;
  serviceLevels: ServiceLevel[];
  onSelect: () => void;
}) {
  const titleAttrs = useInspectAttrs(ticket, 'Title');
  const assigneeAttrs = useInspectAttrs(ticket, 'Assigned Technician');

  const title = ticket.getCellValueAsString('Title');
  const assignee = ticket.getCellValueAsString('Assigned Technician');
  const priority = ticket.getCellValueAsString('Service Levels');
  const type = ticket.getCellValueAsString('Request Type (from Subcategory)');
  const status = ticket.getCellValueAsString('Status');
  const createdDate = ticket.getCellValueAsString('Created Date');
  const lastModified = ticket.getCellValueAsString('Last Modified');
  const requester = ticket.getCellValueAsString('Requester Name');

  const sl = serviceLevels.find(s => s.name === priority) || null;
  const sla = calculateSLA(createdDate, sl, status);

  const priorityColor = PRIORITY_COLORS[priority] || { bg: '#F2F4F8', text: '#41454D' };
  const typeColor = TYPE_COLORS[type] || null;

  return (
    <article
      className="bg-white border border-[rgba(202,209,211,0.3)] hover:border-[rgba(0,63,45,0.4)] transition-[border-color] duration-150 cursor-pointer"
      onClick={onSelect}
    >
      <div className="p-3">
        <p
          {...titleAttrs}
          className="text-[0.875rem] font-medium text-semantic-text leading-snug mb-2 line-clamp-2"
        >
          {title}
        </p>

        <div className="flex flex-wrap gap-1 mb-2">
          {priority && (
            <span
              className="inline-block px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.05em]"
              style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}
            >
              {priority}
            </span>
          )}
          {type && typeColor && (
            <span
              className="inline-block px-1.5 py-0.5 text-[0.625rem] font-medium"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
            >
              {type}
            </span>
          )}
        </div>

        <SLAIndicator sla={sla} />

        <div className="flex justify-between mt-2 gap-2">
          {createdDate && (
            <span className="text-[#999999] text-[0.6rem]">Created {formatDate(createdDate)}</span>
          )}
          {lastModified && (
            <span className="text-[#999999] text-[0.6rem] text-right">Modified {timeAgo(lastModified)}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-[#E6EAEA]">
          <span className="text-[#999999] text-[0.6875rem] truncate max-w-[120px]">
            {requester}
          </span>
          {assignee && (
            <span {...assigneeAttrs} className="text-core_palette-primary-1 font-medium text-[0.6875rem] truncate max-w-[120px]">
              {assignee}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
