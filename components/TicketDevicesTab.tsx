import React, { useState } from 'react';
import {
  AirtableRecord,
  Table,
  useUpdateRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { formatDateTime } from '../utils';
import { useLogHistory } from '../hooks/useEventBus';
import { useSnackbar } from './SnackbarProvider';
import { RoleGuard } from './RoleGuard';
import { AddIcon, CloseIcon, SearchIcon, DevicesIcon, DevicesOtherIcon, ArrowBackIcon } from './Icons';

const DEVICE_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Active': { bg: '#E6FCE8', text: '#006400', dot: '#048A0E' },
  'Decommissioned': { bg: '#FDE8E8', text: '#B10F41', dot: '#E81717' },
  'Planning': { bg: '#FFF8E1', text: '#AF6002', dot: '#FFBA05' },
  'Not Found': { bg: '#F3E8FF', text: '#6231AE', dot: '#7C37EF' },
};

const DEVICE_TYPE_COLORS: Record<string, string> = {
  'Router (Gateway)': '#166EE1',
  'Access Point': '#2E7D87',
  'Sensor': '#538184',
  'Controller': '#003F2D',
  'End Point': '#AF6002',
  'On Prem Server': '#032842',
  'Workstation': '#B10F41',
  'BMS Network Controller': '#7C37EF',
  'Lighting Network Controller': '#6B5CE7',
  'Fire Life Safety Device': '#E81717',
  'Virtual Server': '#1976D2',
  'UPS Battery Backup': '#538184',
  'UPS Battery Pack': '#538184',
  'Power Meter': '#006400',
};

export interface TicketDevicesTabProps {
  devices: AirtableRecord[];
  allDevices: AirtableRecord[];
  ticket: AirtableRecord;
  ticketsTable: Table;
  onRefresh: () => void;
}

