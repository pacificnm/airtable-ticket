import { useMemo, useCallback } from 'react';
import { useBase, useRecords, AirtableRecord, Table, Base } from '../lib/airtable-hooks';
import { ServiceLevel, Technician, Category } from '../types';
import { AppView } from '../components/Header';

export interface ServiceDeskTables {
  ticketsTable: Table;
  notesTable: Table;
  techTable: Table;
  slTable: Table;
  catTable: Table;
  subcatTable: Table;
  groupsTable: Table;
  extTicketsTable: Table;
  historyTable: Table;
  docsTable: Table;
  devicesTable: Table;
  softwareTable: Table;
  serviceDeptTable: Table;
  vendorsTable: Table;
  deviceBuildingTable: Table;
  departmentTable: Table;
  productsTable: Table;
  notificationsTable: Table;
  peopleTable: Table;
  tasksTable: Table;
  defaultTasksTable: Table;
  rolesTable: Table;
  rolePermissionsTable: Table;
  tableauTable: Table;
  buildingTable: Table;
  taxonomyTable: Table;
  dosTable: Table;
  serviceItemsTable: Table;
  dosSearchLogTable: Table;
}

export interface ServiceDeskData {
  tables: ServiceDeskTables;
  ticketRecords: AirtableRecord[];
  ticketsLoading: boolean;
  noteRecords: AirtableRecord[];
  techRecords: AirtableRecord[];
  catRecords: AirtableRecord[];
  subcatRecords: AirtableRecord[];
  extTicketRecords: AirtableRecord[];
  groupRecords: AirtableRecord[];
  historyRecords: AirtableRecord[];
  docRecords: AirtableRecord[];
  deviceRecords: AirtableRecord[];
  softwareRecords: AirtableRecord[];
  serviceDeptRecords: AirtableRecord[];
  vendorRecords: AirtableRecord[];
  deviceBuildingRecords: AirtableRecord[];
  departmentRecords: AirtableRecord[];
  productRecords: AirtableRecord[];
  taskRecords: AirtableRecord[];
  defaultTaskRecords: AirtableRecord[];
  roleRecords: AirtableRecord[];
  rolePermissionRecords: AirtableRecord[];
  peopleRecords: AirtableRecord[];
  tableauRecords: AirtableRecord[];
  buildingRecords: AirtableRecord[];
  taxonomyRecords: AirtableRecord[];
  dosRecords: AirtableRecord[];
  serviceItemRecords: AirtableRecord[];
  dosSearchLogRecords: AirtableRecord[];
  notificationRecords: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  technicians: Technician[];
  categories: Category[];
  refetchTickets: () => Promise<void>;
  refetchNotes: () => Promise<void>;
  refetchExtTickets: () => Promise<void>;
  refetchHistory: () => Promise<void>;
  refetchGroups: () => Promise<void>;
  refetchTasks: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
  refetchRoles: () => Promise<void>;
  refetchRolePermissions: () => Promise<void>;
  refetchTableau: () => Promise<void>;
  refetchServiceDept: () => Promise<void>;
  refetchDosSearchLog: () => Promise<void>;
  handleRefresh: () => Promise<void>;
}

