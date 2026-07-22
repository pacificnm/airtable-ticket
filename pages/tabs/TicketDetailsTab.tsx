import React from 'react';
import {
  AirtableRecord,
  Table,
  useUpdateRecord,
} from '../../lib/airtable-hooks';
import { ServiceLevel, Technician } from '../../types';
import { calculateSLA, formatDateTime } from '../../utils';
import { SLAIndicator } from '../../components/SLAIndicator';
import { ExternalTicketsSection } from '../../components/ExternalTickets';
import { useSnackbar } from '../../components/SnackbarProvider';
import { useLogHistory, useSendNotification } from '../../hooks/useEventBus';
import { AttachFileIcon, CheckCircleIcon } from '../../components/Icons';
import { RoleGuard, useHasPermission } from '../../components/RoleGuard';
import { TicketStatus } from '../../types';

export interface TicketDetailsTabProps {
  ticket: AirtableRecord;
  ticketsTable: Table;
  ticketTitle: string;
  descAttrs: Record<string, any>;
  description: string;
  requesterName: string;
  requesterEmail: string;
  assignee: string;
  assignedTechId: string;
  createdDate: string;
  priority: string;
  sl: ServiceLevel | null;
  sla: ReturnType<typeof calculateSLA>;
  screenshots: any[];
  uploadingFile: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setLightboxUrl: (url: string | null) => void;
  allExternalTickets: AirtableRecord[];
  allGroups: AirtableRecord[];
  externalTicketsTable: Table;
  technicians: Technician[];
  onRefresh: () => void;
}

