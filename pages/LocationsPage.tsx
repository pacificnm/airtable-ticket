import React, { useState, useMemo } from 'react';
import {
  LocationOnIcon,
  SearchIcon,
  CloseIcon,
  InfoOutlinedIcon,
  CheckCircleIcon,
  CancelIcon,
  OpenInNewIcon,
  HelpOutlineIcon,
  CategoryIcon,
  DescriptionIcon,
  ChevronRightIcon,
  CheckCircleOutlineIcon,
} from '../components/Icons';
import {
  AirtableRecord,
  Table,
  useRecords,
  useInspectAttrs,
} from '../lib/airtable-hooks';

const BuildingIcon = ({ size = 16, color = '#17E88F' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z" />
  </svg>
);

const SquareFootIcon = ({ size = 14, color = '#003F2D' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M17 21h2v-2h-2v2zm-4 0h2v-2h-2v2zm4-4h2v-2h-2v2zM1 7h2V5H1v2zm0 4h2V9H1v2zm4 14h2v-2H5v2zM1 3h2V1H1v2zm8 18h2v-2H9v2zM1 15h2v-2H1v2zm16-16h2V1h-2v2zm-8 0h2V1H9v2zM1 19h2v-2H1v2zm4-4h2v-2H5v2zm16-4h2v-2h-2v2zm0-4h2V5h-2v2zm0 12h2v-2h-2v2zm0-8h2V9h-2v2zM5 3h2V1H5v2zm8 18h2v-2h-2v2zM5 7h2V5H5v2z" />
  </svg>
);

const OWNERSHIP_COLORS: Record<string, { bg: string; text: string }> = {
  'Owned': { bg: '#E8F5E9', text: '#003F2D' },
  'Leased': { bg: '#E3F2FD', text: '#0D47A1' },
  'Subleased': { bg: '#FFF3E0', text: '#E65100' },
};

const USE_COLORS: Record<string, { bg: string; text: string }> = {
  'Office': { bg: '#E3F2FD', text: '#0D47A1' },
  'Warehouse': { bg: '#FFF8E1', text: '#F57F17' },
  'Retail': { bg: '#F3E5F5', text: '#6A1B9A' },
  'Mixed': { bg: '#E0F2F1', text: '#00695C' },
  'Lab': { bg: '#FCE4EC', text: '#C62828' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Active': { bg: '#E6FCE8', text: '#006400' },
  'Inactive': { bg: '#FDECEF', text: '#9B1C31' },
  'Planning': { bg: '#FFF8E6', text: '#8B6914' },
  'Closed': { bg: '#F2F4F8', text: '#616670' },
};

interface BuildingNode {
  id: string;
  record: AirtableRecord;
  preferredName: string;
  name: string;
  locationId: number | null;
  country: string;
  region: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  district: string;
  neighborhood: string;
  latitude: string;
  longitude: string;
  ownership: string;
  use: string;
  classification: string;
  maxCapacity: number | null;
  strategicCapacity: number | null;
  squareFootage: number | null;
  usableSquareFootage: number | null;
  mapUrl: string;
  status: string;
  group: string;
  siteTools: boolean;
  cbreScope: boolean;
  brand: string;
  buildingCode: string;
}

interface LocationsPageProps {
  buildingTable: Table;
  taxonomyRecords: AirtableRecord[];
  dosRecords: AirtableRecord[];
  serviceItemRecords: AirtableRecord[];
}

export function LocationsPage({ buildingTable, taxonomyRecords, dosRecords, serviceItemRecords }: LocationsPageProps) {
  const { records: buildingRecords, loading } = useRecords(buildingTable);

  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('');
  const [useFilter, setUseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingNode | null>(null);

  const buildingNodes: BuildingNode[] = useMemo(() =>
    buildingRecords.map(r => ({
      id: r.id,
      record: r,
      preferredName: r.getCellValueAsString('Preferred Name'),
      name: r.getCellValueAsString('Name'),
      locationId: r.getCellValue('Location ID') as number | null,
      country: r.getCellValueAsString('Country'),
      region: r.getCellValueAsString('Region'),
      address: r.getCellValueAsString('Address'),
      city: r.getCellValueAsString('City'),
      state: r.getCellValueAsString('State'),
      postalCode: r.getCellValueAsString('Postal Code'),
      district: r.getCellValueAsString('District'),
      neighborhood: r.getCellValueAsString('Neighborhood'),
      latitude: r.getCellValueAsString('Latitude'),
      longitude: r.getCellValueAsString('Longitude'),
      ownership: r.getCellValueAsString('Ownership'),
      use: r.getCellValueAsString('Use'),
      classification: r.getCellValueAsString('Classification'),
      maxCapacity: r.getCellValue('Max Capacity') as number | null,
      strategicCapacity: r.getCellValue('Strategic Capacity') as number | null,
      squareFootage: r.getCellValue('Square Footage') as number | null,
      usableSquareFootage: r.getCellValue('Usable Square Footage') as number | null,
      mapUrl: r.getCellValueAsString('Map'),
      status: r.getCellValueAsString('Status'),
      group: r.getCellValueAsString('Group'),
      siteTools: !!r.getCellValue('SiteTools'),
      cbreScope: !!r.getCellValue('CBRE Scope'),
      brand: r.getCellValueAsString('Brand'),
      buildingCode: r.getCellValueAsString('Building Code'),
    })).filter(n => n.preferredName || n.name)
      .sort((a, b) => (a.preferredName || a.name).localeCompare(b.preferredName || b.name)),
    [buildingRecords]
  );

  const ownerships = useMemo(() => {
    const set = new Set<string>();
    buildingNodes.forEach(n => { if (n.ownership) set.add(n.ownership); });
    return Array.from(set).sort();
  }, [buildingNodes]);

  const uses = useMemo(() => {
    const set = new Set<string>();
    buildingNodes.forEach(n => { if (n.use) set.add(n.use); });
    return Array.from(set).sort();
  }, [buildingNodes]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    buildingNodes.forEach(n => { if (n.status) set.add(n.status); });
    return Array.from(set).sort();
  }, [buildingNodes]);

  const filteredBuildings = useMemo(() =>
    buildingNodes.filter(b => {
      if (ownershipFilter && b.ownership !== ownershipFilter) return false;
      if (useFilter && b.use !== useFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [b.preferredName, b.name, b.address, b.city, b.state, b.country, b.neighborhood, b.district, b.buildingCode].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    }),
    [buildingNodes, ownershipFilter, useFilter, statusFilter, search]
  );

  const activeCount = buildingNodes.filter(b => b.status === 'Active').length;
  const totalCount = buildingNodes.length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LocationOnIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Locations</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {activeCount} active
            </span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium bg-semantic-surface text-semantic-system-5">
              {totalCount} total
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[320px]">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <SearchIcon size={14} className="text-semantic-system-7" />
            </div>
            <input
              type="text"
              placeholder="Search locations..."
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
            value={ownershipFilter}
            onChange={e => setOwnershipFilter(e.target.value)}
            className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            aria-label="Filter by ownership"
          >
            <option value="">All Ownership</option>
            {ownerships.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select
            value={useFilter}
            onChange={e => setUseFilter(e.target.value)}
            className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            aria-label="Filter by use"
          >
            <option value="">All Uses</option>
            {uses.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(ownershipFilter || useFilter || statusFilter || search) && (
            <button
              onClick={() => { setOwnershipFilter(''); setUseFilter(''); setStatusFilter(''); setSearch(''); }}
              className="inline-flex items-center gap-0.5 px-1.5 h-[22px] text-[0.6875rem] bg-semantic-surface text-semantic-system-5 hover:bg-core_palette-primary-6"
            >
              Clear
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-core_palette-primary-1 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3" style={{ backgroundColor: '#003F2D' }}>
              <LocationOnIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">
              {buildingNodes.length === 0 ? 'No locations found' : 'No locations match your filters'}
            </p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              {buildingNodes.length === 0
                ? 'Locations will appear here once buildings are added.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[160px]">Address</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[90px]">City</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[70px]">State</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[100px]">Neighborhood</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Ownership</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[70px]">Use</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[70px]">Status</th>
                <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[70px]">Capacity</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredBuildings.map(node => (
                <BuildingRow key={node.id} node={node} onClick={() => setSelectedBuilding(node)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={9} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {filteredBuildings.length} of {totalCount} locations
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {selectedBuilding && (
        <BuildingDetailDrawer
          building={selectedBuilding}
          taxonomyRecords={taxonomyRecords}
          dosRecords={dosRecords}
          serviceItemRecords={serviceItemRecords}
          onClose={() => setSelectedBuilding(null)}
        />
      )}
    </div>
  );
}

function BuildingRow({ node, onClick }: { node: BuildingNode; onClick: () => void }) {
  const nameAttrs = useInspectAttrs(node.record, 'Preferred Name');
  const addressAttrs = useInspectAttrs(node.record, 'Address');
  const cityAttrs = useInspectAttrs(node.record, 'City');
  const stateAttrs = useInspectAttrs(node.record, 'State');
  const neighborhoodAttrs = useInspectAttrs(node.record, 'Neighborhood');
  const ownershipAttrs = useInspectAttrs(node.record, 'Ownership');
  const useAttrs = useInspectAttrs(node.record, 'Use');
  const statusAttrs = useInspectAttrs(node.record, 'Status');
  const capacityAttrs = useInspectAttrs(node.record, 'Max Capacity');

  const isInactive = node.status === 'Inactive' || node.status === 'Closed';
  const ownershipColor = OWNERSHIP_COLORS[node.ownership] || { bg: '#F2F4F8', text: '#616670' };
  const useColor = USE_COLORS[node.use] || { bg: '#F2F4F8', text: '#616670' };
  const statusColor = STATUS_COLORS[node.status] || { bg: '#F2F4F8', text: '#616670' };

  return (
    <tr
      onClick={onClick}
      className="border-b border-semantic-surface cursor-pointer transition-colors hover:bg-[#FAFBFB]"
      style={{ opacity: isInactive ? 0.55 : 1 }}
    >
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: isInactive ? '#CAD1D3' : '#003F2D' }}
          >
            <BuildingIcon size={14} color={isInactive ? '#FFFFFF' : '#17E88F'} />
          </div>
          <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate">
            {node.preferredName || node.name}
          </span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...addressAttrs} className={`text-[0.6875rem] truncate block ${node.address ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.address || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...cityAttrs} className={`text-[0.6875rem] truncate block ${node.city ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.city || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...stateAttrs} className={`text-[0.6875rem] truncate block ${node.state ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.state || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...neighborhoodAttrs} className={`text-[0.6875rem] truncate block ${node.neighborhood ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.neighborhood || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2" {...ownershipAttrs}>
        {node.ownership ? (
          <span className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: ownershipColor.bg, color: ownershipColor.text }}>
            {node.ownership}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">—</span>
        )}
      </td>
      <td className="py-1.5 px-2" {...useAttrs}>
        {node.use ? (
          <span className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: useColor.bg, color: useColor.text }}>
            {node.use}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">—</span>
        )}
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
      <td className="py-1.5 px-2 pr-4 text-right">
        <span {...capacityAttrs} className="text-[0.6875rem] font-mono text-semantic-text">
          {node.maxCapacity != null ? node.maxCapacity.toLocaleString() : '—'}
        </span>
      </td>
    </tr>
  );
}

type DrawerTab = 'details' | 'taxonomy';

const TAXONOMY_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Active': { bg: '#E6FCE8', text: '#006400' },
  'Inactive': { bg: '#FDECEF', text: '#9B1C31' },
  'Pending': { bg: '#FFF8E6', text: '#8B6914' },
};

const APPROVAL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Approved': { bg: '#E6FCE8', text: '#006400' },
  'Pending': { bg: '#FFF8E6', text: '#8B6914' },
  'Rejected': { bg: '#FDECEF', text: '#9B1C31' },
  'Draft': { bg: '#F2F4F8', text: '#616670' },
};

function BuildingDetailDrawer({ building, taxonomyRecords, dosRecords, serviceItemRecords, onClose }: { building: BuildingNode; taxonomyRecords: AirtableRecord[]; dosRecords: AirtableRecord[]; serviceItemRecords: AirtableRecord[]; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('details');
  const statusColor = STATUS_COLORS[building.status] || { bg: '#F2F4F8', text: '#616670' };
  const isInactive = building.status === 'Inactive' || building.status === 'Closed';

  const fullAddress = [building.address, building.city, building.state, building.postalCode, building.country]
    .filter(Boolean)
    .join(', ');

  // Get linked taxonomy record IDs from the building record
  const linkedTaxonomyIds = useMemo(() => {
    const linked = building.record.getCellValue('Taxonomy Item');
    if (!Array.isArray(linked)) return new Set<string>();
    return new Set((linked as Array<{ id: string }>).map(l => l.id));
  }, [building.record]);

  // Filter taxonomy records to only those linked to this building
  const buildingTaxonomy = useMemo(() =>
    taxonomyRecords.filter(r => linkedTaxonomyIds.has(r.id)),
    [taxonomyRecords, linkedTaxonomyIds]
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <LocationOnIcon size={16} style={{ color: '#17E88F' }} />
            <span className="text-[0.8125rem] font-semibold font-sans">Location Details</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="px-4 py-3 flex items-center gap-3 border-b border-semantic-surface flex-shrink-0">
          <div
            className="w-9 h-9 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: isInactive ? '#CAD1D3' : '#003F2D' }}
          >
            <BuildingIcon size={20} color={isInactive ? '#FFFFFF' : '#17E88F'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.875rem] font-semibold text-semantic-text">{building.preferredName || building.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {building.city && building.state && (
                <span className="text-[0.625rem] text-semantic-system-5">{building.city}, {building.state}</span>
              )}
              {building.ownership && (
                <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: (OWNERSHIP_COLORS[building.ownership] || { bg: '#F2F4F8' }).bg, color: (OWNERSHIP_COLORS[building.ownership] || { text: '#616670' }).text }}>
                  {building.ownership}
                </span>
              )}
              {building.status && (
                <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
                  {building.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-semantic-surface flex-shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-2 text-[0.75rem] font-medium text-center transition-colors ${
              activeTab === 'details'
                ? 'text-core_palette-primary-1 border-b-2 border-core_palette-primary-1'
                : 'text-semantic-system-5 hover:text-semantic-text'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`flex-1 py-2 text-[0.75rem] font-medium text-center transition-colors ${
              activeTab === 'taxonomy'
                ? 'text-core_palette-primary-1 border-b-2 border-core_palette-primary-1'
                : 'text-semantic-system-5 hover:text-semantic-text'
            }`}
          >
            Taxonomy
            {buildingTaxonomy.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 text-[0.5625rem] font-medium bg-semantic-surface text-semantic-system-5 rounded-full">
                {buildingTaxonomy.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === 'details' && (
            <DetailsTabContent building={building} fullAddress={fullAddress} />
          )}
          {activeTab === 'taxonomy' && (
            <TaxonomyTabContent records={buildingTaxonomy} dosRecords={dosRecords} serviceItemRecords={serviceItemRecords} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsTabContent({ building, fullAddress }: { building: BuildingNode; fullAddress: string }) {
  return (
    <div className="px-4 py-4">
      <SectionHeader icon={<InfoOutlinedIcon size={14} style={{ color: '#003F2D' }} />} title="General Information" />
      <DetailGrid>
        <DetailField label="Preferred Name" value={building.preferredName} />
        <DetailField label="Name" value={building.name} />
        <DetailField label="Location ID" value={building.locationId != null ? String(building.locationId) : ''} mono />
        <DetailField label="Building Code" value={building.buildingCode} mono />
        <DetailField label="Status" value={building.status} />
        <DetailField label="Group" value={building.group} />
        <DetailField label="Brand" value={building.brand} />
        <DetailField label="Classification" value={building.classification} />
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<LocationOnIcon size={14} style={{ color: '#003F2D' }} />} title="Address & Location" />
      <DetailGrid>
        <div className="col-span-2">
          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Full Address</p>
          <p className="text-[0.75rem] text-semantic-text">{fullAddress || '—'}</p>
        </div>
        <DetailField label="Address" value={building.address} />
        <DetailField label="City" value={building.city} />
        <DetailField label="State" value={building.state} />
        <DetailField label="Country" value={building.country} />
        <DetailField label="Postal Code" value={building.postalCode} mono />
        <DetailField label="District" value={building.district} />
        <DetailField label="Neighborhood" value={building.neighborhood} />
        <DetailField label="Region" value={building.region} />
        {(building.latitude || building.longitude) && (
          <div className="col-span-2">
            <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Coordinates</p>
            <p className="text-[0.75rem] font-mono text-semantic-text">
              {building.latitude || '—'}, {building.longitude || '—'}
            </p>
          </div>
        )}
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<SquareFootIcon />} title="Capacity & Space" />
      <DetailGrid>
        <div>
          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Max Capacity</p>
          <p className="text-[0.75rem] font-mono text-semantic-text">
            {building.maxCapacity != null ? building.maxCapacity.toLocaleString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Strategic Capacity</p>
          <p className="text-[0.75rem] font-mono text-semantic-text">
            {building.strategicCapacity != null ? building.strategicCapacity.toLocaleString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Square Footage</p>
          <p className="text-[0.75rem] font-mono text-semantic-text">
            {building.squareFootage != null ? building.squareFootage.toLocaleString() + ' sq ft' : '—'}
          </p>
        </div>
        <div>
          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Usable Square Footage</p>
          <p className="text-[0.75rem] font-mono text-semantic-text">
            {building.usableSquareFootage != null ? building.usableSquareFootage.toLocaleString() + ' sq ft' : '—'}
          </p>
        </div>
      </DetailGrid>

      <hr className="my-3 border-semantic-surface" />

      <SectionHeader icon={<HelpOutlineIcon size={14} style={{ color: '#003F2D' }} />} title="Features" />
      <DetailGrid>
        <div>
          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">SiteTools</p>
          <div className="flex items-center gap-1">
            {building.siteTools
              ? <CheckCircleIcon size={14} style={{ color: '#006400' }} />
              : <CancelIcon size={14} style={{ color: '#9B1C31' }} />
            }
            <span className="text-[0.75rem] text-semantic-text">{building.siteTools ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div>
          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">CBRE Scope</p>
          <div className="flex items-center gap-1">
            {building.cbreScope
              ? <CheckCircleIcon size={14} style={{ color: '#006400' }} />
              : <CancelIcon size={14} style={{ color: '#9B1C31' }} />
            }
            <span className="text-[0.75rem] text-semantic-text">{building.cbreScope ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </DetailGrid>

      {building.mapUrl && (
        <>
          <hr className="my-3 border-semantic-surface" />
          <SectionHeader icon={<LocationOnIcon size={14} style={{ color: '#003F2D' }} />} title="Map" />
          <a
            href={building.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[0.75rem] font-medium text-core_palette-primary-1 bg-[#E8F5E9] hover:bg-[#C8E6C9] transition-colors"
          >
            <OpenInNewIcon size={14} />
            Open Building Map
          </a>
        </>
      )}
    </div>
  );
}

interface TaxonomyItem {
  id: string;
  uid: string;
  serviceCode: string;
  serviceName: string;
  responsibleForScope: string;
  deliveryModel: string;
  status: string;
  siteComments: string;
  versionLabel: string;
  approvalStatus: string;
  effectiveDate: string;
  nodeCode: string;
  siteGroup: string;
  linkedServiceIds: string[];
}

interface DOSDetail {
  id: string;
  serviceCode: string;
  serviceTitle: string;
  recordType: string;
  definition: string;
  volumeCode: number | null;
  volumeTitle: string;
  chapterCode: number | null;
  chapterTitle: string;
}

interface ServiceItemDetail {
  id: string;
  itemType: string;
  itemText: string;
  itemOrder: number;
}

function TaxonomyTabContent({ records, dosRecords, serviceItemRecords }: { records: AirtableRecord[]; dosRecords: AirtableRecord[]; serviceItemRecords: AirtableRecord[] }) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingServiceId, setViewingServiceId] = useState<string | null>(null);

  const taxonomyItems: TaxonomyItem[] = useMemo(() =>
    records.map(r => {
      const servicesLink = r.getCellValue('Services') as any;
      const linkedServiceIds = Array.isArray(servicesLink)
        ? servicesLink.map((l: any) => l.id)
        : [];
      return {
        id: r.id,
        uid: r.getCellValueAsString('Taxonomy UID'),
        serviceCode: r.getCellValueAsString('Service Code'),
        serviceName: r.getCellValueAsString('Service Name'),
        responsibleForScope: r.getCellValueAsString('Responsible For Scope'),
        deliveryModel: r.getCellValueAsString('Delivery Model'),
        status: r.getCellValueAsString('Status'),
        siteComments: r.getCellValueAsString('Site Comments Variations'),
        versionLabel: r.getCellValueAsString('Version Label'),
        approvalStatus: r.getCellValueAsString('Approval Status'),
        effectiveDate: r.getCellValueAsString('Effective Date'),
        nodeCode: r.getCellValueAsString('Node Code'),
        siteGroup: r.getCellValueAsString('Site Group'),
        linkedServiceIds,
      };
    }),
    [records]
  );

  // Build a map of DOS record id -> detail
  const dosMap = useMemo(() => {
    const map = new Map<string, DOSDetail>();
    dosRecords.forEach(r => {
      map.set(r.id, {
        id: r.id,
        serviceCode: r.getCellValueAsString('Service Code'),
        serviceTitle: r.getCellValueAsString('Service Title'),
        recordType: r.getCellValueAsString('Record Type'),
        definition: r.getCellValueAsString('Definition'),
        volumeCode: r.getCellValue('Volume Code') as number | null,
        volumeTitle: r.getCellValueAsString('Volume Title'),
        chapterCode: r.getCellValue('Chapter Code') as number | null,
        chapterTitle: r.getCellValueAsString('Chapter Title'),
      });
    });
    return map;
  }, [dosRecords]);

  // Build a map of DOS record id -> service items
  const serviceItemsByDosId = useMemo(() => {
    const map = new Map<string, ServiceItemDetail[]>();
    serviceItemRecords.forEach(r => {
      const servicesLink = r.getCellValue('Services') as any;
      const parentId = Array.isArray(servicesLink) && servicesLink.length > 0
        ? servicesLink[0].id
        : '';
      if (!parentId) return;
      const item: ServiceItemDetail = {
        id: r.id,
        itemType: r.getCellValueAsString('Item Type'),
        itemText: r.getCellValueAsString('Item Text'),
        itemOrder: (r.getCellValue('Item Order') as number) || 0,
      };
      const existing = map.get(parentId) || [];
      existing.push(item);
      map.set(parentId, existing);
    });
    map.forEach(items => items.sort((a, b) => a.itemOrder - b.itemOrder));
    return map;
  }, [serviceItemRecords]);

  const filtered = useMemo(() => {
    if (!search) return taxonomyItems;
    const q = search.toLowerCase();
    return taxonomyItems.filter(t =>
      [t.serviceCode, t.serviceName, t.responsibleForScope, t.deliveryModel, t.status, t.uid].join(' ').toLowerCase().includes(q)
    );
  }, [taxonomyItems, search]);

  // If viewing a specific service, show that detail view
  if (viewingServiceId) {
    const dosDetail = dosMap.get(viewingServiceId) || null;
    const items = serviceItemsByDosId.get(viewingServiceId) || [];
    const outcomes = items.filter(i => i.itemType === 'Outcome');
    const responsibilities = items.filter(i => i.itemType === 'Responsibility');

    return (
      <ServiceCodeDetailView
        dosDetail={dosDetail}
        outcomes={outcomes}
        responsibilities={responsibilities}
        onBack={() => setViewingServiceId(null)}
      />
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-10 h-10 flex items-center justify-center mb-3" style={{ backgroundColor: '#003F2D' }}>
          <CategoryIcon size={20} style={{ color: '#17E88F' }} />
        </div>
        <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">No taxonomy data</p>
        <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
          No taxonomy items are linked to this building.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 flex items-center gap-2 border-b border-semantic-surface flex-shrink-0">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <SearchIcon size={13} className="text-semantic-system-7" />
          </div>
          <input
            type="text"
            placeholder="Search taxonomy..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-7 py-1 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-semantic-system-7 hover:text-semantic-system-5" aria-label="Clear">
              <CloseIcon size={13} />
            </button>
          )}
        </div>
        <span className="text-[0.625rem] text-semantic-system-7 whitespace-nowrap">
          {filtered.length} of {taxonomyItems.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-[0.75rem] text-semantic-system-5">No matching taxonomy items.</div>
        ) : (
          <div className="divide-y divide-semantic-surface">
            {filtered.map(item => {
              const isExpanded = expandedId === item.id;
              const tStatusColor = TAXONOMY_STATUS_COLORS[item.status] || { bg: '#F2F4F8', text: '#616670' };
              const aStatusColor = APPROVAL_STATUS_COLORS[item.approvalStatus] || { bg: '#F2F4F8', text: '#616670' };

              // Find linked DOS records for this taxonomy item
              const linkedDosDetails = item.linkedServiceIds
                .map(id => dosMap.get(id))
                .filter((d): d is DOSDetail => d != null);

              return (
                <div key={item.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#FAFBFB] transition-colors flex items-start gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width={14}
                      height={14}
                      fill="#8C9196"
                      className={`flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    >
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.serviceCode && (
                          <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-mono font-medium bg-[#E3F2FD] text-[#0D47A1]">
                            {item.serviceCode}
                          </span>
                        )}
                        <span className="text-[0.75rem] font-medium text-semantic-text truncate">
                          {item.serviceName || item.uid}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.status && (
                          <span className="inline-flex items-center px-1 h-[14px] text-[0.5rem] font-medium" style={{ backgroundColor: tStatusColor.bg, color: tStatusColor.text }}>
                            {item.status}
                          </span>
                        )}
                        {item.deliveryModel && (
                          <span className="text-[0.625rem] text-semantic-system-5">{item.deliveryModel}</span>
                        )}
                        {item.responsibleForScope && (
                          <span className="text-[0.625rem] text-semantic-system-7">· {item.responsibleForScope}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 pl-10">
                      <div className="bg-[#F5F7F7] p-3 grid grid-cols-2 gap-2">
                        <DetailField label="Taxonomy UID" value={item.uid} mono />
                        <DetailField label="Service Code" value={item.serviceCode} mono />
                        <DetailField label="Service Name" value={item.serviceName} />
                        <DetailField label="Node Code" value={item.nodeCode} mono />
                        <DetailField label="Responsible For Scope" value={item.responsibleForScope} />
                        <DetailField label="Delivery Model" value={item.deliveryModel} />
                        <div>
                          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Status</p>
                          {item.status ? (
                            <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: tStatusColor.bg, color: tStatusColor.text }}>
                              {item.status}
                            </span>
                          ) : (
                            <p className="text-[0.75rem] text-semantic-system-7">—</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Approval Status</p>
                          {item.approvalStatus ? (
                            <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: aStatusColor.bg, color: aStatusColor.text }}>
                              {item.approvalStatus}
                            </span>
                          ) : (
                            <p className="text-[0.75rem] text-semantic-system-7">—</p>
                          )}
                        </div>
                        <DetailField label="Version Label" value={item.versionLabel} />
                        <DetailField label="Effective Date" value={item.effectiveDate} />
                        <DetailField label="Site Group" value={item.siteGroup} />
                        {item.siteComments && (
                          <div className="col-span-2">
                            <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Site Comments / Variations</p>
                            <p className="text-[0.75rem] text-semantic-text whitespace-pre-wrap">{item.siteComments}</p>
                          </div>
                        )}

                        {/* Service Code Details Link */}
                        {linkedDosDetails.length > 0 && (
                          <div className="col-span-2 pt-2 border-t border-semantic-surface mt-1">
                            <p className="text-[0.625rem] text-semantic-system-7 mb-1.5">Service Code Details</p>
                            <div className="space-y-1">
                              {linkedDosDetails.map(dos => {
                                const itemCount = (serviceItemsByDosId.get(dos.id) || []).length;
                                return (
                                  <button
                                    key={dos.id}
                                    onClick={() => setViewingServiceId(dos.id)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 bg-white border border-semantic-surface hover:border-core_palette-primary-1 hover:bg-[rgba(0,63,45,0.03)] transition-colors text-left group"
                                  >
                                    <DescriptionIcon size={13} style={{ color: '#003F2D' }} />
                                    <span className="inline-flex items-center px-1 h-[14px] text-[0.5rem] font-mono font-medium bg-[#FFF3E0] text-[#E65100] flex-shrink-0">
                                      {dos.serviceCode}
                                    </span>
                                    <span className="text-[0.6875rem] text-semantic-text truncate flex-1">
                                      {dos.serviceTitle}
                                    </span>
                                    {itemCount > 0 && (
                                      <span className="text-[0.5rem] text-semantic-system-7 flex-shrink-0">
                                        {itemCount} items
                                      </span>
                                    )}
                                    <ChevronRightIcon size={12} className="text-semantic-system-7 group-hover:text-core_palette-primary-1 flex-shrink-0" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceCodeDetailView({ dosDetail, outcomes, responsibilities, onBack }: {
  dosDetail: DOSDetail | null;
  outcomes: ServiceItemDetail[];
  responsibilities: ServiceItemDetail[];
  onBack: () => void;
}) {
  if (!dosDetail) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b border-semantic-surface flex-shrink-0">
          <button onClick={onBack} className="flex items-center gap-1 text-[0.75rem] text-core_palette-primary-1 hover:text-core_palette-primary-3 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14} fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
            Back to Taxonomy
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[0.75rem] text-semantic-system-5">Service details not found.</p>
        </div>
      </div>
    );
  }

  const TYPE_BG: Record<string, { bg: string; text: string }> = {
    'Volume': { bg: '#003F2D', text: '#FFFFFF' },
    'Chapter': { bg: '#E3F2FD', text: '#0D47A1' },
    'Section': { bg: '#FFF3E0', text: '#E65100' },
  };
  const typeStyle = TYPE_BG[dosDetail.recordType] || TYPE_BG['Section'];

  return (
    <div className="flex flex-col h-full">
      {/* Back button header */}
      <div className="px-4 py-2 border-b border-semantic-surface flex-shrink-0 bg-[#FAFBFB]">
        <button onClick={onBack} className="flex items-center gap-1 text-[0.75rem] text-core_palette-primary-1 hover:text-core_palette-primary-3 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={14} height={14} fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          Back to Taxonomy
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Service header */}
        <div className="px-4 py-4 border-b-[3px]" style={{ borderBottomColor: '#003F2D' }}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-flex items-center px-1.5 h-[20px] text-[0.625rem] font-mono font-semibold"
              style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
            >
              {dosDetail.serviceCode}
            </span>
            <span
              className="inline-flex items-center px-1.5 h-[18px] text-[0.5625rem] font-medium uppercase tracking-wider"
              style={{ backgroundColor: '#F2F4F8', color: '#616670' }}
            >
              {dosDetail.recordType}
            </span>
            {dosDetail.volumeTitle && (
              <span className="text-[0.625rem] text-semantic-system-7">
                Volume {dosDetail.volumeCode}: {dosDetail.volumeTitle}
              </span>
            )}
          </div>
          <h2 className="text-[1.125rem] font-semibold text-semantic-text font-sans leading-tight">
            {dosDetail.serviceTitle}
          </h2>
          {dosDetail.chapterTitle && dosDetail.recordType === 'Section' && (
            <p className="text-[0.75rem] text-semantic-system-5 mt-1">
              Chapter {dosDetail.chapterCode}: {dosDetail.chapterTitle}
            </p>
          )}
        </div>

        {/* Definition */}
        {dosDetail.definition && (
          <div className="px-4 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <DescriptionIcon size={13} style={{ color: '#003F2D' }} />
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Definition</span>
            </div>
            <div className="text-[0.8125rem] text-semantic-text leading-relaxed whitespace-pre-wrap">
              {dosDetail.definition}
            </div>
          </div>
        )}

        {/* Expected Outcomes */}
        {outcomes.length > 0 && (
          <div className="px-4 py-4 border-t border-semantic-surface">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: '#E6FCE8' }}>
                <CheckCircleOutlineIcon size={13} style={{ color: '#006400' }} />
              </div>
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Expected Outcomes</span>
              <span className="inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 text-[0.5625rem] font-medium bg-[#E6FCE8] text-[#006400]">
                {outcomes.length}
              </span>
            </div>
            <div className="space-y-0">
              {outcomes.map((item, idx) => (
                <div key={item.id} className="flex gap-3 py-2 border-b border-[#F0F2F2] last:border-b-0">
                  <span className="text-[0.625rem] font-mono text-semantic-system-7 w-5 flex-shrink-0 pt-0.5 text-right">
                    {idx + 1}
                  </span>
                  <p className="text-[0.75rem] text-semantic-text leading-relaxed flex-1">
                    {item.itemText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Responsibilities */}
        {responsibilities.length > 0 && (
          <div className="px-4 py-4 border-t border-semantic-surface">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: '#E3F2FD' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13} fill="#0D47A1">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
              </div>
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Responsibilities</span>
              <span className="inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 text-[0.5625rem] font-medium bg-[#E3F2FD] text-[#0D47A1]">
                {responsibilities.length}
              </span>
            </div>
            <div className="space-y-0">
              {responsibilities.map((item, idx) => (
                <div key={item.id} className="flex gap-3 py-2 border-b border-[#F0F2F2] last:border-b-0">
                  <span className="text-[0.625rem] font-mono text-semantic-system-7 w-5 flex-shrink-0 pt-0.5 text-right">
                    {idx + 1}
                  </span>
                  <p className="text-[0.75rem] text-semantic-text leading-relaxed flex-1">
                    {item.itemText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no content */}
        {!dosDetail.definition && outcomes.length === 0 && responsibilities.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-[0.75rem] text-semantic-system-5">
              No definition, outcomes, or responsibilities available for this service code.
            </p>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

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
