import React, { useState, useMemo } from 'react';
import {
  AirtableRecord,
  Table as AirtableTable,
  useRecords,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { useSnackbar } from '../components/SnackbarProvider';
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  KeyIcon,
  ShieldIcon,
} from '../components/Icons';

interface PermNode {
  id: string;
  record: AirtableRecord;
  name: string;
  key: string;
  roleIds: string[];
  roleNames: string;
}

interface RolePermissionsPageProps {
  rolePermissionsTable: AirtableTable;
  roleRecords: AirtableRecord[];
  onRefresh: () => Promise<void>;
}

export function RolePermissionsPage({ rolePermissionsTable, roleRecords, onRefresh }: RolePermissionsPageProps) {
  const { records, loading, refetch } = useRecords(rolePermissionsTable);
  const { mutate: deleteRecord } = useDeleteRecord(rolePermissionsTable);
  const { showSnackbar } = useSnackbar();

  const [showCreate, setShowCreate] = useState(false);
  const [editPerm, setEditPerm] = useState<PermNode | null>(null);
  const [permToDelete, setPermToDelete] = useState<PermNode | null>(null);
  const [filterRole, setFilterRole] = useState('');

  const roleMap = useMemo(() => {
    const m: Record<string, string> = {};
    roleRecords.forEach(r => { m[r.id] = r.getCellValueAsString('Name'); });
    return m;
  }, [roleRecords]);

  const permissions: PermNode[] = useMemo(() =>
    records.map(r => {
      const rids = getLinkedRecordIds((r as any).fields?.['Role']);
      return {
        id: r.id,
        record: r,
        name: r.getCellValueAsString('Name'),
        key: r.getCellValueAsString('Key'),
        roleIds: rids,
        roleNames: rids.map(id => roleMap[id] || '').filter(Boolean).join(', '),
      };
    }).sort((a, b) => a.key.localeCompare(b.key)),
    [records, roleMap]
  );

  const filtered = filterRole
    ? permissions.filter(p => p.roleIds.includes(filterRole))
    : permissions;

  const grouped = useMemo(() => {
    const groups: Record<string, PermNode[]> = {};
    filtered.forEach(p => {
      const prefix = p.key.split('.').slice(0, -1).join('.') || 'other';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleDelete = async () => {
    if (!permToDelete) return;
    const name = permToDelete.name;
    try {
      await deleteRecord(permToDelete.id);
      showSnackbar(`Permission "${name}" deleted`);
      setPermToDelete(null);
      refetch();
      onRefresh();
    } catch {
      showSnackbar('Failed to delete permission', 'error');
      setPermToDelete(null);
    }
  };

  const handleSaved = async () => {
    setShowCreate(false);
    setEditPerm(null);
    await refetch();
    onRefresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Permissions</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {filtered.length} permission{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterRole}
              onChange={(e: any) => setFilterRole(e.target.value)}
              aria-label="Filter by role"
              className="px-2 py-1 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            >
              <option value="">All Roles</option>
              {roleRecords.map(r => (
                <option key={r.id} value={r.id}>{r.getCellValueAsString('Name')}</option>
              ))}
            </select>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors"
            >
              <AddIcon size={14} />
              New Permission
            </button>
          </div>
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
              <KeyIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">
              {filterRole ? 'No permissions for this role' : 'No permissions yet'}
            </p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              Permissions define individual access keys that are assigned to roles.
            </p>
            <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1">
              <AddIcon size={14} />
              Add permission
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[180px]">Key</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2">Roles</th>
                <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[64px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {grouped.map(([group, perms]) => (
                <React.Fragment key={group}>
                  <tr className="bg-[#FAFBFB]">
                    <td colSpan={4} className="pl-4 py-1 text-[0.5625rem] font-semibold text-semantic-system-7 uppercase tracking-widest">
                      {group}
                    </td>
                  </tr>
                  {perms.map(perm => (
                    <PermRow
                      key={perm.id}
                      perm={perm}
                      onEdit={() => setEditPerm(perm)}
                      onDelete={() => setPermToDelete(perm)}
                    />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={4} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {filtered.length} of {permissions.length} permissions
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showCreate && (
        <PermDrawer
          mode="create"
          rolePermissionsTable={rolePermissionsTable}
          roleRecords={roleRecords}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {editPerm && (
        <PermDrawer
          mode="edit"
          rolePermissionsTable={rolePermissionsTable}
          roleRecords={roleRecords}
          editNode={editPerm}
          onClose={() => setEditPerm(null)}
          onSaved={handleSaved}
        />
      )}

      {permToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPermToDelete(null)} />
          <div className="relative bg-white p-5 w-full max-w-sm shadow-lg">
            <h3 className="text-[0.875rem] font-semibold text-semantic-text mb-1.5">Delete permission?</h3>
            <p className="text-[0.75rem] text-semantic-system-5 mb-5">
              "{permToDelete.name}" (<code className="font-mono text-[0.6875rem]">{permToDelete.key}</code>) will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPermToDelete(null)} className="px-3 py-1 text-[0.75rem] text-semantic-system-5 hover:text-semantic-text">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-3 py-1 text-[0.75rem] font-medium text-white bg-semantic-error hover:bg-[#c41414]">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermRow({ perm, onEdit, onDelete }: { perm: PermNode; onEdit: () => void; onDelete: () => void }) {
  const nameAttrs = useInspectAttrs(perm.record, 'Name');

  return (
    <tr className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]">
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
            <KeyIcon size={14} style={{ color: '#17E88F' }} />
          </div>
          <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate">{perm.name}</span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <code className="text-[0.6875rem] font-mono text-core_palette-primary-4 bg-semantic-surface px-1 py-0.5">{perm.key}</code>
      </td>
      <td className="py-1.5 px-2">
        <div className="flex flex-wrap gap-1">
          {perm.roleNames.split(', ').filter(Boolean).map(name => (
            <span key={name} className="inline-flex items-center gap-0.5 px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              <ShieldIcon size={10} style={{ color: '#006400' }} />
              {name}
            </span>
          ))}
        </div>
      </td>
      <td className="py-1.5 px-2 pr-4">
        <div className="flex justify-end gap-0.5">
          <button onClick={onEdit} className="text-semantic-system-5 hover:text-core_palette-primary-1 p-0.5" aria-label={`Edit ${perm.name}`}>
            <EditIcon size={14} />
          </button>
          <button onClick={onDelete} className="text-semantic-system-7 hover:text-semantic-error p-0.5" aria-label={`Delete ${perm.name}`}>
            <DeleteIcon size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PermDrawer({
  mode, rolePermissionsTable, roleRecords, editNode, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  rolePermissionsTable: AirtableTable;
  roleRecords: AirtableRecord[];
  editNode?: PermNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: createRecord, loading: creating } = useCreateRecord(rolePermissionsTable);
  const { mutate: updateRecord, loading: updating } = useUpdateRecord(rolePermissionsTable);
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState(editNode?.name || '');
  const [key, setKey] = useState(editNode?.key || '');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(editNode?.roleIds || []);

  const saving = creating || updating;

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !key.trim()) { showSnackbar('Name and key are required', 'error'); return; }

    const fields: Record<string, any> = {
      Name: name.trim(),
      Key: key.trim(),
      Role: selectedRoles,
    };

    if (mode === 'create') {
      const result = await createRecord(fields);
      if (result) { showSnackbar(`Permission "${name}" created`); onSaved(); }
      else showSnackbar('Failed to create permission', 'error');
    } else if (editNode) {
      const result = await updateRecord({ recordId: editNode.id, fields });
      if (result) { showSnackbar(`Permission "${name}" updated`); onSaved(); }
      else showSnackbar('Failed to update permission', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        {/* Dark header */}
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            {mode === 'create'
              ? <KeyIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Permission' : `Edit ${editNode?.name || 'Permission'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[0.75rem] text-white/60 hover:text-white">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !key.trim()}
              className="px-2.5 py-1 text-[0.75rem] font-semibold disabled:opacity-30 bg-core_palette-primary-2 text-core_palette-primary-3"
            >
              {saving ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create' : 'Save')}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
          {editNode && (
            <div className="flex items-center gap-3 pb-3 border-b border-semantic-surface">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
                <KeyIcon size={20} style={{ color: '#17E88F' }} />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-semantic-text">{editNode.name}</p>
                <p className="text-[0.6875rem] text-semantic-system-5 font-mono">{editNode.key}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Create Tickets"
              autoFocus
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
            />
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Key *</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="e.g. tickets.create"
              className="w-full px-3 py-1.5 text-[0.75rem] font-mono border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
            />
            <p className="mt-1 text-[0.625rem] text-semantic-system-7">Use dot notation: module.action</p>
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Assigned Roles</label>
            <div className="border border-semantic-surface max-h-48 overflow-auto">
              {roleRecords.map(role => {
                const isSelected = selectedRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className="flex items-center gap-2 w-full px-3 py-1 text-[0.75rem] text-left hover:bg-[#FAFBFB]"
                  >
                    <span className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-8'}`}>
                      {isSelected && (
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      )}
                    </span>
                    <span className="text-semantic-text">{role.getCellValueAsString('Name')}</span>
                    <span className="text-[0.6875rem] text-semantic-system-7 ml-auto">{role.getCellValueAsString('Description')}</span>
                  </button>
                );
              })}
            </div>
            {selectedRoles.length > 0 && (
              <p className="mt-1 text-[0.625rem] text-semantic-system-5">
                {selectedRoles.map(id => roleRecords.find(r => r.id === id)?.getCellValueAsString('Name') || id).join(', ')}
              </p>
            )}
          </div>

          {editNode && (
            <div className="mt-2 pt-3 border-t border-semantic-surface">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Statistics</span>
              <div className="flex gap-3 mt-2">
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.roleIds.length}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Assigned Roles</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