export function TicketDetailsTab({
  ticket,
  ticketsTable,
  ticketTitle,
  descAttrs,
  description,
  requesterName,
  requesterEmail,
  assignee,
  assignedTechId,
  createdDate,
  priority,
  sl,
  sla,
  screenshots,
  uploadingFile,
  handleFileUpload,
  setLightboxUrl,
  allExternalTickets,
  allGroups,
  externalTicketsTable,
  technicians,
  onRefresh,
}: TicketDetailsTabProps) {
  const { mutate: updateTicket } = useUpdateRecord(ticketsTable);
  const { showSnackbar } = useSnackbar();
  const logHistory = useLogHistory();
  const sendNotification = useSendNotification();

  const canAssign = useHasPermission('tickets.assign');
  const activeTechnicians = technicians.filter(t => t.active);

  const handleReassign = async (newTechId: string) => {
    if (newTechId === assignedTechId) return;
    const newTechName = activeTechnicians.find(t => t.id === newTechId)?.name || 'Unassigned';
    const action = assignee ? 'Reassigned' : 'Assigned';
    try {
      await updateTicket({
        recordId: ticket.id,
        fields: {
          'Assigned Technician': newTechId ? [newTechId] : [],
          'Last Modified': new Date().toISOString(),
        },
      });
    } catch {
      showSnackbar('Failed to reassign technician', 'error');
      return;
    }
    showSnackbar(`Reassigned to ${newTechName}`);
    await logHistory(
      ticket.id,
      assignee ? `Reassigned from ${assignee} to ${newTechName}` : `Assigned to ${newTechName}`,
      action,
      assignee || 'Unassigned',
      newTechName,
    );
    if (newTechId) {
      await sendNotification(
        newTechId,
        `Ticket assigned to you: ${ticketTitle}`,
        `You have been assigned to ticket "${ticketTitle}".${assignee ? ` Previously assigned to ${assignee}.` : ''}`,
      );
    }
    onRefresh();
  };

  return (
    <div className="px-5 py-4">
      <div className="mb-5">
        <SLAIndicator sla={sla} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Requester</span>
          <p className="text-[0.875rem] text-semantic-text">{requesterName || '-'}</p>
          {requesterEmail && <p className="text-[0.75rem] text-[#666666]">{requesterEmail}</p>}
        </div>
        <div>
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Assigned To</span>
          {canAssign ? (
            <select
              value={assignedTechId || ''}
              onChange={(e: any) => handleReassign(e.target.value)}
              aria-label="Assign technician"
              className="w-full text-[0.875rem] font-medium text-core_palette-primary-1 border border-[rgba(202,209,211,0.3)] bg-white py-1.5 px-2 focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            >
              <option value="" className="text-[#999999] text-[0.8125rem]">Unassigned</option>
              {activeTechnicians.map(t => (
                <option key={t.id} value={t.id} className="text-[0.8125rem]">{t.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-[0.875rem] text-semantic-text">{assignee || 'Unassigned'}</p>
          )}
        </div>
        <div>
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Created</span>
          <p className="text-[0.75rem] text-semantic-text">{formatDateTime(createdDate)}</p>
        </div>
        <div>
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Service Level</span>
          <p className="text-[0.875rem] text-semantic-text">{priority || '-'}</p>
          {sl && <p className="text-[0.6875rem] text-[rgba(67,82,84,0.5)]">Resolve in {sl.resolutionHours}h / Respond in {sl.responseHours}h</p>}
        </div>
      </div>

      {description && (
        <div className="mb-5">
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1.5">Description</span>
          <p {...descAttrs} className="text-[0.875rem] text-semantic-text leading-relaxed whitespace-pre-wrap bg-[#F5F7F7] p-3 border border-[rgba(202,209,211,0.15)]">
            {description}
          </p>
        </div>
      )}

      <ResolutionSection ticket={ticket} />

      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">Screenshots</span>
          <RoleGuard permission="tickets.edit">
            <label className={`inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 cursor-pointer hover:opacity-80 ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <AttachFileIcon size={14} />
              {uploadingFile ? 'Uploading...' : 'Attach'}
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
            </label>
          </RoleGuard>
        </div>
        {screenshots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {screenshots.map((s: any, i: number) => (
              <button
                key={i}
                onClick={() => setLightboxUrl(s.url || s.thumbnails?.large?.url)}
                className="aspect-square bg-[#F2F4F8] overflow-hidden border border-[rgba(202,209,211,0.3)] cursor-pointer p-0 hover:border-core_palette-primary-1 transition-colors"
                aria-label={`View screenshot ${i + 1}`}
              >
                <img
                  src={s.thumbnails?.large?.url || s.url}
                  alt={s.filename || `Screenshot ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[rgba(202,209,211,0.3)] py-6 text-center">
            <p className="text-[0.75rem] text-[rgba(67,82,84,0.5)]">No screenshots attached</p>
          </div>
        )}
      </div>

      <ExternalTicketsSection
        ticket={ticket}
        allExternalTickets={allExternalTickets}
        allGroups={allGroups}
        externalTicketsTable={externalTicketsTable}
        onRefresh={onRefresh}
      />
    </div>
  );
}

function ResolutionSection({ ticket }: { ticket: AirtableRecord }) {
  const status = ticket.getCellValueAsString('Status') as TicketStatus;
  const resolutionNote = ticket.getCellValueAsString('Resolution Note');
  const resolvedByCategory = ticket.getCellValueAsString('Resolved By Category');
  const dateClosed = ticket.getCellValueAsString('Date Closed');

  if (status !== 'Resolved' && status !== 'Closed') return null;
  if (!resolutionNote && !resolvedByCategory && !dateClosed) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <CheckCircleIcon size={14} className="text-[#17E88F]" />
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">Resolution</span>
      </div>
      <div className="bg-[rgba(23,232,143,0.06)] border border-[rgba(23,232,143,0.2)] p-3">
        {resolutionNote && (
          <p className="text-[0.875rem] text-semantic-text leading-relaxed whitespace-pre-wrap mb-2">
            {resolutionNote}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-[#666666]">
          {resolvedByCategory && (
            <span>Resolved by <strong className="text-semantic-text">{resolvedByCategory}</strong></span>
          )}
          {dateClosed && (
            <span>{formatDateTime(dateClosed)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