export function resolveRequiredTables(base: Base): ServiceDeskTables | null {
  const ticketsTable = base.getTableByName('Tickets');
  const notesTable = base.getTableByName('Notes');
  const techTable = base.getTableByName('Technicians');
  const slTable = base.getTableByName('Service Levels');
  const catTable = base.getTableByName('Category');
  const subcatTable = base.getTableByName('Subcategory');
  const groupsTable = base.getTableByName('Ticket Groups');
  const extTicketsTable = base.getTableByName('External Tickets');
  const historyTable = base.getTableByName('Ticket History');
  const docsTable = base.getTableByName('Documents');
  const devicesTable = base.getTableByName('Devices');
  const softwareTable = base.getTableByName('Software');
  const serviceDeptTable = base.getTableByName('Service Department');
  const vendorsTable = base.getTableByName('Vendors');
  const deviceBuildingTable = base.getTableByName('Device Building');
  const departmentTable = base.getTableByName('Department');
  const productsTable = base.getTableByName('Products');
  const notificationsTable = base.getTableByName('Notifications');
  const peopleTable = base.getTableByName('People');
  const tasksTable = base.getTableByName('Tasks');
  const defaultTasksTable = base.getTableByName('Default Tasks');
  const rolesTable = base.getTableByName('Roles');
  const rolePermissionsTable = base.getTableByName('Role Permissions');
  const tableauTable = base.getTableByName('Tableau Dashboards');
  const buildingTable = base.getTableByName('Building');
  const taxonomyTable = base.getTableByName('Taxonomy');
  const dosTable = base.getTableByName('Description Of Services');
  const serviceItemsTable = base.getTableByName('Service Items');
  const dosSearchLogTable = base.getTableByName('DOS Search Log');

  if (!ticketsTable || !notesTable || !techTable || !slTable || !catTable || !subcatTable ||
      !groupsTable || !extTicketsTable || !historyTable || !docsTable ||
      !devicesTable || !softwareTable || !serviceDeptTable || !vendorsTable ||
      !deviceBuildingTable || !departmentTable || !productsTable ||
      !notificationsTable || !peopleTable || !tasksTable || !defaultTasksTable ||
      !rolesTable || !rolePermissionsTable || !tableauTable || !buildingTable || !taxonomyTable ||
      !dosTable || !serviceItemsTable || !dosSearchLogTable) {
    return null;
  }

  return {
    ticketsTable, notesTable, techTable, slTable, catTable, subcatTable,
    groupsTable, extTicketsTable, historyTable, docsTable,
    devicesTable, softwareTable, serviceDeptTable, vendorsTable,
    deviceBuildingTable, departmentTable, productsTable,
    notificationsTable, peopleTable, tasksTable, defaultTasksTable,
    rolesTable, rolePermissionsTable, tableauTable, buildingTable, taxonomyTable,
    dosTable, serviceItemsTable, dosSearchLogTable,
  };
}

// Determine which optional tables a view needs
function viewNeeds(view: AppView) {
  const isTicketView = view === 'kanban' || view === 'table' || view === 'timeline';
  return {
    notes: isTicketView,
    history: isTicketView,
    extTickets: isTicketView,
    groups: isTicketView || view === 'groups',
    docs: isTicketView || view === 'documents',
    devices: isTicketView || view === 'devices',
    software: true,
    serviceDept: true,
    vendors: true,
    deviceBuildings: isTicketView || view === 'devices',
    departments: isTicketView || view === 'devices',
    products: isTicketView || view === 'devices',
    tasks: isTicketView,
    defaultTasks: isTicketView || view === 'defaulttasks',
    people: true,
    roles: true,
    rolePermissions: true,
    tableau: isTicketView || view === 'tableau',
    buildings: view === 'locations',
    taxonomy: view === 'locations',
    dos: view === 'dos' || view === 'locations' || view === 'dossearchconfig',
    serviceItems: view === 'dos' || view === 'locations',
    dosSearchLog: view === 'dossearchconfig',
  };
}

