import React, { useState, useMemo } from 'react';
import {
  DashboardIcon,
  SearchIcon,
  CloseIcon,
  OpenInNewIcon,
  CheckCircleIcon,
  InfoOutlinedIcon,
} from '../components/Icons';
import {
  AirtableRecord,
  Table,
  useRecords,
  useInspectAttrs,
} from '../lib/airtable-hooks';

interface TableauNode {
  id: string;
  record: AirtableRecord;
  name: string;
  workbook: string;
  dataSources: string[];
  viewUrl: string;
  owner: string;
  notes: string;
  refreshType: string;
  projectFolder: string;
  viewCount: number;
  custom: boolean;
  extractRefreshes: string;
}

interface TableauPageProps {
  tableauTable: Table;
}

export function TableauPage({ tableauTable }: TableauPageProps) {
  const { records, loading } = useRecords(tableauTable);

  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [refreshFilter, setRefreshFilter] = useState('');
  const [selectedDashboard, setSelectedDashboard] = useState<TableauNode | null>(null);

  const dashboards: TableauNode[] = useMemo(() =>
    records.map(r => {
      const dsVal = r.getCellValue('Data Sources') as any;
      const dsNames: string[] = Array.isArray(dsVal)
        ? dsVal.map((d: any) => (typeof d === 'string' ? d : d?.name || '')).filter(Boolean)
        : [];
      return {
        id: r.id,
        record: r,
        name: r.getCellValueAsString('Dashboard'),
        workbook: r.getCellValueAsString('Workbook'),
        dataSources: dsNames,
        viewUrl: r.getCellValueAsString('View'),
        owner: r.getCellValueAsString('Owner'),
        notes: r.getCellValueAsString('Notes'),
        refreshType: r.getCellValueAsString('Refresh Type'),
        projectFolder: r.getCellValueAsString('Project Folder'),
        viewCount: (r.getCellValue('View Count') as number) || 0,
        custom: !!r.getCellValue('Custom'),
        extractRefreshes: r.getCellValueAsString('Extract Refreshes'),
      };
    }).filter(n => n.name).sort((a, b) => a.name.localeCompare(b.name)),
    [records]
  );

  const folders = useMemo(() => {
    const set = new Set<string>();
    dashboards.forEach(d => { if (d.projectFolder) set.add(d.projectFolder); });
    return Array.from(set).sort();
  }, [dashboards]);

  const refreshTypes = useMemo(() => {
    const set = new Set<string>();
    dashboards.forEach(d => { if (d.refreshType) set.add(d.refreshType); });
    return Array.from(set).sort();
  }, [dashboards]);

  const filtered = useMemo(() =>
    dashboards.filter(d => {
      if (folderFilter && d.projectFolder !== folderFilter) return false;
      if (refreshFilter && d.refreshType !== refreshFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [d.name, d.workbook, d.dataSources.join(' '), d.owner, d.projectFolder].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    }),
    [dashboards, folderFilter, refreshFilter, search]
  );

  const customCount = dashboards.filter(d => d.custom).length;

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DashboardIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Tableau Dashboards</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''}
            </span>
            {customCount > 0 && (
              <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium bg-semantic-surface text-semantic-system-5">
                {customCount} custom
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[320px]">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <SearchIcon size={14} className="text-semantic-system-7" />
            </div>
            <input
              type="text"
              placeholder="Search dashboards..."
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
          <select value={folderFilter} onChange={e => setFolderFilter(e.target.value)} className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1">
            <option value="">All Folders</option>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={refreshFilter} onChange={e => setRefreshFilter(e.target.value)} className="py-1 px-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1">
            <option value="">All Refresh Types</option>
            {refreshTypes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {(folderFilter || refreshFilter || search) && (
            <button onClick={() => { setFolderFilter(''); setRefreshFilter(''); setSearch(''); }} className="inline-flex items-center gap-0.5 px-1.5 h-[22px] text-[0.6875rem] bg-semantic-surface text-semantic-system-5 hover:bg-core_palette-primary-6">
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
              <DashboardIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">
              {dashboards.length === 0 ? 'No dashboards found' : 'No dashboards match your filters'}
            </p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              {dashboards.length === 0
                ? 'Tableau dashboards will appear here once they are synced.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Dashboard</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[160px]">Workbook</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[120px]">Folder</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[120px]">Data Sources</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[110px]">Refresh</th>
                <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[70px]">Views</th>
                <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[60px]">Custom</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filtered.map(node => (
                <TableauRow key={node.id} node={node} onClick={() => setSelectedDashboard(node)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={7} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {filtered.length} of {dashboards.length} dashboards
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {selectedDashboard && (
        <TableauDetailDrawer
          dashboard={selectedDashboard}
          onClose={() => setSelectedDashboard(null)}
        />
      )}
    </div>
  );
}

function TableauRow({ node, onClick }: { node: TableauNode; onClick: () => void }) {
  const nameAttrs = useInspectAttrs(node.record, 'Dashboard');
  const workbookAttrs = useInspectAttrs(node.record, 'Workbook');
  const folderAttrs = useInspectAttrs(node.record, 'Project Folder');
  const refreshAttrs = useInspectAttrs(node.record, 'Refresh Type');

  return (
    <tr
      onClick={onClick}
      className="border-b border-semantic-surface cursor-pointer transition-colors hover:bg-[#FAFBFB]"
    >
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
            <DashboardIcon size={14} style={{ color: '#17E88F' }} />
          </div>
          <div className="min-w-0">
            <span {...nameAttrs} className="block text-[0.75rem] font-medium text-semantic-text truncate">{node.name}</span>
            {node.owner && <span className="block text-[0.625rem] text-semantic-system-7 truncate">{node.owner}</span>}
          </div>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...workbookAttrs} className={`text-[0.6875rem] truncate block ${node.workbook ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.workbook || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...folderAttrs} className={`text-[0.6875rem] truncate block ${node.projectFolder ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.projectFolder || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <div className="flex flex-wrap gap-1">
          {node.dataSources.length > 0 ? node.dataSources.map(ds => (
            <span key={ds} className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium bg-semantic-surface text-semantic-system-5">
              {ds}
            </span>
          )) : (
            <span className="text-[0.6875rem] text-semantic-system-7">—</span>
          )}
        </div>
      </td>
      <td className="py-1.5 px-2" {...refreshAttrs}>
        {node.refreshType ? (
          <span className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: node.refreshType === 'Live' ? '#E6FCE8' : '#FFF8E1', color: node.refreshType === 'Live' ? '#006400' : '#AF6002' }}>
            {node.refreshType}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">—</span>
        )}
      </td>
      <td className="py-1.5 px-2 text-center">
        <span className="text-[0.6875rem] font-mono text-semantic-text">{node.viewCount.toLocaleString()}</span>
      </td>
      <td className="py-1.5 px-2 pr-4 text-center">
        {node.custom ? (
          <CheckCircleIcon size={14} style={{ color: '#006400' }} />
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">—</span>
        )}
      </td>
    </tr>
  );
}

function TableauDetailDrawer({
  dashboard, onClose,
}: {
  dashboard: TableauNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        {/* Dark header */}
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <DashboardIcon size={16} style={{ color: '#17E88F' }} />
            <span className="text-[0.8125rem] font-semibold font-sans">Dashboard Details</span>
          </div>
          <div className="flex items-center gap-2">
            {dashboard.viewUrl && (
              <a
                href={dashboard.viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] font-semibold bg-core_palette-primary-2 text-core_palette-primary-3 hover:opacity-90"
              >
                Open in Tableau
                <OpenInNewIcon size={12} />
              </a>
            )}
            <button onClick={onClose} className="text-[0.75rem] text-white/60 hover:text-white">Close</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {/* Identity */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-semantic-surface">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
              <DashboardIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.875rem] font-semibold text-semantic-text">{dashboard.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {dashboard.workbook && <span className="text-[0.625rem] text-semantic-system-5">{dashboard.workbook}</span>}
                {dashboard.custom && (
                  <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>Custom</span>
                )}
                {dashboard.refreshType && (
                  <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: dashboard.refreshType === 'Live' ? '#E6FCE8' : '#FFF8E1', color: dashboard.refreshType === 'Live' ? '#006400' : '#AF6002' }}>
                    {dashboard.refreshType}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* General Information */}
            <SectionHeader title="General Information" />
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="Dashboard" value={dashboard.name} />
              <DetailField label="Workbook" value={dashboard.workbook} />
              <DetailField label="Project Folder" value={dashboard.projectFolder} />
              <DetailField label="Owner" value={dashboard.owner} />
              <DetailField label="Refresh Type" value={dashboard.refreshType} />
              <DetailField label="Extract Refreshes" value={dashboard.extractRefreshes} />
              <div>
                <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">View Count</p>
                <p className="text-[0.75rem] font-mono text-semantic-text">{dashboard.viewCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">Custom</p>
                <div className="flex items-center gap-1">
                  <CheckCircleIcon size={14} style={{ color: dashboard.custom ? '#006400' : '#CAD1D3' }} />
                  <span className="text-[0.75rem] text-semantic-text">{dashboard.custom ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {dashboard.dataSources.length > 0 && (
              <>
                <hr className="my-3 border-semantic-surface" />
                <SectionHeader title="Data Sources" />
                <div className="flex flex-wrap gap-1">
                  {dashboard.dataSources.map(ds => (
                    <span key={ds} className="inline-flex items-center px-1.5 h-[22px] text-[0.6875rem] font-medium bg-semantic-surface text-semantic-system-5">
                      {ds}
                    </span>
                  ))}
                </div>
              </>
            )}

            {dashboard.viewUrl && (
              <>
                <hr className="my-3 border-semantic-surface" />
                <SectionHeader title="View URL" />
                <a
                  href={dashboard.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.75rem] underline break-all inline-flex items-center gap-1 text-core_palette-primary-1 hover:text-core_palette-primary-2"
                >
                  {dashboard.viewUrl}
                  <OpenInNewIcon size={12} />
                </a>
              </>
            )}

            {dashboard.notes && (
              <>
                <hr className="my-3 border-semantic-surface" />
                <SectionHeader title="Notes" />
                <div className="bg-[#F5F7F7] px-3 py-2">
                  <p className="text-[0.75rem] text-semantic-system-5 whitespace-pre-wrap leading-relaxed">{dashboard.notes}</p>
                </div>
              </>
            )}

            {/* Statistics */}
            <div className="mt-4 pt-3 border-t border-semantic-surface">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Statistics</span>
              <div className="flex gap-3 mt-2">
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{dashboard.viewCount.toLocaleString()}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Total Views</p>
                </div>
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{dashboard.dataSources.length}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Data Sources</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <InfoOutlinedIcon size={14} style={{ color: '#003F2D' }} />
      <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest leading-none">{title}</span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[0.625rem] text-semantic-system-7 mb-0.5">{label}</p>
      <p className="text-[0.75rem] text-semantic-text break-words">{value}</p>
    </div>
  );
}
