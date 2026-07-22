import React, { useState, useMemo } from 'react';
import {
  AppsIcon,
  ComputerIcon,
  PhoneIphoneIcon,
  CloudIcon,
  SettingsIcon,
  GridViewIcon,
  TableChartIcon,
  HelpOutlineIcon,
  SearchIcon,
  CloseIcon,
  CheckCircleIcon,
  CancelIcon,
  InfoOutlinedIcon,
  ContactPhoneIcon,
  SecurityIcon,
  DevicesIcon,
  OpenInNewIcon,
  LinkIcon,
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
import { useSnackbar } from '../components/SnackbarProvider';
import { RoleGuard, useHasPermission } from '../components/RoleGuard';

/* ── constants ── */

const SOFTWARE_TYPE_CHOICES = [
  'Desktop Application',
  'Mobile Application',
  'SaaS/Cloud Application',
  'System Application',
  'Airtable Tool',
  'Smartsheet Tool',
  'Excel Tool',
  'Unknown',
];

const SOFTWARE_TYPE_ICONS: Record<string, React.ReactElement> = {
  'Desktop Application': <ComputerIcon size={16} style={{ color: '#17E88F' }} />,
  'Mobile Application': <PhoneIphoneIcon size={16} style={{ color: '#17E88F' }} />,
  'SaaS/Cloud Application': <CloudIcon size={16} style={{ color: '#17E88F' }} />,
  'System Application': <SettingsIcon size={16} style={{ color: '#17E88F' }} />,
  'Airtable Tool': <GridViewIcon size={16} style={{ color: '#17E88F' }} />,
  'Smartsheet Tool': <TableChartIcon size={16} style={{ color: '#17E88F' }} />,
  'Excel Tool': <TableChartIcon size={16} style={{ color: '#17E88F' }} />,
  'Unknown': <HelpOutlineIcon size={16} style={{ color: '#17E88F' }} />,
};

const SOFTWARE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Active': { bg: '#E6FCE8', text: '#006400' },
  'Not Active': { bg: '#FDECEF', text: '#9B1C31' },
};

const COMPLIANCE_COLORS: Record<string, { bg: string; text: string }> = {
  'Compliant': { bg: '#E6FCE8', text: '#006400' },
  'Not Compliant': { bg: '#FDECEF', text: '#9B1C31' },
  'Unknown': { bg: '#FFF8E6', text: '#8B6914' },
};

const DEVICE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Active': { bg: '#E6FCE8', text: '#006400' },
  'Decommissioned': { bg: '#FDECEF', text: '#9B1C31' },
  'Planning': { bg: '#FFF8E6', text: '#8B6914' },
  'Not Found': { bg: '#F5E6F9', text: '#7B2D8E' },
};

/* ── shared form state shape ── */

interface SoftwareFormState {
  name: string;
  vendorIds: string[];
  softwareTypes: string[];
  status: string;
  serviceIds: string[];
  website: string;
  phone: string;
  email: string;
  url: string;
  passwordPolicy: string;
  passwordCompliant: string;
  accessType: string;
  dashlane: boolean;
  notes: string;
}

const EMPTY_FORM: SoftwareFormState = {
  name: '',
  vendorIds: [],
  softwareTypes: [],
  status: 'Active',
  serviceIds: [],
  website: '',
  phone: '',
  email: '',
  url: '',
  passwordPolicy: '',
  passwordCompliant: '',
  accessType: '',
  dashlane: false,
  notes: '',
};

/* ── form styling ── */

const inputCls = "w-full px-2 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white";
const selectCls = "w-full px-2 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white";
const labelCls = "text-[0.625rem] text-semantic-system-7 mb-0.5 block";

/* ── SoftwareNode ── */

interface SoftwareNode {
  id: string;
  record: AirtableRecord;
  name: string;
  vendor: string;
  vendorIds: string[];
  website: string;
  phone: string;
  email: string;
  url: string;
  softwareType: string;
  softwareTypes: string[];
  status: string;
  passwordPolicy: string;
  passwordCompliant: string;
  accessType: string;
  dashlane: boolean;
  notes: string;
  services: string;
  serviceIds: string[];
  deviceIds: string[];
  deviceCount: number;
}

