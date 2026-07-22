import React, { useState, useMemo } from 'react';
import {
  DevicesIcon,
  RouterIcon,
  SearchIcon,
  CloseIcon,
  CheckCircleIcon,
  CancelIcon,
  InfoOutlinedIcon,
  LocationOnIcon,
  ConfirmationNumberIcon,
  ComputerIcon,
  HelpOutlineIcon,
  OpenInNewIcon,
  AddIcon,
  EditIcon,
} from '../components/Icons';
import {
  AirtableRecord,
  Table,
  useRecords,
  useUpdateRecord,
  useCreateRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import {
  STATUS_COLORS as TICKET_STATUS_COLORS,
  PRIORITY_COLORS,
  ServiceLevel,
} from '../types';
import { calculateSLA } from '../utils';
import { useSnackbar } from '../components/SnackbarProvider';
import { RoleGuard, useHasPermission } from '../components/RoleGuard';

/* ── inline device-type SVG icons ── */
const WifiIcon = ({ size = 16, color = '#17E88F' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
  </svg>
);
const SensorsIcon = ({ size = 16, color = '#17E88F' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M7.76 16.24C6.67 15.16 6 13.66 6 12s.67-3.16 1.76-4.24l1.42 1.42C8.45 9.9 8 10.9 8 12c0 1.1.45 2.1 1.17 2.83l-1.41 1.41zm8.48 0C17.33 15.16 18 13.66 18 12s-.67-3.16-1.76-4.24l-1.42 1.42C15.55 9.9 16 10.9 16 12c0 1.1-.45 2.1-1.17 2.83l1.41 1.41zM12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6.95 8.95l1.41-1.41C4.9 15.98 4 14.08 4 12c0-2.08.9-3.98 2.46-5.54L5.05 5.05A9.938 9.938 0 002 12c0 2.76 1.12 5.26 2.93 7.07l.12-.12zm13.9 0A9.938 9.938 0 0022 12c0-2.76-1.12-5.26-2.93-7.07l-1.42 1.42A7.94 7.94 0 0120 12c0 2.08-.9 3.98-2.46 5.54l1.41 1.41z" />
  </svg>
);
const SettingsInputAntennaIcon = ({ size = 16, color = '#17E88F' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M12 5c-3.87 0-7 3.13-7 7h2c0-2.76 2.24-5 5-5s5 2.24 5 5h2c0-3.87-3.13-7-7-7zm1 9.29c.88-.39 1.5-1.26 1.5-2.29a2.5 2.5 0 00-5 0c0 1.02.62 1.9 1.5 2.29v3.3L7.59 21 9 22.41l3-3 3 3L16.41 21 13 17.59v-3.3zM12 1C5.93 1 1 5.93 1 12h2c0-4.97 4.03-9 9-9s9 4.03 9 9h2c0-6.07-4.93-11-11-11z" />
  </svg>
);
const StorageIcon = ({ size = 16, color = '#17E88F' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z" />
  </svg>
);
const MemoryIcon = ({ size = 16, color = '#17E88F' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z" />
  </svg>
);
const NetworkCheckIcon = ({ size = 14, color = '#003F2D' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M15.9 5c-.17 0-.32.09-.41.23l-.07.15-5.18 11.65c-.16.29-.26.61-.26.96 0 1.11.9 2.01 2.01 2.01.96 0 1.77-.68 1.96-1.59l.01-.03L16.4 5.5c0-.28-.22-.5-.5-.5zM1 9l2 2c2.88-2.88 6.79-4.08 10.53-3.62l1.19-2.68C10.44 4.08 5.62 5.51 2 9zm20 2l2-2c-1.64-1.64-3.55-2.82-5.59-3.57l-.53 2.82c1.5.62 2.9 1.53 4.12 2.75zm-4 4l2-2c-.8-.8-1.7-1.42-2.66-1.89l-.55 2.92c.42.27.83.59 1.21.97zM5 13l2 2a7.1 7.1 0 014.03-2l1.28-2.88c-2.6.1-5.09 1.05-7.31 2.88z" />
  </svg>
);

const DEVICE_TYPE_ICONS: Record<string, React.ReactElement> = {
  'Router (Gateway)': <RouterIcon size={16} style={{ color: '#17E88F' }} />,
  'Access Point': <WifiIcon />,
  'Sensor': <SensorsIcon />,
  'Controller': <SettingsInputAntennaIcon />,
  'End Point': <ComputerIcon size={16} style={{ color: '#17E88F' }} />,
  'On Prem Server': <StorageIcon />,
  'Workstation': <ComputerIcon size={16} style={{ color: '#17E88F' }} />,
  'BMS Network Controller': <SettingsInputAntennaIcon />,
  'Lighting Network Controller': <SettingsInputAntennaIcon />,
  'Fire Life Safety Device': <SensorsIcon />,
  'Virtual Server': <StorageIcon />,
  'Non CBRE Managed': <DevicesIcon size={16} style={{ color: '#17E88F' }} />,
  'UPS Battery Backup': <MemoryIcon />,
  'UPS Battery Pack': <MemoryIcon />,
  'Power Meter': <MemoryIcon />,
};

const DEVICE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Active': { bg: '#E6FCE8', text: '#006400' },
  'Decommissioned': { bg: '#FDECEF', text: '#9B1C31' },
  'Planning': { bg: '#FFF8E6', text: '#8B6914' },
  'Not Found': { bg: '#F5E6F9', text: '#7B2D8E' },
};

const DEVICE_TYPE_CHOICES = [
  'Router (Gateway)',
  'Access Point',
  'Sensor',
  'Controller',
  'End Point',
  'On Prem Server',
  'Workstation',
  'BMS Network Controller',
  'Lighting Network Controller',
  'Fire Life Safety Device',
  'Other - See Comments',
  'Unknown Device',
  'Virtual Server',
  'Non CBRE Managed',
  'UPS Battery Backup',
  'UPS Battery Pack',
  'Power Meter',
];

const DEVICE_STATUS_CHOICES = ['Active', 'Decommissioned', 'Planning', 'Not Found'];

/* ── form state ── */

interface DeviceFormState {
  name: string;
  tag: string;
  type: string;
  status: string;
  buildingId: string | null;
  departmentId: string | null;
  productId: string | null;
  softwareIds: string[];
  ipAddress: string;
  defaultGateway: string;
  bacnetId: string;
  serviceLine: string;
  businessUnit: string;
  issues: string;
  comment: string;
  spaceCode: string;
}

const EMPTY_DEVICE_FORM: DeviceFormState = {
  name: '',
  tag: '',
  type: '',
  status: 'Active',
  buildingId: null,
  departmentId: null,
  productId: null,
  softwareIds: [],
  ipAddress: '',
  defaultGateway: '',
  bacnetId: '',
  serviceLine: '',
  businessUnit: '',
  issues: '',
  comment: '',
  spaceCode: '',
};

/* ── form styling ── */

const inputCls = "w-full px-2 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white";
const selectCls = "w-full px-2 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white";
const labelCls = "text-[0.625rem] text-semantic-system-7 mb-0.5 block";

/* ── DeviceNode ── */

interface DeviceNode {
  id: string;
  record: AirtableRecord;
  name: string;
  tag: string;
  type: string;
  status: string;
  building: string;
  buildingIds: string[];
  department: string;
  departmentIds: string[];
  serviceLine: string;
  businessUnit: string;
  ipAddress: string;
  defaultGateway: string;
  bacnetId: string;
  product: string;
  productIds: string[];
  software: string;
  softwareIds: string[];
  comment: string;
  issues: string;
  ticketIds: string[];
  ticketCount: number;
  macAddress: string;
  vlanId: string;
  port: string;
  switchId: string;
  subnetMask: string;
  aRecord: string;
  spaceCode: string;
}

function nodeToForm(n: DeviceNode): DeviceFormState {
  return {
    name: n.name,
    tag: n.tag,
    type: n.type,
    status: n.status,
    buildingId: n.buildingIds[0] || null,
    departmentId: n.departmentIds[0] || null,
    productId: n.productIds[0] || null,
    softwareIds: n.softwareIds,
    ipAddress: n.ipAddress,
    defaultGateway: n.defaultGateway,
    bacnetId: n.bacnetId,
    serviceLine: n.serviceLine,
    businessUnit: n.businessUnit,
    issues: n.issues,
    comment: n.comment,
    spaceCode: n.spaceCode,
  };
}

function formToFields(form: DeviceFormState): Record<string, any> {
  return {
    Name: form.name,
    Tag: form.tag,
    Type: form.type || null,
    Status: form.status || null,
    'Building Name': form.buildingId ? [{ id: form.buildingId }] : [],
    Department: form.departmentId ? [{ id: form.departmentId }] : [],
    Product: form.productId ? [{ id: form.productId }] : [],
    Software: form.softwareIds.map(id => ({ id })),
    'IP Address': form.ipAddress,
    'Default Gateway': form.defaultGateway,
    'BacNet ID': form.bacnetId,
    'Service Line': form.serviceLine,
    'Business Unit': form.businessUnit,
    Issues: form.issues,
    comment: form.comment,
    'Space Code': form.spaceCode,
  };
}

/* ── page ── */

interface DevicesPageProps {
  devicesTable: Table;
  ticketRecords: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  deviceBuildingRecords: AirtableRecord[];
  departmentRecords: AirtableRecord[];
  productRecords: AirtableRecord[];
  softwareRecords: AirtableRecord[];
  onOpenTicket?: (ticket: AirtableRecord) => void;
}

export function DevicesPage({
  devicesTable,
  ticketRecords,
  serviceLevels,
  deviceBuildingRecords,
  departmentRecords,
  productRecords,
  softwareRecords,
  onOpenTicket,
}: DevicesPageProps) {
  const { records: deviceRecords, loading } = useRecords(devicesTable);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DeviceNode | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const deviceNodes: DeviceNode[] = useMemo(() =>
    deviceRecords.map(r => ({
      id: r.id,
      record: r,
      name: r.getCellValueAsString('Name'),
      tag: r.getCellValueAsString('Tag'),
      type: r.getCellValueAsString('Type'),
      status: r.getCellValueAsString('Status'),
      building: r.getCellValueAsString('Building Name'),
      buildingIds: getLinkedRecordIds(r.getCellValue('Building Name') as any),
      department: r.getCellValueAsString('Department'),
      departmentIds: getLinkedRecordIds(r.getCellValue('Department') as any),
      serviceLine: r.getCellValueAsString('Service Line'),
      businessUnit: r.getCellValueAsString('Business Unit'),
      ipAddress: r.getCellValueAsString('IP Address'),
      defaultGateway: r.getCellValueAsString('Default Gateway'),
      bacnetId: r.getCellValueAsString('BacNet ID'),
      product: r.getCellValueAsString('Product'),
      productIds: getLinkedRecordIds(r.getCellValue('Product') as any),
      software: r.getCellValueAsString('Software'),
      softwareIds: getLinkedRecordIds(r.getCellValue('Software') as any),
      comment: r.getCellValueAsString('comment'),
      issues: r.getCellValueAsString('Issues'),
      ticketIds: getLinkedRecordIds((r as any).fields?.['Tickets']),
      ticketCount: getLinkedRecordIds((r as any).fields?.['Tickets']).length,
      macAddress: r.getCellValueAsString('MAC'),
      vlanId: r.getCellValueAsString('VLAN ID (from MAC)'),
      port: r.getCellValueAsString('Port (from MAC)'),
      switchId: r.getCellValueAsString('Switch ID (from MAC)'),
      subnetMask: r.getCellValueAsString('Subnet Mask (from VLAN ID) (from MAC)'),
      aRecord: r.getCellValueAsString('A Record (from MAC)'),
      spaceCode: r.getCellValueAsString('Space Code'),
    })).filter(n => n.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [deviceRecords]
  );

  const types = useMemo(() => {
    const set = new Set<string>();
    deviceNodes.forEach(n => { if (n.type) set.add(n.type); });
    return Array.from(set).sort();
  }, [deviceNodes]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    deviceNodes.forEach(n => { if (n.status) set.add(n.status); });
    return Array.from(set).sort();
  }, [deviceNodes]);

  const filteredDevices = useMemo(() => {
    return deviceNodes.filter(d => {
      if (typeFilter && d.type !== typeFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [d.name, d.tag, d.type, d.ipAddress, d.building, d.department, d.product, d.software].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [deviceNodes, typeFilter, statusFilter, search]);

  const activeCount = deviceNodes.filter(d => d.status === 'Active').length;
  const totalCount = deviceNodes.length;

  return (
    <div className="flex flex-col h-full">
      {/* Compact header bar */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DevicesIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Devices</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {activeCount} active
            </span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium bg-semantic-surface text-semantic-system-5">
              {totalCount} total
            </span>
          </div>
          <RoleGuard permission="devices.create">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.6875rem] font-medium text-white bg-core_palette-primary-1 hover:opacity-90 transition-opacity"
            >
              <AddIcon size={14} />
              New Device
            </button>
          </RoleGuard>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[320px]">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <SearchIcon size={14} className="text-semantic-system-7" />
            </div>
            <input
              type="text"
              placeholder="Search devices..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-7 py-1 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-semantic-system-7 hover:text-semantic-system-5" aria-label="Clear search">
                <CloseIcon size={14} />
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(typeFilter || statusFilter || search) && (
            <button
              onClick={() => { setTypeFilter(''); setStatusFilter(''); setSearch(''); }}
              className="inline-flex items-center gap-0.5 px-1.5 h-[22px] text-[0.6875rem] bg-semantic-surface text-semantic-system-5 hover:bg-core_palette-primary-6"
            >
              Clear
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-core_palette-primary-1 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3" style={{ backgroundColor: '#003F2D' }}>
              <DevicesIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">
              {deviceNodes.length === 0 ? 'No devices found' : 'No devices match your filters'}
            </p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              {deviceNodes.length === 0
                ? 'Devices will appear here once they are added to the system.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Tag</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[140px]">Type</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[90px]">Status</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[120px]">Building</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[110px]">IP Address</th>
                <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[60px]">Tkts</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredDevices.map(node => (
                <DeviceRow key={node.id} node={node} onClick={() => setSelectedDevice(node)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={7} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {filteredDevices.length} of {totalCount} devices
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {selectedDevice && (
        <DeviceDetailDrawer
          device={selectedDevice}
          devicesTable={devicesTable}
          ticketRecords={ticketRecords}
          serviceLevels={serviceLevels}
          deviceBuildingRecords={deviceBuildingRecords}
          departmentRecords={departmentRecords}
          productRecords={productRecords}
          softwareRecords={softwareRecords}
          onOpenTicket={onOpenTicket}
          onClose={() => setSelectedDevice(null)}
        />
      )}

      {showCreate && (
        <DeviceCreateDrawer
          devicesTable={devicesTable}
          deviceBuildingRecords={deviceBuildingRecords}
          departmentRecords={departmentRecords}
          productRecords={productRecords}
          softwareRecords={softwareRecords}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

/* ── table row ── */

function DeviceRow({ node, onClick }: { node: DeviceNode; onClick: () => void }) {
  const nameAttrs = useInspectAttrs(node.record, 'Name');
  const tagAttrs = useInspectAttrs(node.record, 'Tag');
  const typeAttrs = useInspectAttrs(node.record, 'Type');
  const statusAttrs = useInspectAttrs(node.record, 'Status');
  const buildingAttrs = useInspectAttrs(node.record, 'Building Name');
  const ipAttrs = useInspectAttrs(node.record, 'IP Address');

  const isDecommissioned = node.status === 'Decommissioned';
  const icon = DEVICE_TYPE_ICONS[node.type] || <DevicesIcon size={16} style={{ color: '#17E88F' }} />;
  const statusColor = DEVICE_STATUS_COLORS[node.status] || { bg: '#F2F4F8', text: '#616670' };

  return (
    <tr
      onClick={onClick}
      className="border-b border-semantic-surface cursor-pointer transition-colors hover:bg-[#FAFBFB]"
      style={{ opacity: isDecommissioned ? 0.55 : 1 }}
    >
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: isDecommissioned ? '#CAD1D3' : '#003F2D' }}
          >
            {isDecommissioned ? <DevicesIcon size={14} style={{ color: '#FFFFFF' }} /> : icon}
          </div>
          <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate">
            {node.name}
          </span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...tagAttrs} className={`text-[0.6875rem] font-mono truncate block ${node.tag ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.tag || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...typeAttrs} className={`text-[0.6875rem] truncate block ${node.type ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.type || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2" {...statusAttrs}>
        {node.status ? (
          <span className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            {node.status}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">—</span>
        )}
      </td>
      <td className="py-1.5 px-2">
        <span {...buildingAttrs} className={`text-[0.6875rem] truncate block ${node.building ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.building || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...ipAttrs} className={`text-[0.625rem] font-mono truncate block ${node.ipAddress ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.ipAddress || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2 pr-4 text-center">
        <span className="text-[0.6875rem] font-mono text-semantic-text">{node.ticketCount}</span>
      </td>
    </tr>
  );
}

/* ── shared form body ── */

function DeviceFormBody({
  form,
  setForm,
  deviceBuildingRecords,
  departmentRecords,
  productRecords,
  softwareRecords,
}: {
  form: DeviceFormState;
  setForm: React.Dispatch<React.SetStateAction<DeviceFormState>>;
  deviceBuildingRecords: AirtableRecord[];
  departmentRecords: AirtableRecord[];
  productRecords: AirtableRecord[];
  softwareRecords: AirtableRecord[];
}) {
  return (
    <>
      <SectionHeader icon={<InfoOutlinedIcon size={14} style={{ color: '#003F2D' }} />} title="General Information" />
      <DetailGrid>
        <div>
          <label className={labelCls}>Name *</label>
          <input value={form.name} onChange={(e: any) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Device name" />
        </div>
        <div>
          <label className={labelCls}>Tag</label>
          <input value={form.tag} onChange={(e: any) => setForm(f => ({ ...f, tag: e.target.value }))} className={inputCls} placeholder="Device tag" />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={form.type} onChange={(e: any) => setForm(f => ({ ...f, type: e.target.value }))} className={selectCls}>
            <option value="">—</option>
            {DEVICE_TYPE_CHOICES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={(e: any) => setForm(f => ({ ...f, status: e.target.value }))} className={selectCls}>
            <option value="">—</option>
            {DEVICE_STATUS_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Product</label>
          <SingleRecordComboBox
            records={productRecords}
            nameField="Name"
            selectedId={form.productId}
            onChange={(id) => setForm(f => ({ ...f, productId: id }))}
            placeholder="Search products..."
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Software</label>
          <MultiRecordComboBox
            records={softwareRecords}
            nameField="Name"
            selectedIds={form.softwareIds}
            onChange={(ids) => setForm(f => ({ ...f, softwareIds: ids }))}
            placeholder="Search software..."
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Issues</label>
          <input value={form.issues} onChange={(e: any) => setForm(f => ({ ...f, issues: e.target.value }))} className={inputCls} placeholder="Known issues" />
        </div>
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<LocationOnIcon size={14} style={{ color: '#003F2D' }} />} title="Location" />
      <DetailGrid>
        <div className="col-span-2">
          <label className={labelCls}>Building</label>
          <SingleRecordComboBox
            records={deviceBuildingRecords}
            nameField="Building Name"
            selectedId={form.buildingId}
            onChange={(id) => setForm(f => ({ ...f, buildingId: id }))}
            placeholder="Search buildings..."
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Department</label>
          <SingleRecordComboBox
            records={departmentRecords}
            nameField="Name"
            selectedId={form.departmentId}
            onChange={(id) => setForm(f => ({ ...f, departmentId: id }))}
            placeholder="Search departments..."
          />
        </div>
        <div>
          <label className={labelCls}>Service Line</label>
          <input value={form.serviceLine} onChange={(e: any) => setForm(f => ({ ...f, serviceLine: e.target.value }))} className={inputCls} placeholder="Service line" />
        </div>
        <div>
          <label className={labelCls}>Business Unit</label>
          <input value={form.businessUnit} onChange={(e: any) => setForm(f => ({ ...f, businessUnit: e.target.value }))} className={inputCls} placeholder="Business unit" />
        </div>
        <div>
          <label className={labelCls}>Space Code</label>
          <input value={form.spaceCode} onChange={(e: any) => setForm(f => ({ ...f, spaceCode: e.target.value }))} className={inputCls} placeholder="Space code" />
        </div>
        <div>
          <label className={labelCls}>BacNet ID</label>
          <input value={form.bacnetId} onChange={(e: any) => setForm(f => ({ ...f, bacnetId: e.target.value }))} className={inputCls} placeholder="BacNet ID" />
        </div>
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<NetworkCheckIcon />} title="Network" />
      <DetailGrid>
        <div>
          <label className={labelCls}>IP Address</label>
          <input value={form.ipAddress} onChange={(e: any) => setForm(f => ({ ...f, ipAddress: e.target.value }))} className={inputCls} placeholder="192.168.x.x" />
        </div>
        <div>
          <label className={labelCls}>Default Gateway</label>
          <input value={form.defaultGateway} onChange={(e: any) => setForm(f => ({ ...f, defaultGateway: e.target.value }))} className={inputCls} placeholder="Gateway" />
        </div>
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<HelpOutlineIcon size={14} style={{ color: '#003F2D' }} />} title="Comments" />
      <textarea
        value={form.comment}
        onChange={(e: any) => setForm(f => ({ ...f, comment: e.target.value }))}
        rows={4}
        className="w-full px-3 py-2 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors resize-none bg-white"
        placeholder="Add comments..."
      />
    </>
  );
}

/* ── create drawer ── */

function DeviceCreateDrawer({
  devicesTable,
  deviceBuildingRecords,
  departmentRecords,
  productRecords,
  softwareRecords,
  onClose,
}: {
  devicesTable: Table;
  deviceBuildingRecords: AirtableRecord[];
  departmentRecords: AirtableRecord[];
  productRecords: AirtableRecord[];
  softwareRecords: AirtableRecord[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<DeviceFormState>({ ...EMPTY_DEVICE_FORM });
  const { mutate: createRecord } = useCreateRecord(devicesTable);
  const { showSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createRecord({ fields: formToFields(form) });
      showSnackbar('Device created');
      onClose();
    } catch {
      showSnackbar('Failed to create device', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <DevicesIcon size={16} style={{ color: '#17E88F' }} />
            <span className="text-[0.8125rem] font-semibold font-sans">New Device</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4">
          <DeviceFormBody
            form={form}
            setForm={setForm}
            deviceBuildingRecords={deviceBuildingRecords}
            departmentRecords={departmentRecords}
            productRecords={productRecords}
            softwareRecords={softwareRecords}
          />
        </div>

        <div className="px-4 py-3 border-t border-semantic-surface flex justify-end gap-2 flex-shrink-0 bg-white">
          <button onClick={onClose} className="px-4 py-1.5 text-[0.8125rem] text-[#666666] hover:text-semantic-text border border-[rgba(202,209,211,0.3)] hover:bg-[#F5F7F7] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!form.name.trim() || saving}
            className="px-4 py-1.5 text-[0.8125rem] text-white bg-core_palette-primary-1 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Device'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── detail / edit drawer ── */

function DeviceDetailDrawer({
  device,
  devicesTable,
  ticketRecords,
  serviceLevels,
  deviceBuildingRecords,
  departmentRecords,
  productRecords,
  softwareRecords,
  onOpenTicket,
  onClose,
}: {
  device: DeviceNode;
  devicesTable: Table;
  ticketRecords: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  deviceBuildingRecords: AirtableRecord[];
  departmentRecords: AirtableRecord[];
  productRecords: AirtableRecord[];
  softwareRecords: AirtableRecord[];
  onOpenTicket?: (ticket: AirtableRecord) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DeviceFormState>(nodeToForm(device));
  const { mutate: updateRecord } = useUpdateRecord(devicesTable);
  const { showSnackbar } = useSnackbar();
  const canEdit = useHasPermission('devices.edit');

  const displayStatus = editing ? form.status : device.status;
  const statusColor = DEVICE_STATUS_COLORS[displayStatus] || { bg: '#F2F4F8', text: '#616670' };
  const icon = DEVICE_TYPE_ICONS[device.type] || <DevicesIcon size={20} style={{ color: '#17E88F' }} />;

  const linkedTickets = useMemo(() =>
    device.ticketIds.map(id => ticketRecords.find(t => t.id === id)).filter((t): t is AirtableRecord => !!t),
    [device.ticketIds, ticketRecords]
  );

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      await updateRecord({ recordId: device.id, fields: formToFields(form) });
      showSnackbar('Device updated');
      setEditing(false);
      onClose();
    } catch {
      showSnackbar('Failed to update device', 'error');
    }
  };

  const handleCancel = () => {
    setForm(nodeToForm(device));
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        {/* Dark header */}
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <DevicesIcon size={16} style={{ color: '#17E88F' }} />
            <span className="text-[0.8125rem] font-semibold font-sans">Device Details</span>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => { if (!editing) setEditing(true); }}
                className={`p-1 ${editing ? 'text-white/30 cursor-default' : 'text-white/60 hover:text-white'}`}
                aria-label="Edit"
              >
                <EditIcon size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Device identity */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-semantic-surface">
            <div
              className="w-9 h-9 flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: displayStatus === 'Decommissioned' ? '#CAD1D3' : '#003F2D' }}
            >
              {displayStatus === 'Decommissioned' ? <DevicesIcon size={20} style={{ color: '#FFFFFF' }} /> : icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.875rem] font-semibold text-semantic-text">{editing ? form.name : device.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {device.tag && <span className="text-[0.625rem] font-mono text-semantic-system-5">{device.tag}</span>}
                {device.type && (
                  <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: '#E8F5E9', color: '#003F2D' }}>
                    {device.type}
                  </span>
                )}
                {displayStatus && (
                  <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
                    {displayStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            {editing ? (
              <DeviceFormBody
                form={form}
                setForm={setForm}
                deviceBuildingRecords={deviceBuildingRecords}
                departmentRecords={departmentRecords}
                productRecords={productRecords}
                softwareRecords={softwareRecords}
              />
            ) : (
              <>
                <SectionHeader icon={<InfoOutlinedIcon size={14} style={{ color: '#003F2D' }} />} title="General Information" />
                <DetailGrid>
                  <DetailField label="Name" value={device.name} />
                  <DetailField label="Tag" value={device.tag} mono />
                  <DetailField label="Type" value={device.type} />
                  <DetailField label="Status" value={device.status} />
                  <DetailField label="Product" value={device.product} />
                  <DetailField label="Software" value={device.software} />
                  <DetailField label="Issues" value={device.issues} />
                </DetailGrid>

                <hr className="my-3 border-semantic-surface" />

                <SectionHeader icon={<LocationOnIcon size={14} style={{ color: '#003F2D' }} />} title="Location" />
                <DetailGrid>
                  <DetailField label="Building" value={device.building} />
                  <DetailField label="Department" value={device.department} />
                  <DetailField label="Service Line" value={device.serviceLine} />
                  <DetailField label="Business Unit" value={device.businessUnit} />
                  <DetailField label="Space Code" value={device.spaceCode} />
                  <DetailField label="BacNet ID" value={device.bacnetId} mono />
                </DetailGrid>

                <hr className="my-3 border-semantic-surface" />

                <SectionHeader icon={<NetworkCheckIcon />} title="Network" />
                <DetailGrid>
                  <DetailField label="IP Address" value={device.ipAddress} mono />
                  <DetailField label="Default Gateway" value={device.defaultGateway} mono />
                  <DetailField label="MAC Address" value={device.macAddress} mono />
                  <DetailField label="VLAN ID" value={device.vlanId} mono />
                  <DetailField label="Port" value={device.port} mono />
                  <DetailField label="Switch ID" value={device.switchId} mono />
                  <DetailField label="Subnet Mask" value={device.subnetMask} mono />
                  <DetailField label="A Record" value={device.aRecord} mono />
                </DetailGrid>

                {linkedTickets.length > 0 && (
                  <>
                    <hr className="my-3 border-semantic-surface" />
                    <SectionHeader icon={<ConfirmationNumberIcon size={14} style={{ color: '#003F2D' }} />} title={`Tickets (${linkedTickets.length})`} />
                    <div className="flex flex-col">
                      {linkedTickets.map(ticket => (
                        <LinkedTicketRow key={ticket.id} ticket={ticket} serviceLevels={serviceLevels} onClick={() => onOpenTicket?.(ticket)} />
                      ))}
                    </div>
                  </>
                )}

                {device.comment && (
                  <>
                    <hr className="my-3 border-semantic-surface" />
                    <SectionHeader icon={<HelpOutlineIcon size={14} style={{ color: '#003F2D' }} />} title="Comments" />
                    <div className="bg-[#F5F7F7] px-3 py-2">
                      <p className="text-[0.75rem] text-semantic-system-5 whitespace-pre-wrap leading-relaxed">{device.comment}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {editing && (
          <div className="px-4 py-3 border-t border-semantic-surface flex justify-end gap-2 flex-shrink-0 bg-white">
            <button onClick={handleCancel} className="px-4 py-1.5 text-[0.8125rem] text-[#666666] hover:text-semantic-text border border-[rgba(202,209,211,0.3)] hover:bg-[#F5F7F7] transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!form.name.trim()} className="px-4 py-1.5 text-[0.8125rem] text-white bg-core_palette-primary-1 hover:opacity-90 transition-opacity disabled:opacity-50">
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── linked ticket row ── */

function LinkedTicketRow({
  ticket, serviceLevels, onClick,
}: {
  ticket: AirtableRecord;
  serviceLevels: ServiceLevel[];
  onClick: () => void;
}) {
  const title = ticket.getCellValueAsString('Title');
  const status = ticket.getCellValueAsString('Status') as any;
  const slName = ticket.getCellValueAsString('Service Level');
  const assignee = ticket.getCellValueAsString('Assigned Person');
  const created = ticket.getCellValueAsString('Created Date');

  const ticketStatusColor = (TICKET_STATUS_COLORS as any)[status] || { bg: '#F2F4F8', text: '#616670' };
  const priorityColor = (PRIORITY_COLORS as any)[slName] || null;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-white border-b border-semantic-surface cursor-pointer transition-colors hover:bg-[#FAFBFB] first:border-t first:border-semantic-surface"
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
        <ConfirmationNumberIcon size={12} style={{ color: '#17E88F' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.75rem] font-medium text-semantic-text truncate">{title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {assignee && <span className="text-[0.625rem] text-semantic-system-7">{assignee}</span>}
          {created && <span className="text-[0.625rem] text-semantic-system-7">· {new Date(created).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {slName && priorityColor && (
          <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: priorityColor.bg, color: priorityColor.text }}>
            {slName}
          </span>
        )}
        {status && (
          <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: ticketStatusColor.bg, color: ticketStatusColor.text }}>
            {status}
          </span>
        )}
        <OpenInNewIcon size={12} className="text-semantic-system-7" />
      </div>
    </div>
  );
}

/* ── reusable widgets ── */

function SectionHeader({ icon, title }: { icon: React.ReactElement; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest leading-none">{title}</span>
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">{label}</p>
      <p className={`text-[0.75rem] text-semantic-text break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

/* ── single-record searchable combo box ── */

function SingleRecordComboBox({
  records,
  nameField,
  selectedId,
  onChange,
  placeholder,
}: {
  records: AirtableRecord[];
  nameField: string;
  selectedId: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allItems = useMemo(() =>
    records
      .map(r => ({ id: r.id, name: r.getCellValueAsString(nameField) }))
      .filter(r => r.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [records, nameField]
  );

  const selectedName = selectedId ? allItems.find(i => i.id === selectedId)?.name || '' : '';

  const filtered = useMemo(() => {
    if (!search) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(i => i.name.toLowerCase().includes(q));
  }, [allItems, search]);

  return (
    <div ref={ref} className="relative">
      {selectedId && selectedName ? (
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-flex items-center gap-1 px-1.5 h-[22px] text-[0.6875rem] font-medium" style={{ backgroundColor: '#E8F5E9', color: '#003F2D' }}>
            {selectedName}
            <button onClick={() => onChange(null)} className="hover:opacity-70" aria-label="Remove">
              <CloseIcon size={12} />
            </button>
          </span>
        </div>
      ) : null}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
          <SearchIcon size={13} className="text-semantic-system-7" />
        </div>
        <input
          type="text"
          placeholder={placeholder || 'Search...'}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-7 pr-2 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-0.5 w-full max-h-[200px] overflow-auto bg-white border border-semantic-surface shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[0.75rem] text-semantic-system-7">No results</div>
          ) : (
            filtered.map(i => {
              const isSel = i.id === selectedId;
              return (
                <button
                  key={i.id}
                  onClick={() => { onChange(i.id); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-1.5 text-[0.75rem] transition-colors hover:bg-[#F5F7F7] ${isSel ? 'bg-[#E8F5E9] font-medium' : ''}`}
                >
                  {i.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── multi-record searchable combo box (for Software) ── */

function MultiRecordComboBox({
  records,
  nameField,
  selectedIds,
  onChange,
  placeholder,
}: {
  records: AirtableRecord[];
  nameField: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allItems = useMemo(() =>
    records
      .map(r => ({ id: r.id, name: r.getCellValueAsString(nameField) }))
      .filter(r => r.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [records, nameField]
  );

  const selectedNames = selectedIds
    .map(id => allItems.find(i => i.id === id))
    .filter(Boolean)
    .map(i => i!);

  const filtered = useMemo(() => {
    if (!search) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(i => i.name.toLowerCase().includes(q));
  }, [allItems, search]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div ref={ref} className="relative">
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedNames.map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 px-1.5 h-[22px] text-[0.6875rem] font-medium" style={{ backgroundColor: '#E8F5E9', color: '#003F2D' }}>
              {s.name}
              <button onClick={() => onChange(selectedIds.filter(x => x !== s.id))} className="hover:opacity-70" aria-label={`Remove ${s.name}`}>
                <CloseIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
          <SearchIcon size={13} className="text-semantic-system-7" />
        </div>
        <input
          type="text"
          placeholder={placeholder || 'Search...'}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-7 pr-2 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-0.5 w-full max-h-[200px] overflow-auto bg-white border border-semantic-surface shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[0.75rem] text-semantic-system-7">No results</div>
          ) : (
            filtered.map(i => {
              const isSelected = selectedIds.includes(i.id);
              return (
                <button
                  key={i.id}
                  onClick={() => handleToggle(i.id)}
                  className={`w-full text-left px-3 py-1.5 text-[0.75rem] flex items-center gap-2 transition-colors hover:bg-[#F5F7F7] ${isSelected ? 'bg-[#E8F5E9]' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-7'}`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                  <span className="text-semantic-text truncate">{i.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
