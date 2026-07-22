import React, { useState } from 'react';
import {
  AirtableRecord,
  Table,
  useUpdateRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { useLogHistory } from '../hooks/useEventBus';
import { useSnackbar } from './SnackbarProvider';
import { RoleGuard } from './RoleGuard';
import { AddIcon, CloseIcon, SearchIcon, AppsIcon, ArrowBackIcon, CheckCircleIcon, CancelIcon, LinkIcon } from './Icons';

const SOFTWARE_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Active': { bg: '#E6FCE8', text: '#006400', dot: '#048A0E' },
  'Not Active': { bg: '#FDE8E8', text: '#B10F41', dot: '#E81717' },
};

const SOFTWARE_TYPE_COLORS: Record<string, string> = {
  'Desktop Application': '#166EE1',
  'Mobile Application': '#2E7D87',
  'SaaS/Cloud Application': '#7C37EF',
  'System Application': '#003F2D',
  'Airtable Tool': '#AF6002',
  'Smartsheet Tool': '#538184',
  'Excel Tool': '#006400',
  'Unknown': '#999',
};

const COMPLIANCE_COLORS: Record<string, { bg: string; text: string }> = {
  'Compliant': { bg: '#E6FCE8', text: '#006400' },
  'Not Compliant': { bg: '#FDE8E8', text: '#B10F41' },
  'Unknown': { bg: '#FFF8E1', text: '#AF6002' },
};

export interface TicketSoftwareTabProps {
  software: AirtableRecord[];
  allSoftware: AirtableRecord[];
  ticket: AirtableRecord;
  ticketsTable: Table;
  onRefresh: () => void;
}

