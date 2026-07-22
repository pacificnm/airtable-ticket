import React, { useState, useMemo } from 'react';
import {
  PeopleIcon,
  PersonIcon,
  SearchIcon,
  CheckCircleIcon,
  CancelIcon,
  EditIcon,
  CloseIcon,
  ShieldIcon,
} from '../components/Icons';
import {
  AirtableRecord,
  Table,
  useRecords,
  useUpdateRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { useSnackbar } from '../components/SnackbarProvider';

interface PeoplePageProps {
  peopleTable: Table;
  roleRecords: AirtableRecord[];
}

interface PersonNode {
  id: string;
  record: AirtableRecord;
  name: string;
  workEmailNike: string;
  workEmailCbre: string;
  department: string;
  team: string;
  status: string;
  serviceLine: string;
  node: string;
  workPhone: string;
  roleIds: string[];
}

export function PeoplePage({ peopleTable, roleRecords }: PeoplePageProps) {
  const { records: peopleRecords, loading, refetch: refetchPeople } = useRecords(peopleTable);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'inactive'>('all');
  const [editPerson, setEditPerson] = useState<PersonNode | null>(null);

  const roleMap = useMemo(() => {
    const map: Record<string, string> = {};
    roleRecords.forEach(r => { map[r.id] = r.getCellValueAsString('Name'); });
    return map;
  }, [roleRecords]);

  const personNodes: PersonNode[] = useMemo(() =>
    peopleRecords.map(r => ({
      id: r.id,
      record: r,
      name: r.getCellValueAsString('Name'),
      workEmailNike: r.getCellValueAsString('Work Email (Nike)'),
      workEmailCbre: r.getCellValueAsString('Work Email (CBRE)'),
      department: r.getCellValueAsString('Department'),
      team: r.getCellValueAsString('Team'),
      status: r.getCellValueAsString('Status'),
      serviceLine: r.getCellValueAsString('Service Line'),
      node: r.getCellValueAsString('Node'),
      workPhone: r.getCellValueAsString('Work Phone'),
      roleIds: getLinkedRecordIds((r as any).fields?.['Roles']),
    })).filter(n => n.name)
      .sort((a, b) => {
        const aActive = a.status === 'Active' ? 0 : 1;
        const bActive = b.status === 'Active' ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return a.name.localeCompare(b.name);
      }),
    [peopleRecords]
  );

  const filteredPeople = useMemo(() => {
    let list = personNodes;
    if (statusFilter === 'Active') list = list.filter(n => n.status === 'Active');
    else if (statusFilter === 'inactive') list = list.filter(n => n.status !== 'Active');
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.workEmailNike.toLowerCase().includes(q) ||
        n.workEmailCbre.toLowerCase().includes(q) ||
        n.department.toLowerCase().includes(q) ||
        n.team.toLowerCase().includes(q)
      );
    }
    return list;
  }, [personNodes, search, statusFilter]);

  const activeCount = personNodes.filter(n => n.status === 'Active').length;
  const inactiveCount = personNodes.length - activeCount;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PeopleIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">People</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {activeCount} active
            </span>
            {inactiveCount > 0 && (
              <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium bg-semantic-surface text-semantic-system-5">
                {inactiveCount} inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-semantic-system-7" />
              <input
                type="text"
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="pl-7 pr-3 py-1 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors w-[200px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-core_palette-primary-1 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
              <PeopleIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">
              {search.trim() ? 'No people match your search' : 'No people found'}
            </p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              {search.trim() ? 'Try adjusting your search terms.' : 'People records will appear here.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[180px]">Work Email (Nike)</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[180px]">Work Email (CBRE)</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[120px]">Department</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[140px]">Roles</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Status</th>
                <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[40px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredPeople.map(node => (
                <PersonRow key={node.id} node={node} roleMap={roleMap} onEdit={() => setEditPerson(node)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={7} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {filteredPeople.length} of {personNodes.length} people
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {editPerson && (
        <PersonRolesDrawer
          person={editPerson}
          peopleTable={peopleTable}
          roleRecords={roleRecords}
          roleMap={roleMap}
          onClose={() => setEditPerson(null)}
          onSaved={async () => { await refetchPeople(); setEditPerson(null); }}
        />
      )}
    </div>
  );
}

function PersonRow({ node, roleMap, onEdit }: { node: PersonNode; roleMap: Record<string, string>; onEdit: () => void }) {
  const nameAttrs = useInspectAttrs(node.record, 'Name');
  const nikeEmailAttrs = useInspectAttrs(node.record, 'Work Email (Nike)');
  const cbreEmailAttrs = useInspectAttrs(node.record, 'Work Email (CBRE)');
  const departmentAttrs = useInspectAttrs(node.record, 'Department');
  const statusAttrs = useInspectAttrs(node.record, 'Status');

  const isActive = node.status === 'Active';
  const roleNames = node.roleIds.map(id => roleMap[id]).filter(Boolean);

  return (
    <tr
      className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]"
      style={{ opacity: isActive ? 1 : 0.55 }}
    >
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? '#003F2D' : '#CAD1D3' }}>
            <PersonIcon size={14} style={{ color: isActive ? '#17E88F' : '#FFFFFF' }} />
          </div>
          <span {...nameAttrs} className="block text-[0.75rem] font-medium text-semantic-text truncate">{node.name}</span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...nikeEmailAttrs} className={`text-[0.6875rem] truncate block ${node.workEmailNike ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.workEmailNike || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...cbreEmailAttrs} className={`text-[0.6875rem] truncate block ${node.workEmailCbre ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.workEmailCbre || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...departmentAttrs} className={`text-[0.6875rem] truncate block ${node.department ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.department || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        {roleNames.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {roleNames.map((name, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 h-[18px] text-[0.5625rem] font-medium bg-[#EDE8F5] text-[#5B2D8E]">
                <ShieldIcon size={10} />
                {name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">—</span>
        )}
      </td>
      <td className="py-1.5 px-2" {...statusAttrs}>
        {isActive ? (
          <span className="inline-flex items-center gap-0.5 px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
            <CheckCircleIcon size={12} style={{ color: '#006400' }} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 px-1 h-[18px] text-[0.5625rem] font-medium bg-semantic-surface text-semantic-system-5">
            <CancelIcon size={12} className="text-semantic-system-5" />
            {node.status || 'Inactive'}
          </span>
        )}
      </td>
      <td className="py-1.5 px-2 pr-4">
        <div className="flex justify-end">
          <button onClick={onEdit} className="text-semantic-system-5 hover:text-core_palette-primary-1 p-0.5" aria-label={`Edit roles for ${node.name}`}>
            <EditIcon size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PersonRolesDrawer({
  person, peopleTable, roleRecords, roleMap, onClose, onSaved,
}: {
  person: PersonNode;
  peopleTable: Table;
  roleRecords: AirtableRecord[];
  roleMap: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: updatePerson, loading: saving } = useUpdateRecord(peopleTable);
  const { showSnackbar } = useSnackbar();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(person.roleIds);

  const sortedRoles = useMemo(() =>
    roleRecords.map(r => ({
      id: r.id,
      name: r.getCellValueAsString('Name'),
      description: r.getCellValueAsString('Description'),
    })).filter(r => r.name).sort((a, b) => a.name.localeCompare(b.name)),
    [roleRecords]
  );

  const handleToggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    const fields: Record<string, any> = {
      Roles: selectedRoles.length > 0 ? selectedRoles : [],
    };
    const result = await updatePerson({ recordId: person.id, fields });
    if (result) {
      showSnackbar(`Roles updated for ${person.name}`);
      onSaved();
    } else {
      showSnackbar('Failed to update roles', 'error');
    }
  };

  const hasChanges = JSON.stringify([...selectedRoles].sort()) !== JSON.stringify([...person.roleIds].sort());

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        {/* Header */}
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <ShieldIcon size={16} style={{ color: '#17E88F' }} />
            <span className="text-[0.8125rem] font-semibold font-sans">
              Assign Roles — {person.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[0.75rem] text-white/60 hover:text-white">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-2.5 py-1 text-[0.75rem] font-semibold disabled:opacity-30 bg-core_palette-primary-2 text-core_palette-primary-3"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Person info */}
        <div className="px-4 py-3 border-b border-semantic-surface bg-[#FAFBFB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: person.status === 'Active' ? '#003F2D' : '#CAD1D3' }}>
              <PersonIcon size={20} style={{ color: person.status === 'Active' ? '#17E88F' : '#FFFFFF' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-semibold text-semantic-text">{person.name}</p>
              <p className="text-[0.6875rem] text-semantic-system-5 truncate">
                {person.workEmailNike || person.workEmailCbre || '—'}
                {person.department ? ` · ${person.department}` : ''}
                {person.team ? ` · ${person.team}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Role list */}
        <div className="flex-1 overflow-auto px-4 py-4">
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-semantic-system-7 mb-2">
            Assign Roles ({selectedRoles.length} selected)
          </label>

          {sortedRoles.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldIcon size={24} className="text-semantic-system-8 mx-auto mb-2" />
              <p className="text-[0.8125rem] text-semantic-system-5">No roles available</p>
              <p className="text-[0.75rem] text-semantic-system-7">Create roles in the Roles page first.</p>
            </div>
          ) : (
            <div className="border border-semantic-surface">
              {sortedRoles.map(role => {
                const isSelected = selectedRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => handleToggleRole(role.id)}
                    className={`flex items-start gap-2.5 w-full px-3 py-2 text-left transition-colors border-b border-semantic-surface last:border-b-0 ${
                      isSelected ? 'bg-[#F5F9F8]' : 'hover:bg-[#FAFBFB]'
                    }`}
                  >
                    <span className={`w-4 h-4 mt-0.5 border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-8'
                    }`}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <ShieldIcon size={12} className={isSelected ? 'text-core_palette-primary-1' : 'text-semantic-system-7'} />
                        <span className={`text-[0.75rem] font-medium ${isSelected ? 'text-core_palette-primary-1' : 'text-semantic-text'}`}>
                          {role.name}
                        </span>
                      </div>
                      {role.description && (
                        <p className="text-[0.6875rem] text-semantic-system-5 mt-0.5 line-clamp-2">{role.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedRoles.length > 0 && (
            <div className="mt-3">
              <span className="text-[0.625rem] text-semantic-system-7">
                Selected: {selectedRoles.map(id => roleMap[id] || id).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