export function useServiceDeskData(tables: ServiceDeskTables, view: AppView): ServiceDeskData {
  const needs = viewNeeds(view);

  // Always loaded — used in header, nav, or across most views
  const { records: ticketRecords, loading: ticketsLoading, refetch: refetchTickets } = useRecords(tables.ticketsTable);
  const { records: techRecords } = useRecords(tables.techTable);
  const { records: slRecords } = useRecords(tables.slTable);
  const { records: catRecords } = useRecords(tables.catTable);
  const { records: subcatRecords } = useRecords(tables.subcatTable);
  const { records: notificationRecords, refetch: refetchNotifications } = useRecords(tables.notificationsTable);

  // Lazy loaded — only when the current view needs them
  const { records: noteRecords, refetch: refetchNotes } = useRecords(tables.notesTable, { enabled: needs.notes } as any);
  const { records: extTicketRecords, refetch: refetchExtTickets } = useRecords(tables.extTicketsTable, { enabled: needs.extTickets } as any);
  const { records: groupRecords, refetch: refetchGroups } = useRecords(tables.groupsTable, { enabled: needs.groups } as any);
  const { records: historyRecords, refetch: refetchHistory } = useRecords(tables.historyTable, { enabled: needs.history } as any);
  const { records: docRecords } = useRecords(tables.docsTable, { enabled: needs.docs } as any);
  const { records: deviceRecords } = useRecords(tables.devicesTable, { enabled: needs.devices } as any);
  const { records: softwareRecords } = useRecords(tables.softwareTable, { enabled: needs.software } as any);
  const { records: serviceDeptRecords, refetch: refetchServiceDept } = useRecords(tables.serviceDeptTable, { enabled: needs.serviceDept } as any);
  const { records: vendorRecords } = useRecords(tables.vendorsTable, { enabled: needs.vendors } as any);
  const { records: deviceBuildingRecords } = useRecords(tables.deviceBuildingTable, { enabled: needs.deviceBuildings } as any);
  const { records: departmentRecords } = useRecords(tables.departmentTable, { enabled: needs.departments } as any);
  const { records: productRecords } = useRecords(tables.productsTable, { enabled: needs.products } as any);
  const { records: taskRecords, refetch: refetchTasks } = useRecords(tables.tasksTable, { enabled: needs.tasks } as any);
  const { records: defaultTaskRecords } = useRecords(tables.defaultTasksTable, { enabled: needs.defaultTasks } as any);
  const { records: roleRecords, refetch: refetchRoles } = useRecords(tables.rolesTable, { enabled: needs.roles } as any);
  const { records: rolePermissionRecords, refetch: refetchRolePermissions } = useRecords(tables.rolePermissionsTable, { enabled: needs.rolePermissions } as any);
  const { records: peopleRecords } = useRecords(tables.peopleTable, { enabled: needs.people } as any);
  const { records: tableauRecords, refetch: refetchTableau } = useRecords(tables.tableauTable, { enabled: needs.tableau } as any);
  const { records: buildingRecords } = useRecords(tables.buildingTable, { enabled: needs.buildings } as any);
  const { records: taxonomyRecords } = useRecords(tables.taxonomyTable, { enabled: needs.taxonomy } as any);
  const { records: dosRecords } = useRecords(tables.dosTable, { enabled: needs.dos } as any);
  const { records: serviceItemRecords } = useRecords(tables.serviceItemsTable, { enabled: needs.serviceItems } as any);
  const { records: dosSearchLogRecords, refetch: refetchDosSearchLog } = useRecords(tables.dosSearchLogTable, { enabled: needs.dosSearchLog } as any);

  const serviceLevels: ServiceLevel[] = useMemo(() =>
    slRecords.map(r => ({
      id: r.id,
      name: r.getCellValueAsString('Name'),
      responseHours: (r.getCellValue('Response Time (hours)') as number) || 0,
      resolutionHours: (r.getCellValue('Resolution Time (hours)') as number) || 0,
      priorityOrder: (r.getCellValue('Priority Order') as number) || 99,
    })),
    [slRecords]
  );

  const technicians: Technician[] = useMemo(() =>
    techRecords.map(r => ({
      id: r.id,
      name: r.getCellValueAsString('Name'),
      active: !!r.getCellValue('Active'),
    })),
    [techRecords]
  );

  const categories: Category[] = useMemo(() =>
    catRecords.map(r => ({
      id: r.id,
      name: r.getCellValueAsString('Name'),
      description: r.getCellValueAsString('Description'),
    })),
    [catRecords]
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchTickets(), refetchNotes(), refetchExtTickets(), refetchHistory(), refetchTasks()]);
  }, [refetchTickets, refetchNotes, refetchExtTickets, refetchHistory, refetchTasks]);

  return {
    tables,
    ticketRecords, ticketsLoading,
    noteRecords, techRecords, catRecords, subcatRecords,
    extTicketRecords, groupRecords, historyRecords,
    docRecords, deviceRecords, softwareRecords, serviceDeptRecords, vendorRecords,
    deviceBuildingRecords, departmentRecords, productRecords,
    taskRecords, defaultTaskRecords,
    roleRecords, rolePermissionRecords, peopleRecords, tableauRecords,
    buildingRecords, taxonomyRecords, dosRecords, serviceItemRecords, dosSearchLogRecords, notificationRecords,
    serviceLevels, technicians, categories,
    refetchTickets, refetchNotes, refetchExtTickets,
    refetchHistory, refetchGroups, refetchTasks, refetchNotifications,
    refetchRoles, refetchRolePermissions, refetchTableau, refetchServiceDept, refetchDosSearchLog,
    handleRefresh,
  };
}
