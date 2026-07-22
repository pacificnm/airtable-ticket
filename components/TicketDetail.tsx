import React, { useState, useRef, useEffect } from 'react';
import {
  AirtableRecord,
  Table,
  useUpdateRecord,
  useCreateRecord,
  useUploadAttachment,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import {
  STATUS_COLORS,
  PRIORITY_COLORS,
  TYPE_COLORS,
  STATUS_ORDER,
  ServiceLevel,
  Technician,
  Category,
  NoteSource,
  TicketStatus,
} from '../types';
import { calculateSLA } from '../utils';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useLogHistory, useSendNotification } from '../hooks/useEventBus';
import { useSnackbar } from './SnackbarProvider';
import { TicketDetailsTab } from './TicketDetailsTab';
import { TicketNotesTab } from './TicketNotesTab';
import { TicketDevicesTab } from './TicketDevicesTab';
import { TicketSoftwareTab } from './TicketSoftwareTab';
import { TicketDocumentsTab } from './TicketDocumentsTab';
import { TicketHistoryTab } from './TicketHistoryTab';
import { TicketTasksTab } from './TicketTasksTab';
import { TicketDashboardsTab } from './TicketDashboardsTab';
import { CloseIcon, ConfirmationNumberIcon, ExpandMoreIcon } from './Icons';
import { useHasPermission } from './RoleGuard';

type DetailTab = 'details' | 'notes' | 'tasks' | 'devices' | 'software' | 'dashboards' | 'docs' | 'history';

interface TicketDetailProps {
  ticket: AirtableRecord;
  ticketsTable: Table;
  notesTable: Table;
  externalTicketsTable: Table;
  allNotes: AirtableRecord[];
  allExternalTickets: AirtableRecord[];
  allGroups: AirtableRecord[];
  allHistory: AirtableRecord[];
  allDocuments: AirtableRecord[];
  allDevices: AirtableRecord[];
  allSoftware: AirtableRecord[];
  allTasks: AirtableRecord[];
  allDashboards: AirtableRecord[];
  tasksTable: Table;
  serviceLevels: ServiceLevel[];
  technicians: Technician[];
  categories: Category[];
  onClose: () => void;
  onRefresh: () => void;
}

