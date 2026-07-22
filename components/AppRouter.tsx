import React from 'react';
import { AppView } from './Header';
import { ServiceDeskData } from '../hooks/useServiceDeskData';
import { TicketsPage, TicketViewMode } from '../pages/TicketsPage';
import { DevicesPage } from '../pages/DevicesPage';
import { SoftwarePage } from '../pages/SoftwarePage';
import { DocumentsPage } from '../pages/DocumentsPage';
import { TicketGroupsAdmin } from '../pages/TicketGroupsAdmin';
import { TechniciansPage } from '../pages/TechniciansPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { ServiceLevelsPage } from '../pages/ServiceLevelsPage';
import { DefaultTasksPage } from '../pages/DefaultTasksPage';
import { RolesPage } from '../pages/RolesPage';
import { RolePermissionsPage } from '../pages/RolePermissionsPage';
import { TableauPage } from '../pages/TableauPage';
import { PeoplePage } from '../pages/PeoplePage';
import { LocationsPage } from '../pages/LocationsPage';
import { DOSPage } from '../pages/DOSPage';
import { DOSSearchConfigPage } from '../pages/DOSSearchConfigPage';
import { DevReferencePage } from '../pages/DevReferencePage';

interface AppRouterProps {
  view: AppView;
  data: ServiceDeskData;
  showNewTicket: boolean;
  onCloseNewTicket: () => void;
}

export function AppRouter({ view, data, showNewTicket, onCloseNewTicket }: AppRouterProps) {
  const { tables } = data;

  if (view === 'home' || view === 'kanban' || view === 'table' || view === 'timeline') {
    return (
      <TicketsPage
        viewMode={view as TicketViewMode}
        ticketsLoading={data.ticketsLoading}
        ticketRecords={data.ticketRecords}
        noteRecords={data.noteRecords}
        extTicketRecords={data.extTicketRecords}
        groupRecords={data.groupRecords}
        historyRecords={data.historyRecords}
        docRecords={data.docRecords}
        deviceRecords={data.deviceRecords}
        softwareRecords={data.softwareRecords}
        taskRecords={data.taskRecords}
        defaultTaskRecords={data.defaultTaskRecords}
        tableauRecords={data.tableauRecords}
        ticketsTable={tables.ticketsTable}
        notesTable={tables.notesTable}
        extTicketsTable={tables.extTicketsTable}
        tasksTable={tables.tasksTable}
        serviceLevels={data.serviceLevels}
        technicians={data.technicians}
        categories={data.categories}
        catRecords={data.catRecords}
        subcatRecords={data.subcatRecords}
        peopleRecords={data.peopleRecords}
        showNewTicket={showNewTicket}
        onCloseNewTicket={onCloseNewTicket}
        onRefresh={data.handleRefresh}
        refetchTickets={data.refetchTickets}
      />
    );
  }

  const overflowHidden = view === 'devices' || view === 'software' || view === 'locations' || view === 'dos' || view === 'documents' || view === 'defaulttasks' || view === 'roles' || view === 'permissions' || view === 'tableau' || view === 'people' || view === 'dossearchconfig' || view === 'devreference';

  return (
    <main className={`flex-1 min-h-0 bg-[#F5F7F7] ${overflowHidden ? 'overflow-hidden' : 'overflow-auto'}`}>
      {view === 'devices' && (
        <DevicesPage
          devicesTable={tables.devicesTable}
          ticketRecords={data.ticketRecords}
          serviceLevels={data.serviceLevels}
          deviceBuildingRecords={data.deviceBuildingRecords}
          departmentRecords={data.departmentRecords}
          productRecords={data.productRecords}
          softwareRecords={data.softwareRecords}
        />
      )}
      {view === 'software' && (
        <SoftwarePage
          softwareTable={tables.softwareTable}
          deviceRecords={data.deviceRecords}
          serviceDeptRecords={data.serviceDeptRecords}
          vendorRecords={data.vendorRecords}
        />
      )}
      {view === 'locations' && (
        <LocationsPage
          buildingTable={tables.buildingTable}
          taxonomyRecords={data.taxonomyRecords}
          dosRecords={data.dosRecords}
          serviceItemRecords={data.serviceItemRecords}
        />
      )}
      {view === 'dos' && (
        <DOSPage
          dosRecords={data.dosRecords}
          serviceItemRecords={data.serviceItemRecords}
        />
      )}
      {view === 'documents' && (
        <DocumentsPage
          docsTable={tables.docsTable}
          catTable={tables.catTable}
        />
      )}
      {view === 'groups' && (
        <TicketGroupsAdmin
          groupsTable={tables.groupsTable}
          externalTicketsTable={tables.extTicketsTable}
        />
      )}
      {view === 'technicians' && (
        <TechniciansPage
          techTable={tables.techTable}
          peopleTable={tables.peopleTable}
          catRecords={data.catRecords}
          categories={data.categories}
        />
      )}
      {view === 'people' && (
        <PeoplePage
          peopleTable={tables.peopleTable}
          roleRecords={data.roleRecords}
        />
      )}
      {view === 'categories' && (
        <CategoriesPage
          catTable={tables.catTable}
          subcatTable={tables.subcatTable}
          techTable={tables.techTable}
          slTable={tables.slTable}
          technicians={data.technicians}
          serviceLevels={data.serviceLevels}
        />
      )}
      {view === 'servicelevels' && (
        <ServiceLevelsPage
          slTable={tables.slTable}
          catRecords={data.catRecords}
        />
      )}
      {view === 'defaulttasks' && (
        <DefaultTasksPage
          defaultTasksTable={tables.defaultTasksTable}
          categories={data.categories}
        />
      )}
      {view === 'roles' && (
        <RolesPage
          rolesTable={tables.rolesTable}
          rolePermissionsTable={tables.rolePermissionsTable}
          rolePermissionRecords={data.rolePermissionRecords}
          peopleRecords={data.peopleRecords}
          onRefreshRoles={data.refetchRoles}
          onRefreshPermissions={data.refetchRolePermissions}
        />
      )}
      {view === 'permissions' && (
        <RolePermissionsPage
          rolePermissionsTable={tables.rolePermissionsTable}
          roleRecords={data.roleRecords}
          onRefresh={data.refetchRolePermissions}
        />
      )}
      {view === 'tableau' && (
        <TableauPage
          tableauTable={tables.tableauTable}
        />
      )}
      {view === 'dossearchconfig' && (
        <DOSSearchConfigPage
          dosSearchLogTable={tables.dosSearchLogTable}
          dosSearchLogRecords={data.dosSearchLogRecords}
          dosRecords={data.dosRecords}
          dosTable={tables.dosTable}
          onRefreshSearchLog={data.refetchDosSearchLog}
        />
      )}
      {view === 'devreference' && (
        <DevReferencePage />
      )}
    </main>
  );
}
