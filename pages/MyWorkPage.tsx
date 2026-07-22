import React, { useMemo } from 'react';
import {
  AirtableRecord,
  Table,
  useInspectAttrs,
  trackAirtableAggregate,
  DataValue,
} from '../lib/airtable-hooks';
import { STATUS_COLORS, PRIORITY_COLORS, ServiceLevel, TicketStatus } from '../types';
import { calculateSLA, formatDate } from '../utils';
import { SLAIndicator } from '../components/SLAIndicator';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { assignedToMe, raisedByMe } from '../utils/ticketAccess';
import {
  AssignmentIndIcon,
  SendIcon,
  ConfirmationNumberIcon,
  PersonIcon,
  InfoOutlinedIcon,
} from '../components/Icons';

interface MyWorkPageProps {
  tickets: AirtableRecord[];
  ticketsTable: Table;
  serviceLevels: ServiceLevel[];
  onSelectTicket: (record: AirtableRecord) => void;
}

const OPEN_STATUSES: TicketStatus[] = ['Open', 'In Progress', 'On Hold'];

export function MyWorkPage({ tickets, ticketsTable, serviceLevels, onSelectTicket }: MyWorkPageProps) {
  const { currentUser, isImpersonating, identityLoading, identityResolved } = useCurrentUser();

  const { assigned, raised, myTickets } = useMemo(() => {
    if (!currentUser) return { assigned: [], raised: [], myTickets: [] };
    const assigned = tickets.filter(t => assignedToMe(t, currentUser));
    const raised = tickets.filter(t => raisedByMe(t, currentUser));
    const seen = new Set<string>();
    const myTickets: AirtableRecord[] = [];
    [...assigned, ...raised].forEach(t => {
      if (!seen.has(t.id)) { seen.add(t.id); myTickets.push(t); }
    });
    return { assigned, raised, myTickets };
  }, [tickets, currentUser]);

  if (identityLoading) {
    return (
      <main className="flex-1 min-h-0 bg-[#F5F7F7] overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-6" aria-busy="true" aria-label="Loading your work">
          <div className="h-8 w-48 bg-white animate-pulse mb-4" />
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[0, 1, 2].map(i => <div key={i} className="h-20 bg-white animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 bg-white animate-pulse" />
            <div className="h-64 bg-white animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (!currentUser || !identityResolved) {
    return (
      <main className="flex-1 min-h-0 bg-[#F5F7F7] overflow-auto">
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-12 h-12 flex items-center justify-center mb-4 bg-core_palette-primary-1">
            <PersonIcon size={24} className="text-white" />
          </div>
          <h2 className="text-[1.125rem] font-semibold text-semantic-text mb-1.5">We couldn't identify you</h2>
          <p className="text-[0.875rem] text-[#666666] max-w-[380px] leading-normal">
            Your account isn't linked to a person in this workspace yet, so we can't show your personalized work.
            Ask an administrator to add you to the People directory, then reload.
          </p>
        </div>
      </main>
    );
  }

  const openCount = myTickets.filter(t => OPEN_STATUSES.includes(t.getCellValueAsString('Status') as TicketStatus)).length;
  const resolvedCount = myTickets.filter(t => {
    const s = t.getCellValueAsString('Status');
    return s === 'Resolved' || s === 'Closed';
  }).length;

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'there';

  const stats = [
    { key: 'total', label: 'My tickets', value: myTickets.length, records: myTickets },
    { key: 'open', label: 'Open', value: openCount, records: myTickets.filter(t => OPEN_STATUSES.includes(t.getCellValueAsString('Status') as TicketStatus)) },
    { key: 'resolved', label: 'Resolved', value: resolvedCount, records: myTickets.filter(t => { const s = t.getCellValueAsString('Status'); return s === 'Resolved' || s === 'Closed'; }) },
  ];

  return (
    <main className="flex-1 min-h-0 bg-[#F5F7F7] overflow-auto" tabIndex={0}>
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Brand header band */}
        <div className="bg-core_palette-primary-3 text-white px-5 py-4 mb-4">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-core_palette-primary-2 mb-0.5">My Work</p>
          <h1 className="text-[1.375rem] font-serif font-normal leading-tight">Welcome back, {firstName}</h1>
          <p className="text-[0.8125rem] text-white/60 mt-1">
            {currentUser.email}
            {currentUser.department ? ` · ${currentUser.department}` : ''}
            {isImpersonating ? ' · viewing as this person' : ''}
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map(stat => {
            const provenance = trackAirtableAggregate({
              value: stat.value,
              records: stat.records,
              table: ticketsTable,
              fields: ['Status', 'Assigned Technician', 'Requester Name'],
              label: `${stat.label} (mine)`,
              transform: { type: 'count', description: `Count of my tickets: ${stat.label}` },
            });
            return (
              <div key={stat.key} className="bg-white border border-[rgba(202,209,211,0.3)] px-4 py-3">
                <DataValue provenance={provenance} className="block text-[1.75rem] font-mono font-semibold text-semantic-text leading-none">
                  {stat.value}
                </DataValue>
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(67,82,84,0.6)] mt-1.5">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Two lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TicketSection
            title="Assigned to me"
            icon={<AssignmentIndIcon size={16} className="text-core_palette-primary-1" />}
            tickets={assigned}
            serviceLevels={serviceLevels}
            emptyText="No tickets are assigned to you right now."
            secondaryField="requester"
            onSelectTicket={onSelectTicket}
          />
          <TicketSection
            title="Raised by me"
            icon={<SendIcon size={16} className="text-core_palette-primary-1" />}
            tickets={raised}
            serviceLevels={serviceLevels}
            emptyText="You haven't raised any tickets yet."
            secondaryField="assignee"
            onSelectTicket={onSelectTicket}
          />
        </div>
      </div>
    </main>
  );
}

function TicketSection({
  title, icon, tickets, serviceLevels, emptyText, secondaryField, onSelectTicket,
}: {
  title: string;
  icon: React.ReactNode;
  tickets: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  emptyText: string;
  secondaryField: 'requester' | 'assignee';
  onSelectTicket: (record: AirtableRecord) => void;
}) {
  const sorted = useMemo(() =>
    [...tickets].sort((a, b) => {
      const da = new Date(a.getCellValueAsString('Created Date')).getTime() || 0;
      const db = new Date(b.getCellValueAsString('Created Date')).getTime() || 0;
      return db - da;
    }),
    [tickets]
  );

  return (
    <section className="bg-white border border-[rgba(202,209,211,0.3)] flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(202,209,211,0.3)]">
        {icon}
        <h2 className="text-[0.8125rem] font-semibold text-semantic-text">{title}</h2>
        <span className="ml-auto inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-mono bg-[#F2F4F8] text-[#666666]">
          {sorted.length}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <InfoOutlinedIcon size={22} className="text-[rgba(202,209,211,0.7)] mb-2" />
          <p className="text-[0.8125rem] text-[#666666]">{emptyText}</p>
        </div>
      ) : (
        <ul className="divide-y divide-[rgba(202,209,211,0.3)]">
          {sorted.map(ticket => (
            <MyTicketRow
              key={ticket.id}
              ticket={ticket}
              serviceLevels={serviceLevels}
              secondaryField={secondaryField}
              onSelect={() => onSelectTicket(ticket)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MyTicketRow({
  ticket, serviceLevels, secondaryField, onSelect,
}: {
  ticket: AirtableRecord;
  serviceLevels: ServiceLevel[];
  secondaryField: 'requester' | 'assignee';
  onSelect: () => void;
}) {
  const titleAttrs = useInspectAttrs(ticket, 'Title');
  const statusAttrs = useInspectAttrs(ticket, 'Status');

  const title = ticket.getCellValueAsString('Title');
  const status = ticket.getCellValueAsString('Status');
  const priority = ticket.getCellValueAsString('Service Levels');
  const createdDate = ticket.getCellValueAsString('Created Date');
  const secondary = secondaryField === 'requester'
    ? ticket.getCellValueAsString('Requester Name')
    : ticket.getCellValueAsString('Assigned Technician');

  const sl = serviceLevels.find(s => s.name === priority) || null;
  const sla = calculateSLA(createdDate, sl, status);

  const statusColor = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS['Open'];
  const priorityColor = PRIORITY_COLORS[priority] || { bg: '#F2F4F8', text: '#41454D' };

  return (
    <li>
      <button
        onClick={onSelect}
        className="w-full text-left px-4 py-2.5 hover:bg-[#F5F7F7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-core_palette-primary-1 focus-visible:ring-inset"
      >
        <div className="flex items-start justify-between gap-3">
          <span {...titleAttrs} className="text-[0.8125rem] font-medium text-semantic-text leading-snug line-clamp-2 flex-1">
            {title}
          </span>
          <span {...statusAttrs} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.6875rem] font-medium flex-shrink-0" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor.dot }} />
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {priority && (
            <span className="inline-block px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.05em]" style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}>
              {priority}
            </span>
          )}
          <SLAIndicator sla={sla} compact />
          {secondary && (
            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-[#666666]">
              <PersonIcon size={11} className="text-[rgba(67,82,84,0.5)]" />
              {secondary}
            </span>
          )}
          {createdDate && (
            <span className="ml-auto text-[0.625rem] text-[#999999]">{formatDate(createdDate)}</span>
          )}
        </div>
      </button>
    </li>
  );
}