export function TicketSoftwareTab({ software, allSoftware, ticket, ticketsTable, onRefresh }: TicketSoftwareTabProps) {
  const [selectedSoftware, setSelectedSoftware] = useState<AirtableRecord | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [linking, setLinking] = useState(false);
  const { mutate: updateTicket } = useUpdateRecord(ticketsTable);
  const { showSnackbar } = useSnackbar();
  const logHistory = useLogHistory();

  const linkedSoftwareIds = new Set(software.map(s => s.id));

  const searchResults = searchQuery.trim().length >= 2
    ? allSoftware.filter(sw => {
        if (linkedSoftwareIds.has(sw.id)) return false;
        const name = sw.getCellValueAsString('Name').toLowerCase();
        const vendor = sw.getCellValueAsString('Vendor').toLowerCase();
        const query = searchQuery.trim().toLowerCase();
        return name.includes(query) || vendor.includes(query);
      }).slice(0, 20)
    : [];

  const handleLinkSoftware = async (sw: AirtableRecord) => {
    setLinking(true);
    try {
      const currentSoftwareIds = getLinkedRecordIds(ticket.fields['Software']);
      await updateTicket({
        recordId: ticket.id,
        fields: { Software: [...currentSoftwareIds, sw.id], 'Last Modified': new Date().toISOString() },
      });
      await logHistory(
        ticket.id,
        `Software "${sw.getCellValueAsString('Name')}" added`,
        'Software Added',
        undefined,
        sw.getCellValueAsString('Name'),
        `Vendor: ${sw.getCellValueAsString('Vendor') || 'N/A'} | Type: ${sw.getCellValueAsString('Software Type') || 'N/A'}`,
      );
      showSnackbar(`Software "${sw.getCellValueAsString('Name')}" linked to ticket`);
      setSearchQuery('');
      setShowSearch(false);
      onRefresh();
    } catch {
      showSnackbar('Failed to link software', 'error');
    } finally {
      setLinking(false);
    }
  };

  if (selectedSoftware) {
    return <SoftwareDetailView software={selectedSoftware} onBack={() => setSelectedSoftware(null)} />;
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
          Linked Software
          {software.length > 0 && (
            <span className="inline-block ml-2 px-1 h-[18px] text-[0.625rem] font-mono bg-[#F2F4F8] text-[#666666] leading-[18px]">
              {software.length}
            </span>
          )}
        </span>
        {!showSearch && (
          <RoleGuard permission="tickets.software.create">
            <button onClick={() => setShowSearch(true)} className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 hover:opacity-80 min-h-[28px]">
              <AddIcon size={14} />
              Add Software
            </button>
          </RoleGuard>
        )}
      </div>

      {showSearch && (
        <div className="mb-4 border border-[rgba(202,209,211,0.3)] bg-[#FAFBFB]">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.75rem] font-semibold text-semantic-text">Search by Name or Vendor</span>
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-0.5 text-[#666666] hover:text-semantic-text">
                <CloseIcon size={14} />
              </button>
            </div>
            <div className="relative">
              <SearchIcon size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgba(67,82,84,0.5)]" />
              <input
                type="text"
                placeholder="Enter software name or vendor..."
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
                  <p className="text-[0.75rem] text-[rgba(67,82,84,0.5)]">No software found matching "{searchQuery.trim()}"</p>
                </div>
              ) : (
                searchResults.map(sw => (
                  <SoftwareSearchResult key={sw.id} software={sw} onLink={() => handleLinkSoftware(sw)} linking={linking} />
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

      {software.length === 0 && !showSearch ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-[rgba(202,209,211,0.5)] mb-4">
            <AppsIcon size={40} />
          </div>
          <h3 className="text-[1rem] font-semibold text-semantic-text mb-1.5">No software linked</h3>
          <p className="text-[0.875rem] text-[#666666] max-w-[280px] leading-normal mb-4">No software applications are associated with this ticket.</p>
          <RoleGuard permission="tickets.software.create">
            <button onClick={() => setShowSearch(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] transition-colors">
              <AddIcon size={14} />
              Add Software
            </button>
          </RoleGuard>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {software.map(sw => (
            <SoftwareCard key={sw.id} software={sw} onSelect={() => setSelectedSoftware(sw)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SoftwareSearchResult({ software, onLink, linking }: { software: AirtableRecord; onLink: () => void; linking: boolean }) {
  const name = software.getCellValueAsString('Name');
  const vendor = software.getCellValueAsString('Vendor');
  const status = software.getCellValueAsString('Status');
  const accessType = software.getCellValueAsString('Access Type');
  const typeVal = software.getCellValue('Software Type') as any;
  const typeNames: string[] = Array.isArray(typeVal)
    ? typeVal.map((t: any) => (typeof t === 'string' ? t : t?.name || '')).filter(Boolean)
    : [];
  const firstType = typeNames[0] || '';

  const statusColor = SOFTWARE_STATUS_COLORS[status] || SOFTWARE_STATUS_COLORS['Active'];
  const typeColor = SOFTWARE_TYPE_COLORS[firstType] || '#999';

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-[rgba(202,209,211,0.3)] last:border-b-0 hover:bg-[#F0F3F3] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <AppsIcon size={14} className="flex-shrink-0" style={{ color: typeColor }} />
          <span className="text-[0.75rem] font-semibold text-semantic-text truncate">{name}</span>
          <span className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.55rem] font-semibold flex-shrink-0" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-5">
          {firstType && (
            <span className="inline-block px-1 py-0.5 text-[0.55rem] font-medium" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>{firstType}</span>
          )}
          {vendor && <span className="text-[0.6rem] text-[#666666]">{vendor}</span>}
        </div>
        {accessType && (
          <div className="ml-5 mt-0.5">
            <span className="text-[0.6rem] text-[rgba(67,82,84,0.5)]">Access: {accessType}</span>
          </div>
        )}
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

function SoftwareCard({ software, onSelect }: { software: AirtableRecord; onSelect: () => void }) {
  const nameAttrs = useInspectAttrs(software, 'Name');
  const name = software.getCellValueAsString('Name');
  const vendor = software.getCellValueAsString('Vendor');
  const status = software.getCellValueAsString('Status');
  const accessType = software.getCellValueAsString('Access Type');
  const passwordPolicy = software.getCellValueAsString('Password Policy');
  const typeVal = software.getCellValue('Software Type') as any;
  const typeNames: string[] = Array.isArray(typeVal)
    ? typeVal.map((t: any) => (typeof t === 'string' ? t : t?.name || '')).filter(Boolean)
    : [];

  const statusColor = SOFTWARE_STATUS_COLORS[status] || SOFTWARE_STATUS_COLORS['Active'];
  const firstType = typeNames[0] || '';
  const typeColor = SOFTWARE_TYPE_COLORS[firstType] || '#999';

  return (
    <button
      onClick={onSelect}
      className="block w-full text-left p-3 bg-[#F5F7F7] border border-[rgba(202,209,211,0.3)] cursor-pointer hover:border-core_palette-primary-1 hover:bg-[#EFF3F3] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <AppsIcon size={16} className="flex-shrink-0" style={{ color: typeColor }} />
          <span {...nameAttrs} className="text-[0.8125rem] font-semibold text-semantic-text truncate">{name}</span>
        </div>
        <span className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.6rem] font-semibold flex-shrink-0" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
          {status}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap ml-6 mb-1">
        {typeNames.map(t => {
          const tc = SOFTWARE_TYPE_COLORS[t] || '#999';
          return (
            <span key={t} className="inline-block px-1 py-0.5 text-[0.6rem] font-medium" style={{ backgroundColor: `${tc}15`, color: tc }}>{t}</span>
          );
        })}
        {vendor && <span className="text-[0.6875rem] text-[#666666]">{vendor}</span>}
      </div>
      <div className="flex items-center gap-3 ml-6">
        {accessType && <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">Access: {accessType}</span>}
        {passwordPolicy && (
          <>
            {accessType && <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">&bull;</span>}
            <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">{passwordPolicy}</span>
          </>
        )}
      </div>
    </button>
  );
}

function SoftwareDetailView({ software, onBack }: { software: AirtableRecord; onBack: () => void }) {
  const nameAttrs = useInspectAttrs(software, 'Name');
  const name = software.getCellValueAsString('Name');
  const vendor = software.getCellValueAsString('Vendor');
  const status = software.getCellValueAsString('Status');
  const website = software.getCellValueAsString('Website');
  const phone = software.getCellValueAsString('Phone');
  const email = software.getCellValueAsString('Email');
  const url = software.getCellValueAsString('URL');
  const passwordPolicy = software.getCellValueAsString('Password Policy');
  const passwordCompliant = software.getCellValueAsString('Password Compliant');
  const accessType = software.getCellValueAsString('Access Type');
  const dashlane = !!software.getCellValue('Dashlane');
  const notes = software.getCellValueAsString('Notes');
  const services = software.getCellValueAsString('Services');
  const typeVal = software.getCellValue('Software Type') as any;
  const typeNames: string[] = Array.isArray(typeVal)
    ? typeVal.map((t: any) => (typeof t === 'string' ? t : t?.name || '')).filter(Boolean)
    : [];
  const firstType = typeNames[0] || '';

  const statusColor = SOFTWARE_STATUS_COLORS[status] || SOFTWARE_STATUS_COLORS['Active'];
  const typeColor = SOFTWARE_TYPE_COLORS[firstType] || '#999';
  const complianceColor = COMPLIANCE_COLORS[passwordCompliant] || { bg: '#F2F4F8', text: '#616670' };

  const infoFields: { label: string; value: string }[] = [
    { label: 'Vendor', value: vendor },
    { label: 'Software Type', value: typeNames.join(', ') },
    { label: 'Services', value: services },
  ].filter(f => f.value);

  const contactFields: { label: string; value: string; isLink?: boolean }[] = [
    { label: 'Website', value: website },
    { label: 'Phone', value: phone },
    { label: 'Email', value: email },
    { label: 'URL', value: url, isLink: true },
  ].filter(f => f.value);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[rgba(202,209,211,0.3)] bg-[#F5F7F7]">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 mb-1.5 -ml-1.5 hover:opacity-80">
          <ArrowBackIcon size={14} />
          Back to software
        </button>
        <div className="flex items-center gap-2 mb-1.5">
          <AppsIcon size={18} style={{ color: typeColor }} />
          <h3 {...nameAttrs} className="text-[1rem] text-semantic-text leading-tight">{name}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.6rem] font-semibold" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
            {status}
          </span>
          {typeNames.map(t => {
            const tc = SOFTWARE_TYPE_COLORS[t] || '#999';
            return (
              <span key={t} className="inline-block px-1 py-0.5 text-[0.6rem] font-medium" style={{ backgroundColor: `${tc}15`, color: tc }}>{t}</span>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        {infoFields.length > 0 && (
          <div className="mb-5">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-2">General</span>
            <div className="grid grid-cols-2 gap-3">
              {infoFields.map(f => (
                <div key={f.label}>
                  <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">{f.label}</span>
                  <p className="text-[0.8125rem] text-semantic-text break-words">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {contactFields.length > 0 && (
          <div className="mb-5">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-2">Vendor Contact</span>
            <div className="grid grid-cols-2 gap-3">
              {contactFields.map(f => (
                <div key={f.label}>
                  <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">{f.label}</span>
                  {f.isLink ? (
                    <a
                      href={f.value.startsWith('http') ? f.value : `https://${f.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[0.8125rem] text-[#003F2D] underline break-all hover:text-[#17E88F]"
                    >
                      {f.value}
                      <LinkIcon size={14} />
                    </a>
                  ) : (
                    <p className="text-[0.8125rem] text-semantic-text break-words">{f.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-2">Access & Security</span>
          <div className="grid grid-cols-2 gap-3">
            {passwordPolicy && (
              <div>
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Password Policy</span>
                <p className="text-[0.8125rem] text-semantic-text">{passwordPolicy}</p>
              </div>
            )}
            {passwordCompliant && (
              <div>
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Password Compliant</span>
                <span className="inline-block px-1.5 py-0.5 text-[0.6875rem] font-medium" style={{ backgroundColor: complianceColor.bg, color: complianceColor.text }}>
                  {passwordCompliant}
                </span>
              </div>
            )}
            {accessType && (
              <div>
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Access Type</span>
                <p className="text-[0.8125rem] text-semantic-text">{accessType}</p>
              </div>
            )}
            <div>
              <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Dashlane</span>
              <div className="flex items-center gap-1">
                {dashlane ? (
                  <CheckCircleIcon size={16} className="text-[#006400]" />
                ) : (
                  <CancelIcon size={16} className="text-[#9B1C31]" />
                )}
                <span className="text-[0.8125rem] text-semantic-text">{dashlane ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        {notes && (
          <div className="mb-4">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1.5">Notes</span>
            <p className="text-[0.8125rem] text-[#666666] leading-relaxed whitespace-pre-wrap bg-[#F5F7F7] p-3 border border-[rgba(202,209,211,0.15)]">{notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