export function TicketDevicesTab({ devices, allDevices, ticket, ticketsTable, onRefresh }: TicketDevicesTabProps) {
  const [selectedDevice, setSelectedDevice] = useState<AirtableRecord | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [linking, setLinking] = useState(false);
  const { mutate: updateTicket } = useUpdateRecord(ticketsTable);
  const { showSnackbar } = useSnackbar();
  const logHistory = useLogHistory();

  const linkedDeviceIds = new Set(devices.map(d => d.id));

  const searchResults = searchQuery.trim().length >= 2
    ? allDevices.filter(device => {
        if (linkedDeviceIds.has(device.id)) return false;
        const ip = device.getCellValueAsString('IP Address').toLowerCase();
        const mac = device.getCellValueAsString('MAC').toLowerCase();
        const query = searchQuery.trim().toLowerCase();
        return ip.includes(query) || mac.includes(query);
      }).slice(0, 20)
    : [];

  const handleLinkDevice = async (device: AirtableRecord) => {
    setLinking(true);
    try {
      const currentDeviceIds = getLinkedRecordIds(ticket.fields['Devices']);
      await updateTicket({
        recordId: ticket.id,
        fields: { Devices: [...currentDeviceIds, device.id], 'Last Modified': new Date().toISOString() },
      });
      await logHistory(
        ticket.id,
        `Device "${device.getCellValueAsString('Name')}" added`,
        'Device Added',
        undefined,
        device.getCellValueAsString('Name'),
        `IP: ${device.getCellValueAsString('IP Address') || 'N/A'} | Type: ${device.getCellValueAsString('Type') || 'N/A'}`,
      );
      showSnackbar(`Device "${device.getCellValueAsString('Name')}" linked to ticket`);
      setSearchQuery('');
      setShowSearch(false);
      onRefresh();
    } catch {
      showSnackbar('Failed to link device', 'error');
    } finally {
      setLinking(false);
    }
  };

  if (selectedDevice) {
    return <DeviceDetailView device={selectedDevice} onBack={() => setSelectedDevice(null)} />;
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
          Linked Devices
          {devices.length > 0 && (
            <span className="inline-block ml-2 px-1 h-[18px] text-[0.625rem] font-mono bg-[#F2F4F8] text-[#666666] leading-[18px]">
              {devices.length}
            </span>
          )}
        </span>
        {!showSearch && (
          <RoleGuard permission="tickets.devices.create">
            <button
              onClick={() => setShowSearch(true)}
              className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 hover:opacity-80 min-h-[28px]"
            >
              <AddIcon size={14} />
              Add Device
            </button>
          </RoleGuard>
        )}
      </div>

      {showSearch && (
        <div className="mb-4 border border-[rgba(202,209,211,0.3)] bg-[#FAFBFB]">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.75rem] font-semibold text-semantic-text">Search by IP or MAC Address</span>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-0.5 text-[#666666] hover:text-semantic-text">
                <CloseIcon size={14} />
              </button>
            </div>
            <div className="relative">
              <SearchIcon size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgba(67,82,84,0.5)]" />
              <input
                type="text"
                placeholder="Enter IP address or MAC address..."
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-[0.8125rem] font-mono border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
              />
            </div>
          </div>

          {searchQuery.trim().length >= 2 && (
            <div className="max-h-60 overflow-y-auto border-t border-[rgba(202,209,211,0.3)]">
              {searchResults.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[0.75rem] text-[rgba(67,82,84,0.5)]">No devices found matching "{searchQuery.trim()}"</p>
                </div>
              ) : (
                searchResults.map(device => (
                  <DeviceSearchResult key={device.id} device={device} onLink={() => handleLinkDevice(device)} linking={linking} />
                ))
              )}
            </div>
          )}

          {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
            <div className="py-4 text-center border-t border-[rgba(202,209,211,0.3)]">
              <p className="text-[0.75rem] text-[rgba(67,82,84,0.5)]">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      )}

      {devices.length === 0 && !showSearch ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-[rgba(202,209,211,0.5)] mb-4">
            <DevicesIcon size={40} />
          </div>
          <h3 className="text-[1rem] font-semibold text-semantic-text mb-1.5">No devices linked</h3>
          <p className="text-[0.875rem] text-[#666666] max-w-[280px] leading-normal mb-4">No hardware or network devices are associated with this ticket.</p>
          <RoleGuard permission="tickets.devices.create">
            <button
              onClick={() => setShowSearch(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] transition-colors"
            >
              <AddIcon size={14} />
              Add Device
            </button>
          </RoleGuard>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {devices.map(device => (
            <DeviceCard key={device.id} device={device} onSelect={() => setSelectedDevice(device)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceSearchResult({ device, onLink, linking }: { device: AirtableRecord; onLink: () => void; linking: boolean }) {
  const name = device.getCellValueAsString('Name');
  const type = device.getCellValueAsString('Type');
  const status = device.getCellValueAsString('Status');
  const ipAddress = device.getCellValueAsString('IP Address');
  const mac = device.getCellValueAsString('MAC');
  const tag = device.getCellValueAsString('Tag');
  const building = device.getCellValueAsString('Building Name');

  const statusColor = DEVICE_STATUS_COLORS[status] || DEVICE_STATUS_COLORS['Active'];
  const typeColor = DEVICE_TYPE_COLORS[type] || '#999';

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-[rgba(202,209,211,0.3)] last:border-b-0 hover:bg-[#F0F3F3] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <DevicesOtherIcon size={14} className="flex-shrink-0" style={{ color: typeColor }} />
          <span className="text-[0.75rem] font-semibold text-semantic-text truncate">{name}</span>
          <span className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.55rem] font-semibold flex-shrink-0" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-5">
          {type && (
            <span className="inline-block px-1 py-0.5 text-[0.55rem] font-medium" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>{type}</span>
          )}
          {tag && <span className="font-mono text-[0.6rem] text-[#666666]">{tag}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-5 mt-0.5">
          {ipAddress && <span className="font-mono text-[0.6rem] text-[rgba(67,82,84,0.5)]">IP: {ipAddress}</span>}
          {mac && <span className="font-mono text-[0.6rem] text-[rgba(67,82,84,0.5)]">MAC: {mac}</span>}
          {building && <span className="text-[0.6rem] text-[rgba(67,82,84,0.5)]">{building}</span>}
        </div>
      </div>
      <button
        onClick={onLink}
        disabled={linking}
        className="flex-shrink-0 px-2 py-1 text-[0.625rem] border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] disabled:opacity-50 min-w-[48px] min-h-[28px] transition-colors"
      >
        {linking ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-core_palette-primary-1 border-t-transparent rounded-full animate-spin" />
        ) : 'Link'}
      </button>
    </div>
  );
}

function DeviceCard({ device, onSelect }: { device: AirtableRecord; onSelect: () => void }) {
  const nameAttrs = useInspectAttrs(device, 'Name');
  const name = device.getCellValueAsString('Name');
  const tag = device.getCellValueAsString('Tag');
  const type = device.getCellValueAsString('Type');
  const status = device.getCellValueAsString('Status');
  const ipAddress = device.getCellValueAsString('IP Address');
  const building = device.getCellValueAsString('Building Name');

  const statusColor = DEVICE_STATUS_COLORS[status] || DEVICE_STATUS_COLORS['Active'];
  const typeColor = DEVICE_TYPE_COLORS[type] || '#999';

  return (
    <button
      onClick={onSelect}
      className="block w-full text-left p-3 bg-[#F5F7F7] border border-[rgba(202,209,211,0.3)] cursor-pointer hover:border-core_palette-primary-1 hover:bg-[#EFF3F3] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <DevicesOtherIcon size={16} className="flex-shrink-0" style={{ color: typeColor }} />
          <span {...nameAttrs} className="text-[0.8125rem] font-semibold text-semantic-text truncate">{name}</span>
        </div>
        <span className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.6rem] font-semibold flex-shrink-0" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
          {status}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap ml-6 mb-1">
        {type && (
          <span className="inline-block px-1 py-0.5 text-[0.6rem] font-medium" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>{type}</span>
        )}
        {tag && <span className="font-mono text-[0.6875rem] text-[#666666]">{tag}</span>}
      </div>
      <div className="flex items-center gap-3 ml-6">
        {ipAddress && <span className="font-mono text-[0.625rem] text-[rgba(67,82,84,0.5)]">{ipAddress}</span>}
        {building && (
          <>
            {ipAddress && <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">•</span>}
            <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">{building}</span>
          </>
        )}
      </div>
    </button>
  );
}

function DeviceDetailView({ device, onBack }: { device: AirtableRecord; onBack: () => void }) {
  const nameAttrs = useInspectAttrs(device, 'Name');
  const name = device.getCellValueAsString('Name');
  const tag = device.getCellValueAsString('Tag');
  const type = device.getCellValueAsString('Type');
  const status = device.getCellValueAsString('Status');
  const ipAddress = device.getCellValueAsString('IP Address');
  const building = device.getCellValueAsString('Building Name');
  const department = device.getCellValueAsString('Department');
  const serviceLine = device.getCellValueAsString('Service Line');
  const businessUnit = device.getCellValueAsString('Business Unit');
  const bacnetId = device.getCellValueAsString('BacNet ID');
  const defaultGateway = device.getCellValueAsString('Default Gateway');
  const comment = device.getCellValueAsString('comment');
  const product = device.getCellValueAsString('Product');
  const software = device.getCellValueAsString('Software');
  const issues = device.getCellValueAsString('Issues');
  const created = device.getCellValueAsString('Created');

  const statusColor = DEVICE_STATUS_COLORS[status] || DEVICE_STATUS_COLORS['Active'];
  const typeColor = DEVICE_TYPE_COLORS[type] || '#999';

  const fields: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Tag', value: tag, mono: true },
    { label: 'IP Address', value: ipAddress, mono: true },
    { label: 'Default Gateway', value: defaultGateway, mono: true },
    { label: 'BacNet ID', value: bacnetId, mono: true },
    { label: 'Building', value: building },
    { label: 'Department', value: department },
    { label: 'Service Line', value: serviceLine },
    { label: 'Business Unit', value: businessUnit },
    { label: 'Product', value: product },
    { label: 'Software', value: software },
    { label: 'Created', value: created ? formatDateTime(created) : '' },
  ].filter(f => f.value);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[rgba(202,209,211,0.3)] bg-[#F5F7F7]">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 mb-1.5 -ml-1.5 hover:opacity-80">
          <ArrowBackIcon size={14} />
          Back to devices
        </button>
        <div className="flex items-center gap-2 mb-1.5">
          <DevicesOtherIcon size={18} style={{ color: typeColor }} />
          <h3 {...nameAttrs} className="text-[1rem] text-semantic-text leading-tight">{name}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.6rem] font-semibold" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
            {status}
          </span>
          {type && (
            <span className="inline-block px-1 py-0.5 text-[0.6rem] font-medium" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>{type}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-3 mb-5">
          {fields.map(f => (
            <div key={f.label}>
              <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">{f.label}</span>
              <p className={`text-[0.8125rem] text-semantic-text break-all ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
            </div>
          ))}
        </div>

        {issues && (
          <div className="mb-5">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1.5">Known Issues</span>
            <div className="bg-[#FFF8E1] border border-[#FFE082] p-3">
              <p className="text-[0.8125rem] text-[#AF6002] leading-normal">{issues}</p>
            </div>
          </div>
        )}

        {comment && (
          <div className="mb-4">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1.5">Comments</span>
            <p className="text-[0.8125rem] text-[#666666] leading-relaxed whitespace-pre-wrap bg-[#F5F7F7] p-3 border border-[rgba(202,209,211,0.15)]">{comment}</p>
          </div>
        )}
      </div>
    </div>
  );
}
