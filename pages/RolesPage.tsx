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
  ShieldIcon,
  KeyIcon,
} from '../components/Icons';

interface RoleNode {
  id: string;
  record: AirtableRecord;
  name: string;
  description: string;
  permissionCount: number;
  memberCount: number;
}

interface RolesPageProps {
  rolesTable: AirtableTable;
  rolePermissionsTable: AirtableTable;
  rolePermissionRecords: AirtableRecord[];
  peopleRecords: AirtableRecord[];
  onRefreshRoles: () => Promise<void>;
  onRefreshPermissions: () => Promise<void>;
}

export function RolesPage({
  rolesTable,
  rolePermissionsTable,
  rolePermissionRecords,
  peopleRecords,
  onRefreshRoles,
  onRefreshPermissions,
}: RolesPageProps) {
  const { records, loading, refetch } = useRecords(rolesTable);
  const { mutate: deleteRecord } = useDeleteRecord(rolesTable);
  const { showSnackbar } = useSnackbar();

  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<RoleNode | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleNode | null>(null);

  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (peopleRecords || []).forEach(p => {
      const roleIds = getLinkedRecordIds((p as any).fields?.['Roles']);
      roleIds.forEach(rid => { counts[rid] = (counts[rid] || 0) + 1; });
    });
    return counts;
  }, [peopleRecords]);

  const roles: RoleNode[] = useMemo(() =>
    records.map(r => {
      const permCount = rolePermissionRecords.filter(p => {
        const roleIds = getLinkedRecordIds((p as any).fields?.['Role']);
        return roleIds.includes(r.id);
      }).length;
      return {
        id: r.id,
        record: r,
        name: r.getCellValueAsString('Name'),
        description: r.getCellValueAsString('Description'),
        permissionCount: permCount,
        memberCount: memberCounts[r.id] || 0,
      };
    }).sort((a, b) => a.name.localeCompare(b.name)),
    [records, rolePermissionRecords, memberCounts]
  );

  const handleDelete = async () => {
    if (!roleToDelete) return;
    const name = roleToDelete.name;
    try {
      await deleteRecord(roleToDelete.id);
      showSnackbar(`Role "${name}" deleted`);
      setRoleToDelete(null);
      refetch();
      onRefreshRoles();
    } catch {
      showSnackbar('Failed to delete role', 'error');
      setRoleToDelete(null);
    }
  };

  const handleSaved = async () => {
    setShowCreate(false);
    setEditRole(null);
    await refetch();
    onRefreshRoles();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Roles</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {roles.length} role{roles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors"
          >
            <AddIcon size={14} />
            New Role
          </button>
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-core_palette-primary-1 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
              <ShieldIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">No roles yet</p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              Roles group permissions to control what users can access.
            </p>
            <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1">
              <AddIcon size={14} />
              Add role
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2">Description</th>
                <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[100px]">Permissions</th>
                <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Members</th>
                <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[64px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {roles.map(role => (
                <RoleRow
                  key={role.id}
                  role={role}
                  onEdit={() => setEditRole(role)}
                  onDelete={() => setRoleToDelete(role)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={5} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {roles.length} of {roles.length} roles
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showCreate && (
        <RoleDrawer
          mode="create"
          rolesTable={rolesTable}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {editRole && (
        <RoleDrawer
          mode="edit"
          rolesTable={rolesTable}
          editNode={editRole}
          onClose={() => setEditRole(null)}
          onSaved={handleSaved}
        />
      )}

      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setRoleToDelete(null)} />
          <div className="relative bg-white p-5 w-full max-w-sm shadow-lg">
            <h3 className="text-[0.875rem] font-semibold text-semantic-text mb-1.5">Delete role?</h3>
            <p className="text-[0.75rem] text-semantic-system-5 mb-5">
              "{roleToDelete.name}" and its permission assignments will be removed.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRoleToDelete(null)} className="px-3 py-1 text-[0.75rem] text-semantic-system-5 hover:text-semantic-text">
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

function RoleRow({ role, onEdit, onDelete }: { role: RoleNode; onEdit: () => void; onDelete: () => void }) {
  const nameAttrs = useInspectAttrs(role.record, 'Name');
  const descAttrs = useInspectAttrs(role.record, 'Description');

  return (
    <tr className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]">
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
            <ShieldIcon size={14} style={{ color: '#17E88F' }} />
          </div>
          <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate">{role.name}</span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...descAttrs} className={`text-[0.6875rem] truncate block ${role.description ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {role.description || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <KeyIcon size={12} className="text-semantic-system-7" />
          <span className="text-[0.6875rem] font-mono text-semantic-text">{role.permissionCount}</span>
        </div>
      </td>
      <td className="py-1.5 px-2 text-center">
        <span className="text-[0.6875rem] font-mono text-semantic-text">{role.memberCount}</span>
      </td>
      <td className="py-1.5 px-2 pr-4">
        <div className="flex justify-end gap-0.5">
          <button onClick={onEdit} className="text-semantic-system-5 hover:text-core_palette-primary-1 p-0.5" aria-label={`Edit ${role.name}`}>
            <EditIcon size={14} />
          </button>
          <button onClick={onDelete} className="text-semantic-system-7 hover:text-semantic-error p-0.5" aria-label={`Delete ${role.name}`}>
            <DeleteIcon size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RoleDrawer({
  mode, rolesTable, editNode, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  rolesTable: AirtableTable;
  editNode?: RoleNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: createRecord, loading: creating } = useCreateRecord(rolesTable);
  const { mutate: updateRecord, loading: updating } = useUpdateRecord(rolesTable);
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState(editNode?.name || '');
  const [description, setDescription] = useState(editNode?.description || '');

  const saving = creating || updating;

  const handleSave = async () => {
    if (!name.trim()) { showSnackbar('Name is required', 'error'); return; }

    const fields: Record<string, any> = { Name: name.trim(), Description: description.trim() };

    if (mode === 'create') {
      const result = await createRecord(fields);
      if (result) { showSnackbar(`Role "${name}" created`); onSaved(); }
      else showSnackbar('Failed to create role', 'error');
    } else if (editNode) {
      const result = await updateRecord({ recordId: editNode.id, fields });
      if (result) { showSnackbar(`Role "${name}" updated`); onSaved(); }
      else showSnackbar('Failed to update role', 'error');
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
              ? <ShieldIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Role' : `Edit ${editNode?.name || 'Role'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[0.75rem] text-white/60 hover:text-white">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
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
                <ShieldIcon size={20} style={{ color: '#17E88F' }} />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-semantic-text">{editNode.name}</p>
                <p className="text-[0.6875rem] text-semantic-system-5">
                  {editNode.permissionCount} permission{editNode.permissionCount !== 1 ? 's' : ''} · {editNode.memberCount} member{editNode.memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Admin, Technician, Viewer"
              autoFocus
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
            />
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What can this role do?"
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1 resize-none"
            />
          </div>

          {editNode && (
            <div className="mt-2 pt-3 border-t border-semantic-surface">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Statistics</span>
              <div className="flex gap-3 mt-2">
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.permissionCount}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Permissions</p>
                </div>
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.memberCount}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Members</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
