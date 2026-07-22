import React, { useState } from 'react';
import {
  AirtableRecord,
  Table,
  useCreateRecord,
  useUpdateRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { formatDate } from '../utils';
import { useSnackbar } from './SnackbarProvider';
import { useLogHistory } from '../hooks/useEventBus';
import { EditIcon, OpenInNewIcon, LinkIcon } from './Icons';
import { RoleGuard } from './RoleGuard';

const EXT_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'New': { bg: '#EBF5FF', text: '#0D52AC', dot: '#166EE1' },
  'In Progress': { bg: '#FFF8E1', text: '#AF6002', dot: '#FFBA05' },
  'On Hold': { bg: '#F3E8FF', text: '#6231AE', dot: '#7C37EF' },
  'Resolved': { bg: '#E6FCE8', text: '#006400', dot: '#048A0E' },
  'Closed': { bg: '#F2F4F8', text: '#41454D', dot: '#616670' },
};

interface ExternalTicketsSectionProps {
  ticket: AirtableRecord;
  allExternalTickets: AirtableRecord[];
  allGroups: AirtableRecord[];
  externalTicketsTable: Table;
  onRefresh: () => void;
}

export function ExternalTicketsSection({
  ticket,
  allExternalTickets,
  allGroups,
  externalTicketsTable,
  onRefresh,
}: ExternalTicketsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const linkedExtIds = getLinkedRecordIds(ticket.fields['External Tickets']);
  const ticketExtTickets = allExternalTickets.filter(et => linkedExtIds.includes(et.id));

  const activeGroups = allGroups.filter(g => !!g.getCellValue('Active'));

  const handleCreated = () => {
    setShowForm(false);
    setEditingId(null);
    onRefresh();
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
          External Tickets
          {ticketExtTickets.length > 0 && (
            <span className="inline-block ml-2 px-1 h-[18px] text-[0.625rem] font-mono bg-[#F2F4F8] text-[#666666] leading-[18px]">
              {ticketExtTickets.length}
            </span>
          )}
        </span>
        <RoleGuard permission="tickets.external">
          <button
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 hover:opacity-80"
          >
            <LinkIcon size={14} />
            Link External
          </button>
        </RoleGuard>
      </div>

      {showForm && (
        <ExternalTicketForm
          ticketId={ticket.id}
          externalTicketsTable={externalTicketsTable}
          groups={activeGroups}
          editingRecord={editingId ? allExternalTickets.find(e => e.id === editingId) || null : null}
          onDone={handleCreated}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
        />
      )}

      {ticketExtTickets.length > 0 ? (
        <div className="flex flex-col gap-2">
          {ticketExtTickets.map(et => (
            <ExternalTicketCard
              key={et.id}
              extTicket={et}
              onEdit={() => { setEditingId(et.id); setShowForm(true); }}
            />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="border border-dashed border-[rgba(202,209,211,0.3)] py-4 text-center">
            <p className="text-[0.75rem] text-[rgba(67,82,84,0.5)]">No external tickets linked</p>
          </div>
        )
      )}
    </div>
  );
}

function ExternalTicketCard({ extTicket, onEdit }: { extTicket: AirtableRecord; onEdit: () => void }) {
  const refAttrs = useInspectAttrs(extTicket, 'Ticket Reference');
  const statusAttrs = useInspectAttrs(extTicket, 'Status');

  const reference = extTicket.getCellValueAsString('Ticket Reference');
  const link = extTicket.getCellValueAsString('Ticket Link');
  const status = extTicket.getCellValueAsString('Status');
  const dateOpened = extTicket.getCellValueAsString('Date Opened');
  const estResolution = extTicket.getCellValueAsString('Estimated Resolution Date');
  const note = extTicket.getCellValueAsString('Ticket Note');
  const group = extTicket.getCellValueAsString('Ticket Group');

  const statusColor = EXT_STATUS_COLORS[status] || EXT_STATUS_COLORS['New'];

  return (
    <div className="bg-[#F5F7F7] p-3 group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block px-1.5 py-0.5 text-[0.625rem] font-medium bg-[rgba(3,40,66,0.1)] text-[#032842] flex-shrink-0">
            {group || 'Unknown'}
          </span>
          {link ? (
            <a
              {...refAttrs}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono font-medium text-core_palette-primary-1 hover:underline truncate"
              onClick={(e: any) => e.stopPropagation()}
            >
              {reference}
              <OpenInNewIcon size={12} />
            </a>
          ) : (
            <span {...refAttrs} className="font-mono font-medium text-semantic-text truncate">{reference}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            {...statusAttrs}
            className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.625rem] font-medium"
            style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
          >
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
            {status}
          </span>
          <RoleGuard permission="tickets.external">
            <button
              onClick={onEdit}
              aria-label={`Edit ${reference}`}
              className="p-0.5 text-[rgba(67,82,84,0.5)] hover:text-core_palette-primary-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <EditIcon size={14} />
            </button>
          </RoleGuard>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-1">
        {dateOpened && <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">Opened {formatDate(dateOpened)}</span>}
        {estResolution && (
          <>
            <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">•</span>
            <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">Est. resolution {formatDate(estResolution)}</span>
          </>
        )}
      </div>

      {note && (
        <p className="text-[0.875rem] text-[#666666] leading-normal mt-1 line-clamp-2">{note}</p>
      )}
    </div>
  );
}

function ExternalTicketForm({
  ticketId,
  externalTicketsTable,
  groups,
  editingRecord,
  onDone,
  onCancel,
}: {
  ticketId: string;
  externalTicketsTable: Table;
  groups: AirtableRecord[];
  editingRecord: AirtableRecord | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = !!editingRecord;

  const [reference, setReference] = useState(editingRecord?.getCellValueAsString('Ticket Reference') || '');
  const [link, setLink] = useState(editingRecord?.getCellValueAsString('Ticket Link') || '');
  const [status, setStatus] = useState(editingRecord?.getCellValueAsString('Status') || 'New');
  const [dateOpened, setDateOpened] = useState(editingRecord?.getCellValueAsString('Date Opened') || new Date().toISOString().split('T')[0]);
  const [estResolution, setEstResolution] = useState(editingRecord?.getCellValueAsString('Estimated Resolution Date') || '');
  const [note, setNote] = useState(editingRecord?.getCellValueAsString('Ticket Note') || '');
  const [groupId, setGroupId] = useState(() => {
    if (!editingRecord) return groups.length > 0 ? groups[0].id : '';
    const groupVal = (editingRecord.getCellValue('Ticket Group') as any[]) || [];
    return groupVal[0]?.id || '';
  });
  const [submitting, setSubmitting] = useState(false);

  const { mutate: createExtTicket } = useCreateRecord(externalTicketsTable);
  const { mutate: updateExtTicket } = useUpdateRecord(externalTicketsTable);
  const { showSnackbar } = useSnackbar();
  const logHistory = useLogHistory();

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!reference.trim()) return;

    setSubmitting(true);
    try {
      const fields: any = {
        'Ticket Reference': reference,
        'Ticket Link': link || null,
        'Status': status,
        'Date Opened': dateOpened || null,
        'Estimated Resolution Date': estResolution || null,
        'Ticket Note': note,
      };

      if (groupId) {
        fields['Ticket Group'] = [groupId];
      }

      if (isEdit) {
        await updateExtTicket({ recordId: editingRecord!.id, fields });
        showSnackbar(`External ticket "${reference}" updated`);
      } else {
        fields['Ticket'] = [ticketId];
        await createExtTicket(fields);
        const groupName = groupId ? groups.find(g => g.id === groupId)?.getCellValueAsString('Name') || '' : '';
        await logHistory(
          ticketId,
          `External ticket "${reference}" linked`,
          'External Ticket Linked',
          undefined,
          reference,
          `Group: ${groupName || 'N/A'} | Status: ${status}`,
        );
        showSnackbar(`External ticket "${reference}" linked`);
      }

      onDone();
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to save external ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 p-3 bg-[#F5F7F7]">
      <p className="text-[0.75rem] font-semibold text-semantic-text mb-2">
        {isEdit ? 'Edit External Ticket' : 'Link External Ticket'}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-[0.6875rem] text-[rgba(67,82,84,0.5)] mb-0.5">Reference</label>
          <input
            type="text"
            value={reference}
            onChange={(e: any) => setReference(e.target.value)}
            placeholder="e.g. NIKE-INC0012345"
            required
            className="w-full px-2 py-1.5 text-[0.75rem] font-mono border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          />
        </div>
        <div>
          <label className="block text-[0.6875rem] text-[rgba(67,82,84,0.5)] mb-0.5">Group</label>
          <select
            value={groupId}
            onChange={(e: any) => setGroupId(e.target.value)}
            className="w-full px-2 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          >
            <option value="">Select group</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.getCellValueAsString('Name')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-2">
        <label className="block text-[0.6875rem] text-[rgba(67,82,84,0.5)] mb-0.5">ServiceNow Link</label>
        <input
          type="url"
          value={link}
          onChange={(e: any) => setLink(e.target.value)}
          placeholder="https://..."
          className="w-full px-2 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <label className="block text-[0.6875rem] text-[rgba(67,82,84,0.5)] mb-0.5">Status</label>
          <select
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            className="w-full px-2 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          >
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-[0.6875rem] text-[rgba(67,82,84,0.5)] mb-0.5">Date Opened</label>
          <input
            type="date"
            value={dateOpened}
            onChange={(e: any) => setDateOpened(e.target.value)}
            className="w-full px-2 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          />
        </div>
        <div>
          <label className="block text-[0.6875rem] text-[rgba(67,82,84,0.5)] mb-0.5">Est. Resolution</label>
          <input
            type="date"
            value={estResolution}
            onChange={(e: any) => setEstResolution(e.target.value)}
            className="w-full px-2 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          />
        </div>
      </div>

      <div className="mb-2">
        <label className="block text-[0.6875rem] text-[rgba(67,82,84,0.5)] mb-0.5">Notes</label>
        <textarea
          value={note}
          onChange={(e: any) => setNote(e.target.value)}
          placeholder="Additional context..."
          rows={2}
          className="w-full px-2 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] bg-white resize-none focus:outline-none focus:border-core_palette-primary-1 transition-colors"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[0.75rem] text-[#666666] hover:text-semantic-text transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!reference.trim() || submitting}
          className="px-3 py-1.5 text-[0.75rem] text-white bg-core_palette-primary-1 hover:bg-[#004D37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Saving...' : isEdit ? 'Save' : 'Link Ticket'}
        </button>
      </div>
    </form>
  );
}