function nodeToForm(n: SoftwareNode): SoftwareFormState {
  return {
    name: n.name,
    vendorIds: n.vendorIds,
    softwareTypes: n.softwareTypes,
    status: n.status,
    serviceIds: n.serviceIds,
    website: n.website,
    phone: n.phone,
    email: n.email,
    url: n.url,
    passwordPolicy: n.passwordPolicy,
    passwordCompliant: n.passwordCompliant,
    accessType: n.accessType,
    dashlane: n.dashlane,
    notes: n.notes,
  };
}

/* ── page ── */

interface SoftwarePageProps {
  softwareTable: Table;
  deviceRecords: AirtableRecord[];
  serviceDeptRecords: AirtableRecord[];
  vendorRecords: AirtableRecord[];
  onOpenDevice?: (device: AirtableRecord) => void;
}

export function SoftwarePage({ softwareTable, deviceRecords, serviceDeptRecords, vendorRecords, onOpenDevice }: SoftwarePageProps) {
  const { records: softwareRecords, loading } = useRecords(softwareTable);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareNode | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const softwareNodes: SoftwareNode[] = useMemo(() =>
    softwareRecords.map(r => {
      const typeVal = r.getCellValue('Software Type') as any;
      const typeNames: string[] = Array.isArray(typeVal)
        ? typeVal.map((t: any) => (typeof t === 'string' ? t : t?.name || '')).filter(Boolean)
        : [];
      return {
        id: r.id,
        record: r,
        name: r.getCellValueAsString('Name'),
        vendor: r.getCellValueAsString('Vendor'),
        vendorIds: getLinkedRecordIds(r.getCellValue('Vendor') as any),
        website: r.getCellValueAsString('Website'),
        phone: r.getCellValueAsString('Phone'),
        email: r.getCellValueAsString('Email'),
        url: r.getCellValueAsString('URL'),
        softwareType: typeNames.join(', '),
        softwareTypes: typeNames,
        status: r.getCellValueAsString('Status'),
        passwordPolicy: r.getCellValueAsString('Password Policy'),
        passwordCompliant: r.getCellValueAsString('Password Compliant'),
        accessType: r.getCellValueAsString('Access Type'),
        dashlane: !!r.getCellValue('Dashlane'),
        notes: r.getCellValueAsString('Notes'),
        services: r.getCellValueAsString('Services'),
        serviceIds: getLinkedRecordIds(r.getCellValue('Services') as any),
        deviceIds: getLinkedRecordIds((r as any).fields?.['Device']),
        deviceCount: getLinkedRecordIds((r as any).fields?.['Device']).length,
      };
    }).filter(n => n.name).sort((a, b) => a.name.localeCompare(b.name)),
    [softwareRecords]
  );

  const types = useMemo(() => {
    const set = new Set<string>();
    softwareNodes.forEach(n => { n.softwareTypes.forEach(t => set.add(t)); });
    return Array.from(set).sort();
  }, [softwareNodes]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    softwareNodes.forEach(n => { if (n.status) set.add(n.status); });
    return Array.from(set).sort();
  }, [softwareNodes]);

  const filteredSoftware = useMemo(() =>
    softwareNodes.filter(s => {
      if (typeFilter && !s.softwareTypes.includes(typeFilter)) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [s.name, s.vendor, s.softwareType, s.accessType, s.passwordPolicy, s.services].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    }),
    [softwareNodes, typeFilter, statusFilter, search]
  );

  const activeCount = softwareNodes.filter(s => s.status === 'Active').length;
  const totalCount = softwareNodes.length;

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AppsIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Software</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {activeCount} active
            </span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium bg-semantic-surface text-semantic-system-5">
              {totalCount} total
            </span>
          </div>
          <RoleGuard permission="software.create">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.6875rem] font-medium text-white bg-core_palette-primary-1 hover:opacity-90 transition-opacity"
            >
              <AddIcon size={14} />
              New Software
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
              placeholder="Search software..."
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
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1">
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1">
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(typeFilter || statusFilter || search) && (
            <button onClick={() => { setTypeFilter(''); setStatusFilter(''); setSearch(''); }} className="inline-flex items-center gap-0.5 px-1.5 h-[22px] text-[0.6875rem] bg-semantic-surface text-semantic-system-5 hover:bg-core_palette-primary-6">
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
        ) : filteredSoftware.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3" style={{ backgroundColor: '#003F2D' }}>
              <AppsIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">
              {softwareNodes.length === 0 ? 'No software found' : 'No software matches your filters'}
            </p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              {softwareNodes.length === 0
                ? 'Software will appear here once it is added to the system.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[120px]">Vendor</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[140px]">Type</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Status</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[110px]">Access</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[110px]">Password</th>
                <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[60px]">Devs</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredSoftware.map(node => (
                <SoftwareRow key={node.id} node={node} onClick={() => setSelectedSoftware(node)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={7} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {filteredSoftware.length} of {totalCount} software
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {selectedSoftware && (
        <SoftwareDetailDrawer
          software={selectedSoftware}
          softwareTable={softwareTable}
          deviceRecords={deviceRecords}
          serviceDeptRecords={serviceDeptRecords}
          vendorRecords={vendorRecords}
          onOpenDevice={onOpenDevice}
          onClose={() => setSelectedSoftware(null)}
        />
      )}

      {showCreate && (
        <SoftwareCreateDrawer
          softwareTable={softwareTable}
          serviceDeptRecords={serviceDeptRecords}
          vendorRecords={vendorRecords}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

/* ── table row ── */

function SoftwareRow({ node, onClick }: { node: SoftwareNode; onClick: () => void }) {
  const nameAttrs = useInspectAttrs(node.record, 'Name');
  const vendorAttrs = useInspectAttrs(node.record, 'Vendor');
  const typeAttrs = useInspectAttrs(node.record, 'Software Type');
  const statusAttrs = useInspectAttrs(node.record, 'Status');
  const accessAttrs = useInspectAttrs(node.record, 'Access Type');
  const policyAttrs = useInspectAttrs(node.record, 'Password Policy');

  const isInactive = node.status === 'Not Active';
  const firstType = node.softwareTypes[0] || '';
  const icon = SOFTWARE_TYPE_ICONS[firstType] || <AppsIcon size={16} style={{ color: '#17E88F' }} />;
  const statusColor = SOFTWARE_STATUS_COLORS[node.status] || { bg: '#F2F4F8', text: '#616670' };

  return (
    <tr
      onClick={onClick}
      className="border-b border-semantic-surface cursor-pointer transition-colors hover:bg-[#FAFBFB]"
      style={{ opacity: isInactive ? 0.55 : 1 }}
    >
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isInactive ? '#CAD1D3' : '#003F2D' }}>
            {isInactive ? <AppsIcon size={14} style={{ color: '#FFFFFF' }} /> : icon}
          </div>
          <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate">{node.name}</span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...vendorAttrs} className={`text-[0.6875rem] truncate block ${node.vendor ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>{node.vendor || '—'}</span>
      </td>
      <td className="py-1.5 px-2">
        <span {...typeAttrs} className={`text-[0.6875rem] truncate block ${firstType ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>{firstType || '—'}</span>
      </td>
      <td className="py-1.5 px-2" {...statusAttrs}>
        {node.status ? (
          <span className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>{node.status}</span>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">—</span>
        )}
      </td>
      <td className="py-1.5 px-2">
        <span {...accessAttrs} className={`text-[0.6875rem] truncate block ${node.accessType ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>{node.accessType || '—'}</span>
      </td>
      <td className="py-1.5 px-2">
        <span {...policyAttrs} className={`text-[0.6875rem] truncate block ${node.passwordPolicy ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>{node.passwordPolicy || '—'}</span>
      </td>
      <td className="py-1.5 px-2 pr-4 text-center">
        <span className="text-[0.6875rem] font-mono text-semantic-text">{node.deviceCount}</span>
      </td>
    </tr>
  );
}

/* ── shared form body (used by both edit and create) ── */

function SoftwareFormBody({
  form,
  setForm,
  vendorRecords,
  serviceDeptRecords,
}: {
  form: SoftwareFormState;
  setForm: React.Dispatch<React.SetStateAction<SoftwareFormState>>;
  vendorRecords: AirtableRecord[];
  serviceDeptRecords: AirtableRecord[];
}) {
  return (
    <>
      <SectionHeader icon={<InfoOutlinedIcon size={14} style={{ color: '#003F2D' }} />} title="General Information" />
      <DetailGrid>
        <div>
          <label className={labelCls}>Name *</label>
          <input value={form.name} onChange={(e: any) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Software name" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={(e: any) => setForm(f => ({ ...f, status: e.target.value }))} className={selectCls}>
            <option value="">—</option>
            <option value="Active">Active</option>
            <option value="Not Active">Not Active</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Vendor</label>
          <SingleRecordComboBox
            records={vendorRecords}
            nameField="Name"
            selectedId={form.vendorIds[0] || null}
            onChange={(id) => setForm(f => ({ ...f, vendorIds: id ? [id] : [] }))}
            placeholder="Search vendors..."
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Software Type</label>
          <MultiSelectCheckboxes
            choices={SOFTWARE_TYPE_CHOICES}
            selected={form.softwareTypes}
            onChange={(types) => setForm(f => ({ ...f, softwareTypes: types }))}
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Services</label>
          <ServiceComboBox
            serviceDeptRecords={serviceDeptRecords}
            selectedIds={form.serviceIds}
            onChange={(ids) => setForm(f => ({ ...f, serviceIds: ids }))}
          />
        </div>
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<ContactPhoneIcon size={14} style={{ color: '#003F2D' }} />} title="Vendor Contact" />
      <DetailGrid>
        <div>
          <label className={labelCls}>Website</label>
          <input value={form.website} onChange={(e: any) => setForm(f => ({ ...f, website: e.target.value }))} className={inputCls} placeholder="www.example.com" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={form.phone} onChange={(e: any) => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="Phone number" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input value={form.email} onChange={(e: any) => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="support@example.com" />
        </div>
        <div>
          <label className={labelCls}>URL</label>
          <input value={form.url} onChange={(e: any) => setForm(f => ({ ...f, url: e.target.value }))} className={inputCls} placeholder="https://..." />
        </div>
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<SecurityIcon size={14} style={{ color: '#003F2D' }} />} title="Access & Security" />
      <DetailGrid>
        <div>
          <label className={labelCls}>Password Policy</label>
          <select value={form.passwordPolicy} onChange={(e: any) => setForm(f => ({ ...f, passwordPolicy: e.target.value }))} className={selectCls}>
            <option value="">—</option>
            <option value="Nike SSO">Nike SSO</option>
            <option value="CBRE SSO">CBRE SSO</option>
            <option value="Individual Credentials">Individual Credentials</option>
            <option value="Shared Credentials">Shared Credentials</option>
            <option value="None">None</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Password Compliant</label>
          <select value={form.passwordCompliant} onChange={(e: any) => setForm(f => ({ ...f, passwordCompliant: e.target.value }))} className={selectCls}>
            <option value="">—</option>
            <option value="Compliant">Compliant</option>
            <option value="Not Compliant">Not Compliant</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Access Type</label>
          <select value={form.accessType} onChange={(e: any) => setForm(f => ({ ...f, accessType: e.target.value }))} className={selectCls}>
            <option value="">—</option>
            <option value="All">All</option>
            <option value="All CBRE">All CBRE</option>
            <option value="All Nike">All Nike</option>
            <option value="Select Users">Select Users</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Dashlane</label>
          <label className="flex items-center gap-2 mt-1 cursor-pointer">
            <input type="checkbox" checked={form.dashlane} onChange={(e: any) => setForm(f => ({ ...f, dashlane: e.target.checked }))} className="w-4 h-4 accent-core_palette-primary-1" />
            <span className="text-[0.75rem] text-semantic-text">{form.dashlane ? 'Yes' : 'No'}</span>
          </label>
        </div>
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<HelpOutlineIcon size={14} style={{ color: '#003F2D' }} />} title="Notes" />
      <textarea
        value={form.notes}
        onChange={(e: any) => setForm(f => ({ ...f, notes: e.target.value }))}
        rows={4}
        className="w-full px-3 py-2 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors resize-none bg-white"
        placeholder="Add notes..."
      />
    </>
  );
}

/* ── helper: build Airtable fields payload from form ── */

function formToFields(form: SoftwareFormState): Record<string, any> {
  return {
    Name: form.name,
    Vendor: form.vendorIds.map(id => ({ id })),
    'Software Type': form.softwareTypes.length > 0 ? form.softwareTypes.map(name => ({ name })) : [],
    Status: form.status || null,
    Services: form.serviceIds.map(id => ({ id })),
    Website: form.website,
    Phone: form.phone,
    Email: form.email,
    URL: form.url,
    'Password Policy': form.passwordPolicy || null,
    'Password Compliant': form.passwordCompliant || null,
    'Access Type': form.accessType || null,
    Dashlane: form.dashlane,
    Notes: form.notes,
  };
}

/* ── create drawer ── */

function SoftwareCreateDrawer({
  softwareTable,
  serviceDeptRecords,
  vendorRecords,
  onClose,
}: {
  softwareTable: Table;
  serviceDeptRecords: AirtableRecord[];
  vendorRecords: AirtableRecord[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<SoftwareFormState>({ ...EMPTY_FORM });
  const { mutate: createRecord } = useCreateRecord(softwareTable);
  const { showSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createRecord({ fields: formToFields(form) });
      showSnackbar('Software created');
      onClose();
    } catch {
      showSnackbar('Failed to create software', 'error');
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
            <AppsIcon size={16} style={{ color: '#17E88F' }} />
            <span className="text-[0.8125rem] font-semibold font-sans">New Software</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4">
          <SoftwareFormBody form={form} setForm={setForm} vendorRecords={vendorRecords} serviceDeptRecords={serviceDeptRecords} />
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
            {saving ? 'Creating...' : 'Create Software'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── detail / edit drawer ── */

function SoftwareDetailDrawer({
  software, softwareTable, deviceRecords, serviceDeptRecords, vendorRecords, onOpenDevice, onClose,
}: {
  software: SoftwareNode;
  softwareTable: Table;
  deviceRecords: AirtableRecord[];
  serviceDeptRecords: AirtableRecord[];
  vendorRecords: AirtableRecord[];
  onOpenDevice?: (device: AirtableRecord) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SoftwareFormState>(nodeToForm(software));
  const { mutate: updateRecord } = useUpdateRecord(softwareTable);
  const { showSnackbar } = useSnackbar();
  const canEdit = useHasPermission('software.edit');

  const statusColor = SOFTWARE_STATUS_COLORS[editing ? form.status : software.status] || { bg: '#F2F4F8', text: '#616670' };
  const firstType = software.softwareTypes[0] || '';
  const icon = SOFTWARE_TYPE_ICONS[firstType] || <AppsIcon size={20} style={{ color: '#17E88F' }} />;

  const linkedDevices = useMemo(() =>
    software.deviceIds.map(id => deviceRecords.find(d => d.id === id)).filter((d): d is AirtableRecord => !!d),
    [software.deviceIds, deviceRecords]
  );

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      await updateRecord({ recordId: software.id, fields: formToFields(form) });
      showSnackbar('Software updated');
      setEditing(false);
      onClose();
    } catch {
      showSnackbar('Failed to update software', 'error');
    }
  };

  const handleCancel = () => {
    setForm(nodeToForm(software));
    setEditing(false);
  };

  const displayStatus = editing ? form.status : software.status;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <AppsIcon size={16} style={{ color: '#17E88F' }} />
            <span className="text-[0.8125rem] font-semibold font-sans">Software Details</span>
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
          {/* Identity banner */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-semantic-surface">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: displayStatus === 'Not Active' ? '#CAD1D3' : '#003F2D' }}>
              {displayStatus === 'Not Active' ? <AppsIcon size={20} style={{ color: '#FFFFFF' }} /> : icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.875rem] font-semibold text-semantic-text">{editing ? form.name : software.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {software.vendor && <span className="text-[0.625rem] text-semantic-system-5">{software.vendor}</span>}
                {software.softwareTypes.map(t => (
                  <span key={t} className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: '#E8F5E9', color: '#003F2D' }}>{t}</span>
                ))}
                {displayStatus && (
                  <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>{displayStatus}</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            {editing ? (
              <SoftwareFormBody form={form} setForm={setForm} vendorRecords={vendorRecords} serviceDeptRecords={serviceDeptRecords} />
            ) : (
              <>
                <SectionHeader icon={<InfoOutlinedIcon size={14} style={{ color: '#003F2D' }} />} title="General Information" />
                <DetailGrid>
                  <DetailField label="Name" value={software.name} />
                  <DetailField label="Vendor" value={software.vendor} />
                  <DetailField label="Software Type" value={software.softwareType} />
                  <DetailField label="Status" value={software.status} />
                  <ServicesList serviceIds={software.serviceIds} serviceDeptRecords={serviceDeptRecords} />
                </DetailGrid>

                <hr className="my-3 border-semantic-surface" />

                <SectionHeader icon={<ContactPhoneIcon size={14} style={{ color: '#003F2D' }} />} title="Vendor Contact" />
                <DetailGrid>
                  <DetailField label="Website" value={software.website} />
                  <DetailField label="Phone" value={software.phone} />
                  <DetailField label="Email" value={software.email} />
                  {software.url && (
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">URL</p>
                      <a
                        href={software.url.startsWith('http') ? software.url : `https://${software.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[0.75rem] underline break-all inline-flex items-center gap-1 text-core_palette-primary-1 hover:text-core_palette-primary-2"
                      >
                        {software.url}
                        <LinkIcon size={12} />
                      </a>
                    </div>
                  )}
                </DetailGrid>

                <hr className="my-3 border-semantic-surface" />

                <SectionHeader icon={<SecurityIcon size={14} style={{ color: '#003F2D' }} />} title="Access & Security" />
                <DetailGrid>
                  <DetailField label="Password Policy" value={software.passwordPolicy} />
                  {software.passwordCompliant && (
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Password Compliant</p>
                      <span
                        className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium"
                        style={{
                          backgroundColor: (COMPLIANCE_COLORS[software.passwordCompliant] || { bg: '#F2F4F8' }).bg,
                          color: (COMPLIANCE_COLORS[software.passwordCompliant] || { text: '#616670' }).text,
                        }}
                      >
                        {software.passwordCompliant}
                      </span>
                    </div>
                  )}
                  <DetailField label="Access Type" value={software.accessType} />
                  <div>
                    <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Dashlane</p>
                    <div className="flex items-center gap-1">
                      {software.dashlane
                        ? <CheckCircleIcon size={14} style={{ color: '#006400' }} />
                        : <CancelIcon size={14} style={{ color: '#9B1C31' }} />
                      }
                      <span className="text-[0.75rem] text-semantic-text">{software.dashlane ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </DetailGrid>

                {linkedDevices.length > 0 && (
                  <>
                    <hr className="my-3 border-semantic-surface" />
                    <SectionHeader icon={<DevicesIcon size={14} style={{ color: '#003F2D' }} />} title={`Devices (${linkedDevices.length})`} />
                    <div className="flex flex-col">
                      {linkedDevices.map(device => (
                        <LinkedDeviceRow key={device.id} device={device} onClick={() => onOpenDevice?.(device)} />
                      ))}
                    </div>
                  </>
                )}

                <hr className="my-3 border-semantic-surface" />
                <SectionHeader icon={<HelpOutlineIcon size={14} style={{ color: '#003F2D' }} />} title="Notes" />
                {software.notes ? (
                  <div className="bg-[#F5F7F7] px-3 py-2">
                    <p className="text-[0.75rem] text-semantic-system-5 whitespace-pre-wrap leading-relaxed">{software.notes}</p>
                  </div>
                ) : (
                  <p className="text-[0.75rem] text-semantic-system-7">No notes</p>
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

/* ── linked device row ── */

function LinkedDeviceRow({ device, onClick }: { device: AirtableRecord; onClick: () => void }) {
  const name = device.getCellValueAsString('Name');
  const type = device.getCellValueAsString('Type');
  const status = device.getCellValueAsString('Status');
  const ipAddress = device.getCellValueAsString('IP Address');
  const deviceStatusColor = DEVICE_STATUS_COLORS[status] || { bg: '#F2F4F8', text: '#616670' };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-white border-b border-semantic-surface cursor-pointer transition-colors hover:bg-[#FAFBFB] first:border-t first:border-semantic-surface"
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
        <DevicesIcon size={12} style={{ color: '#17E88F' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.75rem] font-medium text-semantic-text truncate">{name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {type && <span className="text-[0.625rem] text-semantic-system-7">{type}</span>}
          {ipAddress && <span className="text-[0.625rem] text-semantic-system-7 font-mono">· {ipAddress}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {status && (
          <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: deviceStatusColor.bg, color: deviceStatusColor.text }}>{status}</span>
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

function ServicesList({ serviceIds, serviceDeptRecords }: { serviceIds: string[]; serviceDeptRecords: AirtableRecord[] }) {
  if (serviceIds.length === 0) return null;
  const names = serviceIds
    .map(id => serviceDeptRecords.find(r => r.id === id))
    .filter(Boolean)
    .map(r => r!.getCellValueAsString('Name'));
  if (names.length === 0) return null;
  return (
    <div className="col-span-2">
      <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Services</p>
      <div className="flex flex-wrap gap-1">
        {names.map((name, i) => (
          <span key={i} className="inline-flex items-center px-1.5 h-[20px] text-[0.6875rem] font-medium" style={{ backgroundColor: '#E8F5E9', color: '#003F2D' }}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── single-record searchable combo box (for Vendor) ── */

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

/* ── multi-select checkboxes (for Software Type) ── */

function MultiSelectCheckboxes({
  choices,
  selected,
  onChange,
}: {
  choices: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (choice: string) => {
    if (selected.includes(choice)) {
      onChange(selected.filter(s => s !== choice));
    } else {
      onChange([...selected, choice]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {choices.map(choice => {
        const isSel = selected.includes(choice);
        return (
          <button
            key={choice}
            type="button"
            onClick={() => toggle(choice)}
            className={`inline-flex items-center gap-1 px-1.5 h-[24px] text-[0.6875rem] border transition-colors ${
              isSel
                ? 'border-core_palette-primary-1 bg-[#E8F5E9] text-core_palette-primary-3 font-medium'
                : 'border-[rgba(202,209,211,0.3)] bg-white text-semantic-system-5 hover:bg-[#F5F7F7]'
            }`}
          >
            <div className={`w-3 h-3 border flex-shrink-0 flex items-center justify-center ${isSel ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-7'}`}>
              {isSel && (
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </div>
            {choice}
          </button>
        );
      })}
    </div>
  );
}

/* ── services multi-select combo box ── */

function ServiceComboBox({
  serviceDeptRecords,
  selectedIds,
  onChange,
}: {
  serviceDeptRecords: AirtableRecord[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
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

  const allServices = useMemo(() =>
    serviceDeptRecords
      .map(r => ({ id: r.id, name: r.getCellValueAsString('Name'), dept: r.getCellValueAsString('Department') }))
      .filter(s => s.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [serviceDeptRecords]
  );

  const filtered = useMemo(() => {
    if (!search) return allServices;
    const q = search.toLowerCase();
    return allServices.filter(s =>
      s.name.toLowerCase().includes(q) || s.dept.toLowerCase().includes(q)
    );
  }, [allServices, search]);

  const selectedNames = selectedIds
    .map(id => allServices.find(s => s.id === id))
    .filter(Boolean)
    .map(s => s!);

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
          placeholder="Search services..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-7 pr-2 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] focus:outline-none focus:border-core_palette-primary-1 transition-colors bg-white"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-0.5 w-full max-h-[200px] overflow-auto bg-white border border-semantic-surface shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[0.75rem] text-semantic-system-7">No services found</div>
          ) : (
            filtered.map(s => {
              const isSelected = selectedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => handleToggle(s.id)}
                  className={`w-full text-left px-3 py-1.5 text-[0.75rem] flex items-center gap-2 transition-colors hover:bg-[#F5F7F7] ${isSelected ? 'bg-[#E8F5E9]' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-7'}`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-semantic-text block truncate">{s.name}</span>
                    {s.dept && <span className="text-[0.625rem] text-semantic-system-7 block truncate">{s.dept}</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