export function TicketDetail({
  ticket,
  ticketsTable,
  notesTable,
  externalTicketsTable,
  allNotes,
  allExternalTickets,
  allGroups,
  allHistory,
  allDocuments,
  allDevices,
  allSoftware,
  allTasks,
  allDashboards,
  tasksTable,
  serviceLevels,
  technicians,
  categories,
  onClose,
  onRefresh,
}: TicketDetailProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolvedByCategory, setResolvedByCategory] = useState('');
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { mutate: updateTicket } = useUpdateRecord(ticketsTable);
  const { mutate: createNote } = useCreateRecord(notesTable);
  const { mutate: uploadAttachment } = useUploadAttachment(ticketsTable);
  const { showSnackbar } = useSnackbar();
  const { currentUser } = useCurrentUser();
  const canChangeStatus = useHasPermission('tickets.status');
  const logHistory = useLogHistory();
  const sendNotification = useSendNotification();

  const titleAttrs = useInspectAttrs(ticket, 'Title');
  const descAttrs = useInspectAttrs(ticket, 'Description');
  const statusAttrs = useInspectAttrs(ticket, 'Status');

  const title = ticket.getCellValueAsString('Title');
  const description = ticket.getCellValueAsString('Description');
  const status = ticket.getCellValueAsString('Status') as TicketStatus;
  const type = ticket.getCellValueAsString('Request Type (from Subcategory)');
  const assignee = ticket.getCellValueAsString('Assigned Technician');
  const assignedTechIds = getLinkedRecordIds((ticket as any).fields?.['Assigned Technician']);
  const requesterName = ticket.getCellValueAsString('Requester Name');
  const requesterEmail = ticket.getCellValueAsString('Requester Email');
  const createdDate = ticket.getCellValueAsString('Created Date');
  const priority = ticket.getCellValueAsString('Service Levels');
  const category = ticket.getCellValueAsString('Category');
  const screenshots = (ticket.getCellValue('Screenshots') as any[]) || [];

  const ticketNoteIds = getLinkedRecordIds(ticket.fields['Notes']);
  const ticketNotes = allNotes
    .filter(n => ticketNoteIds.includes(n.id))
    .sort((a, b) => {
      const da = new Date(a.getCellValueAsString('Created')).getTime() || 0;
      const db = new Date(b.getCellValueAsString('Created')).getTime() || 0;
      return db - da;
    });

  const ticketHistoryIds = getLinkedRecordIds(ticket.fields['Ticket History']);
  const ticketHistory = allHistory
    .filter(h => ticketHistoryIds.includes(h.id))
    .sort((a, b) => {
      const da = new Date(a.getCellValueAsString('Created')).getTime() || 0;
      const db = new Date(b.getCellValueAsString('Created')).getTime() || 0;
      return db - da;
    });

  const ticketSubcategoryIds = getLinkedRecordIds(ticket.fields['Subcategory']);
  const ticketDocuments = allDocuments.filter(doc => {
    const docSubcatIds = getLinkedRecordIds(doc.fields['Subcategory']);
    return docSubcatIds.some(cId => ticketSubcategoryIds.includes(cId));
  });

  const ticketDeviceIds = getLinkedRecordIds(ticket.fields['Devices']);
  const ticketDevices = allDevices.filter(d => ticketDeviceIds.includes(d.id));

  const ticketSoftwareIds = getLinkedRecordIds(ticket.fields['Software']);
  const ticketSoftware = allSoftware.filter(s => ticketSoftwareIds.includes(s.id));

  const ticketTaskIds = getLinkedRecordIds(ticket.fields['Tasks']);
  const ticketTasks = allTasks.filter(t => ticketTaskIds.includes(t.id));

  const ticketDashboardIds = getLinkedRecordIds(ticket.fields['Dashboards']);
  const ticketDashboards = allDashboards.filter(d => ticketDashboardIds.includes(d.id));

  const sl = serviceLevels.find(s => s.name === priority) || null;
  const sla = calculateSLA(createdDate, sl, status);

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS['Open'];
  const priorityColor = PRIORITY_COLORS[priority] || { bg: '#F2F4F8', text: '#41454D' };

  useEffect(() => {
    if (!showStatusMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && statusBtnRef.current && !statusBtnRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusMenu]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'Resolved') {
      setShowStatusMenu(false);
      setResolutionNote('');
      setResolvedByCategory('');
      setShowResolveModal(true);
      return;
    }
    try {
      await updateTicket({ recordId: ticket.id, fields: { Status: newStatus, 'Last Modified': new Date().toISOString() } });
      await logHistory(ticket.id, `Status changed to ${newStatus}`, 'Status Changed', status, newStatus);
      const assignedId = assignedTechIds[0];
      if (assignedId && assignedId !== currentUser?.technicianId) {
        sendNotification(assignedId, `Ticket status changed: ${title}`, `The status of "${title}" has been changed from "${status}" to "${newStatus}".`);
      }
      setShowStatusMenu(false);
      showSnackbar(`Status updated to "${newStatus}"`);
      onRefresh();
    } catch {
      showSnackbar('Failed to update status', 'error');
      setShowStatusMenu(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNote.trim() || !resolvedByCategory) return;
    try {
      await updateTicket({
        recordId: ticket.id,
        fields: {
          Status: 'Resolved',
          'Resolution Note': resolutionNote.trim(),
          'Resolved By Category': resolvedByCategory,
          'Date Closed': new Date().toISOString(),
          'Last Modified': new Date().toISOString(),
        },
      });
      await logHistory(ticket.id, 'Ticket resolved', 'Status Changed', status, 'Resolved', `${resolvedByCategory}: ${resolutionNote.trim()}`);
      const assignedId = assignedTechIds[0];
      if (assignedId && assignedId !== currentUser?.technicianId) {
        sendNotification(assignedId, `Ticket resolved: ${title}`, `"${title}" has been resolved by ${resolvedByCategory}.\n\nResolution: ${resolutionNote.trim()}`);
      }
      setShowResolveModal(false);
      setResolutionNote('');
      setResolvedByCategory('');
      showSnackbar('Ticket resolved');
      onRefresh();
    } catch {
      showSnackbar('Failed to resolve ticket', 'error');
    }
  };

  const handleFileUpload = async (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadAttachment({ recordId: ticket.id, fieldIdOrName: 'Screenshots', file: files[i] });
      }
      const fileNames = Array.from(files as FileList).map((f: File) => f.name).join(', ');
      await updateTicket({ recordId: ticket.id, fields: { 'Last Modified': new Date().toISOString() } });
      await logHistory(ticket.id, `${files.length} screenshot${files.length > 1 ? 's' : ''} uploaded`, 'Screenshot Uploaded', undefined, fileNames);
      showSnackbar(`${files.length} screenshot${files.length > 1 ? 's' : ''} uploaded`);
      onRefresh();
    } catch {
      showSnackbar('Failed to upload screenshot', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddNote = async (noteTitle: string, content: string, source: NoteSource, isPrivate: boolean) => {
    try {
      await createNote({
        'Note': content,
        'Source': source,
        'Ticket': [ticket.id],
        'Private': isPrivate,
      });
      await updateTicket({ recordId: ticket.id, fields: { 'Last Modified': new Date().toISOString() } });
      await logHistory(ticket.id, `Note added: ${noteTitle}`, 'Note Added', undefined, noteTitle, `Source: ${source}${isPrivate ? ' (Private)' : ''}`);
      setShowNoteForm(false);
      showSnackbar('Note added');
      onRefresh();
    } catch {
      showSnackbar('Failed to add note', 'error');
    }
  };

  const canViewTasks = useHasPermission('tickets.tasks.view');

  const TAB_CONFIG: { value: DetailTab; label: string }[] = [
    { value: 'details', label: 'Details' },
    { value: 'notes', label: 'Notes / Messages' },
    ...(canViewTasks ? [{ value: 'tasks' as DetailTab, label: 'Tasks' }] : []),
    { value: 'devices', label: 'Devices' },
    { value: 'software', label: 'Software' },
    { value: 'dashboards', label: 'Dashboards' },
    { value: 'docs', label: 'Docs' },
    { value: 'history', label: 'History' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative z-50 w-full sm:w-[680px] h-full bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <ConfirmationNumberIcon size={16} className="text-core_palette-primary-2" />
            <span className="text-[0.8125rem] font-semibold font-sans">Ticket Details</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[rgba(202,209,211,0.3)] bg-white flex-shrink-0">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 {...titleAttrs} className="text-[0.9375rem] font-semibold text-semantic-text leading-snug">
                {title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {priority && (
                  <span className="inline-block px-1 py-0.5 h-[20px] text-[0.625rem] font-semibold uppercase tracking-[0.05em]" style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}>
                    {priority}
                  </span>
                )}
                {type && TYPE_COLORS[type] && (
                  <span className="inline-block px-1 py-0.5 h-[20px] text-[0.625rem] font-medium" style={{ backgroundColor: TYPE_COLORS[type].bg, color: TYPE_COLORS[type].text }}>
                    {type}
                  </span>
                )}
                {category && (
                  <span className="inline-block px-1 py-0.5 h-[20px] text-[0.625rem] font-medium bg-[#E6EAEA] text-semantic-text">
                    {category}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 relative">
              <button
                ref={statusBtnRef}
                {...statusAttrs}
                onClick={canChangeStatus ? () => setShowStatusMenu(!showStatusMenu) : undefined}
                disabled={!canChangeStatus}
                className={`flex items-center gap-1 px-2 py-0.5 h-[26px] text-[0.75rem] font-medium ${canChangeStatus ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor.dot }} />
                {status}
                {canChangeStatus && <ExpandMoreIcon size={16} />}
              </button>
              {showStatusMenu && canChangeStatus && (
                <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-white border border-[rgba(202,209,211,0.3)] shadow-lg z-50 min-w-[160px]">
                  {STATUS_ORDER.map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`flex items-center gap-2 w-full px-3 py-2 text-[0.875rem] text-left hover:bg-[#F5F7F7] transition-colors ${s === status ? 'bg-[#F5F7F7] font-medium' : ''}`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s].dot }} />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex border-b border-[rgba(202,209,211,0.3)] overflow-x-auto -mb-[1px]">
            {TAB_CONFIG.map(t => (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`relative px-2 py-1.5 text-[0.6875rem] font-medium whitespace-nowrap transition-colors ${
                  activeTab === t.value
                    ? 'text-core_palette-primary-1'
                    : 'text-[#666666] hover:text-semantic-text'
                }`}
              >
                {t.label}
                {activeTab === t.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-core_palette-primary-1" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === 'details' && (
            <TicketDetailsTab
              ticket={ticket}
              ticketsTable={ticketsTable}
              ticketTitle={title}
              descAttrs={descAttrs}
              description={description}
              requesterName={requesterName}
              requesterEmail={requesterEmail}
              assignee={assignee}
              assignedTechId={assignedTechIds[0] || ''}
              createdDate={createdDate}
              priority={priority}
              sl={sl}
              sla={sla}
              screenshots={screenshots}
              uploadingFile={uploadingFile}
              handleFileUpload={handleFileUpload}
              setLightboxUrl={setLightboxUrl}
              allExternalTickets={allExternalTickets}
              allGroups={allGroups}
              externalTicketsTable={externalTicketsTable}
              technicians={technicians}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'notes' && (
            <TicketNotesTab
              ticketNotes={ticketNotes}
              showNoteForm={showNoteForm}
              setShowNoteForm={setShowNoteForm}
              handleAddNote={handleAddNote}
            />
          )}
          {activeTab === 'tasks' && (
            <TicketTasksTab
              tasks={ticketTasks}
              tasksTable={tasksTable}
              ticketId={ticket.id}
              technicians={technicians}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'devices' && (
            <TicketDevicesTab
              devices={ticketDevices}
              allDevices={allDevices}
              ticket={ticket}
              ticketsTable={ticketsTable}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'software' && (
            <TicketSoftwareTab
              software={ticketSoftware}
              allSoftware={allSoftware}
              ticket={ticket}
              ticketsTable={ticketsTable}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'dashboards' && (
            <TicketDashboardsTab
              dashboards={ticketDashboards}
              allDashboards={allDashboards}
              ticket={ticket}
              ticketsTable={ticketsTable}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === 'docs' && <TicketDocumentsTab documents={ticketDocuments} category={category} />}
          {activeTab === 'history' && <TicketHistoryTab historyRecords={ticketHistory} />}
        </div>

        {lightboxUrl && (
          <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
            <button
              onClick={() => setLightboxUrl(null)}
              aria-label="Close lightbox"
              className="fixed top-4 right-4 text-white p-2 z-[61] hover:opacity-80"
            >
              <CloseIcon size={24} />
            </button>
            <img
              src={lightboxUrl}
              alt="Screenshot preview"
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e: any) => e.stopPropagation()}
            />
          </div>
        )}

        {showResolveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowResolveModal(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative bg-white w-full max-w-[460px] mx-4 shadow-xl"
              onClick={(e: any) => e.stopPropagation()}
            >
              <div className="px-4 py-2.5 flex items-center justify-between bg-core_palette-primary-3 text-white">
                <span className="text-[0.8125rem] font-semibold font-sans">Resolve Ticket</span>
                <button onClick={() => setShowResolveModal(false)} className="text-white/60 hover:text-white" aria-label="Close">
                  <CloseIcon size={18} />
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-[0.8125rem] text-[#666666] mb-3">
                  Please describe how this issue was resolved before closing.
                </p>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">
                  Resolved By <span className="text-semantic-error">*</span>
                </label>
                <select
                  value={resolvedByCategory}
                  onChange={(e: any) => setResolvedByCategory(e.target.value)}
                  className="w-full px-3 py-2 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white mb-3"
                >
                  <option value="">Select who resolved...</option>
                  <option value="CBRE Account">CBRE Account</option>
                  <option value="CBRE Platform">CBRE Platform</option>
                  <option value="Nike Tech">Nike Tech</option>
                  <option value="Vendor">Vendor</option>
                  <option value="Other - See Resolution">Other - See Resolution</option>
                </select>
                <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">
                  Resolution Note <span className="text-semantic-error">*</span>
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e: any) => setResolutionNote(e.target.value)}
                  rows={4}
                  placeholder="Describe the resolution..."
                  className="w-full px-3 py-2 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors resize-none"
                />
                <div className="flex items-center gap-2 mt-1.5 mb-4 text-[0.75rem] text-[#666666]">
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowResolveModal(false)}
                    className="px-4 py-1.5 text-[0.8125rem] text-[#666666] hover:text-semantic-text border border-[rgba(202,209,211,0.3)] hover:bg-[#F5F7F7] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={!resolutionNote.trim() || !resolvedByCategory}
                    className="px-4 py-1.5 text-[0.8125rem] text-white bg-core_palette-primary-1 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Resolve Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
