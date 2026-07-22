import React, { useState, useMemo } from 'react';
import { AirtableRecord, Table } from '../lib/airtable-hooks';
import { ServiceLevel, Technician, Category } from '../types';
import { Filters } from '../components/Filters';
import { KanbanBoard } from '../components/KanbanBoard';
import { TicketTable } from '../components/TicketTable';
import { GanttTimeline } from '../components/GanttTimeline';
import { TicketDetail } from '../components/TicketDetail';
import { TicketForm } from '../components/TicketForm';
import { MyWorkPage } from './MyWorkPage';
import { useTicketFilters } from '../hooks/useTicketFilters';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useHasPermission } from '../components/RoleGuard';
import { isTicketMine } from '../utils/ticketAccess';

export type TicketViewMode = 'home' | 'kanban' | 'table' | 'timeline';

interface TicketsPageProps {
  viewMode: TicketViewMode;
  ticketsLoading: boolean;
  ticketRecords: AirtableRecord[];
  noteRecords: AirtableRecord[];
  extTicketRecords: AirtableRecord[];
  groupRecords: AirtableRecord[];
  historyRecords: AirtableRecord[];
  docRecords: AirtableRecord[];
  deviceRecords: AirtableRecord[];
  softwareRecords: AirtableRecord[];
  taskRecords: AirtableRecord[];
  defaultTaskRecords: AirtableRecord[];
  tableauRecords: AirtableRecord[];
  ticketsTable: Table;
  notesTable: Table;
  extTicketsTable: Table;
  tasksTable: Table;
  serviceLevels: ServiceLevel[];
  technicians: Technician[];
  categories: Category[];
  catRecords: AirtableRecord[];
  subcatRecords: AirtableRecord[];
  peopleRecords: AirtableRecord[];
  showNewTicket: boolean;
  onCloseNewTicket: () => void;
  onRefresh: () => Promise<void>;
  refetchTickets: () => Promise<void>;
}

export function TicketsPage({
  viewMode,
  ticketsLoading,
  ticketRecords,
  noteRecords,
  extTicketRecords,
  groupRecords,
  historyRecords,
  docRecords,
  deviceRecords,
  softwareRecords,
  taskRecords,
  defaultTaskRecords,
  tableauRecords,
  ticketsTable,
  notesTable,
  extTicketsTable,
  tasksTable,
  serviceLevels,
  technicians,
  categories,
  catRecords,
  subcatRecords,
  peopleRecords,
  showNewTicket,
  onCloseNewTicket,
  onRefresh,
  refetchTickets,
}: TicketsPageProps) {
  const [selectedTicket, setSelectedTicket] = useState<AirtableRecord | null>(null);
  const { currentUser } = useCurrentUser();
  const canViewOthers = useHasPermission('tickets.view.others');

  // Enforce role-based access: users without the "view others" permission only
  // ever see tickets assigned to or raised by them, across every ticket view.
  const scopedTickets = useMemo(
    () => (canViewOthers ? ticketRecords : ticketRecords.filter(t => isTicketMine(t, currentUser))),
    [canViewOthers, ticketRecords, currentUser]
  );

  const { filters, setFilters, filteredTickets } = useTicketFilters(scopedTickets, technicians);

  const refreshedSelectedTicket = selectedTicket
    ? ticketRecords.find(t => t.id === selectedTicket.id) || selectedTicket
    : null;

  if (viewMode === 'home') {
    return (
      <>
        <MyWorkPage
          tickets={ticketRecords}
          ticketsTable={ticketsTable}
          serviceLevels={serviceLevels}
          onSelectTicket={setSelectedTicket}
        />
        {refreshedSelectedTicket && (
          <TicketDetail
            ticket={refreshedSelectedTicket}
            ticketsTable={ticketsTable}
            notesTable={notesTable}
            externalTicketsTable={extTicketsTable}
            allNotes={noteRecords}
            allExternalTickets={extTicketRecords}
            allGroups={groupRecords}
            allHistory={historyRecords}
            allDocuments={docRecords}
            allDevices={deviceRecords}
            allSoftware={softwareRecords}
            allTasks={taskRecords}
            allDashboards={tableauRecords}
            tasksTable={tasksTable}
            serviceLevels={serviceLevels}
            technicians={technicians}
            categories={categories}
            onClose={() => setSelectedTicket(null)}
            onRefresh={onRefresh}
          />
        )}
        {showNewTicket && (
          <TicketForm
            ticketsTable={ticketsTable}
            tasksTable={tasksTable}
            defaultTaskRecords={defaultTaskRecords}
            serviceLevels={serviceLevels}
            technicians={technicians}
            categories={categories}
            catRecords={catRecords}
            subcatRecords={subcatRecords}
            tableauRecords={tableauRecords}
            deviceRecords={deviceRecords}
            peopleRecords={peopleRecords}
            onClose={onCloseNewTicket}
            onCreated={async () => { await refetchTickets(); }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Filters
        filters={filters}
        onChange={setFilters}
        technicians={technicians}
        serviceLevels={serviceLevels}
      />

      <main className={`flex-1 min-h-0 bg-[#F5F7F7] ${viewMode === 'timeline' ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
        {ticketsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-core_palette-primary-5 border-t-core_palette-primary-1 rounded-full animate-spin" role="status" aria-label="Loading" />
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            tickets={filteredTickets}
            serviceLevels={serviceLevels}
            onSelectTicket={setSelectedTicket}
          />
        ) : viewMode === 'timeline' ? (
          <GanttTimeline
            tickets={filteredTickets}
            serviceLevels={serviceLevels}
            onSelectTicket={setSelectedTicket}
          />
        ) : (
          <div className="bg-white mx-4 my-4 border border-[rgba(202,209,211,0.3)]">
            <TicketTable
              tickets={filteredTickets}
              serviceLevels={serviceLevels}
              onSelectTicket={setSelectedTicket}
            />
          </div>
        )}
      </main>

      {refreshedSelectedTicket && (
        <TicketDetail
          ticket={refreshedSelectedTicket}
          ticketsTable={ticketsTable}
          notesTable={notesTable}
          externalTicketsTable={extTicketsTable}
          allNotes={noteRecords}
          allExternalTickets={extTicketRecords}
          allGroups={groupRecords}
          allHistory={historyRecords}
          allDocuments={docRecords}
          allDevices={deviceRecords}
          allSoftware={softwareRecords}
          allTasks={taskRecords}
          allDashboards={tableauRecords}
          tasksTable={tasksTable}
          serviceLevels={serviceLevels}
          technicians={technicians}
          categories={categories}
          onClose={() => setSelectedTicket(null)}
          onRefresh={onRefresh}
        />
      )}

      {showNewTicket && (
        <TicketForm
          ticketsTable={ticketsTable}
          tasksTable={tasksTable}
          defaultTaskRecords={defaultTaskRecords}
          serviceLevels={serviceLevels}
          technicians={technicians}
          categories={categories}
          catRecords={catRecords}
          subcatRecords={subcatRecords}
          tableauRecords={tableauRecords}
          deviceRecords={deviceRecords}
          peopleRecords={peopleRecords}
          onClose={onCloseNewTicket}
          onCreated={async () => {
            await refetchTickets();
          }}
        />
      )}
    </>
  );
}
