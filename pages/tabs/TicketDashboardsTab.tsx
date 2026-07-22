import React, { useState, useMemo } from 'react';
import {
  AirtableRecord,
  Table,
  useUpdateRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../../lib/airtable-hooks';
import { useLogHistory } from '../../hooks/useEventBus';
import { useSnackbar } from '../../components/SnackbarProvider';
import { RoleGuard } from '../../components/RoleGuard';
import { AddIcon, CloseIcon, SearchIcon, DashboardIcon, OpenInNewIcon, CheckCircleIcon } from '../../components/Icons';

export interface TicketDashboardsTabProps {
  dashboards: AirtableRecord[];
  allDashboards: AirtableRecord[];
  ticket: AirtableRecord;
  ticketsTable: Table;
  onRefresh: () => void;
}

export function TicketDashboardsTab({ dashboards, allDashboards, ticket, ticketsTable, onRefresh }: TicketDashboardsTabProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const { mutate: updateTicket } = useUpdateRecord(ticketsTable);
  const { showSnackbar } = useSnackbar();
  const logHistory = useLogHistory();

  const linkedDashboardIds = new Set(dashboards.map(d => d.id));

  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const q = searchQuery.trim().toLowerCase();
    return allDashboards
      .filter(d => {
        if (linkedDashboardIds.has(d.id)) return false;
        const name = d.getCellValueAsString('Dashboard').toLowerCase();
        const workbook = d.getCellValueAsString('Workbook').toLowerCase();
        const folder = d.getCellValueAsString('Project Folder').toLowerCase();
        return name.includes(q) || workbook.includes(q) || folder.includes(q);
      })
      .slice(0, 20);
  }, [searchQuery, allDashboards, linkedDashboardIds]);

  const handleLinkDashboard = async (dashboard: AirtableRecord) => {
    setLinking(true);
    try {
      const currentIds = getLinkedRecordIds(ticket.fields['Dashboards']);
      await updateTicket({
        recordId: ticket.id,
        fields: { Dashboards: [...currentIds, dashboard.id], 'Last Modified': new Date().toISOString() },
      });
      const dashName = dashboard.getCellValueAsString('Dashboard');
      await logHistory(
        ticket.id,
        `Dashboard "${dashName}" linked`,
        'Dashboard Added',
        undefined,
        dashName,
        `Workbook: ${dashboard.getCellValueAsString('Workbook') || 'N/A'}`,
      );
      showSnackbar(`Dashboard "${dashName}" linked to ticket`);
      setSearchQuery('');
      setShowSearch(false);
      onRefresh();
    } catch {
      showSnackbar('Failed to link dashboard', 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkDashboard = async (dashboard: AirtableRecord) => {
    setUnlinkingId(dashboard.id);
    try {
      const currentIds = getLinkedRecordIds(ticket.fields['Dashboards']);
      const updatedIds = currentIds.filter((id: string) => id !== dashboard.id);
      await updateTicket({
        recordId: ticket.id,
        fields: { Dashboards: updatedIds, 'Last Modified': new Date().toISOString() },
      });
      const dashName = dashboard.getCellValueAsString('Dashboard');
      await logHistory(
        ticket.id,
        `Dashboard "${dashName}" unlinked`,
        'Dashboard Removed',
        dashName,
        undefined,
        `Workbook: ${dashboard.getCellValueAsString('Workbook') || 'N/A'}`,
      );
      showSnackbar(`Dashboard "${dashName}" unlinked`);
      onRefresh();
    } catch {
      showSnackbar('Failed to unlink dashboard', 'error');
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
          Linked Dashboards
          {dashboards.length > 0 && (
            <span className="inline-block ml-2 px-1 h-[18px] text-[0.625rem] font-mono bg-[#F2F4F8] text-[#666666] leading-[18px]">
              {dashboards.length}
            </span>
          )}
        </span>
        {!showSearch && (
          <RoleGuard permission="tickets.dashboards.create">
            <button
              onClick={() => setShowSearch(true)}
              className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 hover:opacity-80 min-h-[28px]"
            >
              <AddIcon size={14} />
              Add Dashboard
            </button>
          </RoleGuard>
        )}
      </div>

      {showSearch && (
        <div className="mb-4 border border-[rgba(202,209,211,0.3)] bg-[#FAFBFB]">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.75rem] font-semibold text-semantic-text">Search Tableau Dashboards</span>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-0.5 text-[#666666] hover:text-semantic-text">
                <CloseIcon size={14} />
              </button>
            </div>
            <div className="relative">
              <SearchIcon size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgba(67,82,84,0.5)]" />
              <input
                type="text"
                placeholder="Search by name, workbook, or folder..."
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
              />
            </div>
          </div>

          {searchQuery.trim().length >= 2 && (
            <div className="max-h-60 overflow-y-auto border-t border-[rgba(202,209,211,0.3)]">
              {searchResults.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[0.75rem] text-[rgba(67,82,84,0.5)]">No dashboards found matching "{searchQuery.trim()}"</p>
                </div>
              ) : (
                searchResults.map(dashboard => (
                  <DashboardSearchResult key={dashboard.id} dashboard={dashboard} onLink={() => handleLinkDashboard(dashboard)} linking={linking} />
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

      {dashboards.length === 0 && !showSearch ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-[rgba(202,209,211,0.5)] mb-4">
            <DashboardIcon size={40} />
          </div>
          <h3 className="text-[1rem] font-semibold text-semantic-text mb-1.5">No dashboards linked</h3>
          <p className="text-[0.875rem] text-[#666666] max-w-[280px] leading-normal mb-4">No Tableau dashboards are associated with this ticket.</p>
          <RoleGuard permission="tickets.dashboards.create">
            <button
              onClick={() => setShowSearch(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] transition-colors"
            >
              <AddIcon size={14} />
              Add Dashboard
            </button>
          </RoleGuard>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {dashboards.map(dashboard => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              onUnlink={() => handleUnlinkDashboard(dashboard)}
              unlinking={unlinkingId === dashboard.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardSearchResult({ dashboard, onLink, linking }: { dashboard: AirtableRecord; onLink: () => void; linking: boolean }) {
  const name = dashboard.getCellValueAsString('Dashboard');
  const workbook = dashboard.getCellValueAsString('Workbook');
  const folder = dashboard.getCellValueAsString('Project Folder');
  const refreshType = dashboard.getCellValueAsString('Refresh Type');
  const custom = !!dashboard.getCellValue('Custom');

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-[rgba(202,209,211,0.3)] last:border-b-0 hover:bg-[#F0F3F3] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
            <DashboardIcon size={12} style={{ color: '#17E88F' }} />
          </div>
          <span className="text-[0.75rem] font-semibold text-semantic-text truncate">{name}</span>
          {custom && (
            <span className="inline-flex items-center px-1 py-0.5 text-[0.55rem] font-semibold flex-shrink-0" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              Custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-[26px]">
          {workbook && <span className="text-[0.6rem] text-[#666666]">{workbook}</span>}
          {folder && (
            <>
              {workbook && <span className="text-[0.6rem] text-[rgba(67,82,84,0.5)]">·</span>}
              <span className="text-[0.6rem] text-[rgba(67,82,84,0.5)]">{folder}</span>
            </>
          )}
          {refreshType && (
            <span className="inline-flex items-center px-1 h-[14px] text-[0.5rem] font-medium" style={{ backgroundColor: refreshType === 'Live' ? '#E6FCE8' : '#FFF8E1', color: refreshType === 'Live' ? '#006400' : '#AF6002' }}>
              {refreshType}
            </span>
          )}
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

function DashboardCard({ dashboard, onUnlink, unlinking }: { dashboard: AirtableRecord; onUnlink: () => void; unlinking: boolean }) {
  const nameAttrs = useInspectAttrs(dashboard, 'Dashboard');
  const name = dashboard.getCellValueAsString('Dashboard');
  const workbook = dashboard.getCellValueAsString('Workbook');
  const folder = dashboard.getCellValueAsString('Project Folder');
  const refreshType = dashboard.getCellValueAsString('Refresh Type');
  const viewUrl = dashboard.getCellValueAsString('View');
  const custom = !!dashboard.getCellValue('Custom');
  const owner = dashboard.getCellValueAsString('Owner');

  return (
    <article className="p-3 bg-[#F5F7F7] border border-[rgba(202,209,211,0.3)] hover:border-core_palette-primary-1 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
            <DashboardIcon size={16} style={{ color: '#17E88F' }} />
          </div>
          <div className="min-w-0">
            <span {...nameAttrs} className="block text-[0.8125rem] font-semibold text-semantic-text truncate">{name}</span>
            {owner && <span className="block text-[0.625rem] text-[rgba(67,82,84,0.5)]">{owner}</span>}
          </div>
        </div>
        <button
          onClick={onUnlink}
          disabled={unlinking}
          className="flex-shrink-0 px-1.5 py-0.5 text-[0.6rem] text-[#666666] border border-transparent hover:border-[rgba(202,209,211,0.3)] hover:text-semantic-error opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 min-h-[24px]"
          aria-label={`Unlink dashboard ${name}`}
        >
          {unlinking ? (
            <span className="inline-block w-3 h-3 border-2 border-semantic-error border-t-transparent rounded-full animate-spin" />
          ) : 'Unlink'}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap ml-9 mb-2">
        {workbook && (
          <span className="inline-block px-1 py-0.5 text-[0.6rem] font-medium bg-[#E6EAEA] text-semantic-text">{workbook}</span>
        )}
        {folder && (
          <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">{folder}</span>
        )}
        {refreshType && (
          <span className="inline-flex items-center px-1 h-[16px] text-[0.5625rem] font-medium" style={{ backgroundColor: refreshType === 'Live' ? '#E6FCE8' : '#FFF8E1', color: refreshType === 'Live' ? '#006400' : '#AF6002' }}>
            {refreshType}
          </span>
        )}
        {custom && (
          <CheckCircleIcon size={12} style={{ color: '#006400' }} />
        )}
      </div>

      {viewUrl && (
        <div className="ml-9">
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 hover:opacity-80"
          >
            Open in Tableau
            <OpenInNewIcon size={12} />
          </a>
        </div>
      )}
    </article>
  );
}
