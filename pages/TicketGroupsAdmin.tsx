import React, { useState, useMemo } from 'react';
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  FolderSpecialIcon,
  ConfirmationNumberIcon,
  CheckCircleIcon,
  CancelIcon,
  CloseIcon,
} from '../components/Icons';
import {
  AirtableRecord,
  Table as AirtableTable,
  useRecords,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useInspectAttrs,
} from '../lib/airtable-hooks';
import { useSnackbar } from '../components/SnackbarProvider';

interface GroupNode {
  id: string;
  record: AirtableRecord;
  name: string;
  description: string;
  active: boolean;
  ticketCount: number;
}

interface TicketGroupsAdminProps {
  groupsTable: AirtableTable;
  externalTicketsTable: AirtableTable;
}

export function TicketGroupsAdmin({ groupsTable, externalTicketsTable }: TicketGroupsAdminProps) {
  const { records: groups, loading, refetch } = useRecords(groupsTable);
  const { records: extTickets } = useRecords(externalTicketsTable);
  const { mutate: deleteGroup } = useDeleteRecord(groupsTable);
  const { showSnackbar } = useSnackbar();

  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<GroupNode | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<GroupNode | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const getTicketCount = (groupId: string) => {
    return extTickets.filter(t => {
      const grs = (t.getCellValue('Ticket Group') as any[]) || [];
      return grs.some((g: any) => g.id === groupId);
    }).length;
  };

  const groupNodes: GroupNode[] = useMemo(() =>
    groups.map(r => ({
      id: r.id,
      record: r,
      name: r.getCellValueAsString('Name'),
      description: r.getCellValueAsString('Description'),
      active: !!r.getCellValue('Active'),
      ticketCount: getTicketCount(r.id),
    })).filter(n => n.name)
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [groups, extTickets]
  );

  const visibleGroups = showInactive ? groupNodes : groupNodes.filter(n => n.active);
  const activeCount = groupNodes.filter(n => n.active).length;
  const inactiveCount = groupNodes.length - activeCount;

  const handleDelete = async () => {
    if (!groupToDelete) return;
    const name = groupToDelete.name;
    try {
      await deleteGroup(groupToDelete.id);
      showSnackbar(`Group "${name}" deleted`);
      setGroupToDelete(null);
      refetch();
    } catch {
      showSnackbar('Failed to delete group', 'error');
      setGroupToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderSpecialIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Ticket Groups</span>
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
            {inactiveCount > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  role="switch"
                  aria-checked={showInactive}
                  onClick={() => setShowInactive(!showInactive)}
                  className={`relative inline-flex h-4 w-8 items-center transition-colors ${showInactive ? 'bg-core_palette-primary-1' : 'bg-semantic-system-8'}`}
                >
                  <span className={`inline-block h-3 w-3 transform bg-white transition-transform ${showInactive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-[0.6875rem] text-semantic-system-5">Show inactive</span>
              </label>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors"
            >
              <AddIcon size={14} />
              New Group
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
        ) : visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
              <FolderSpecialIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">No ticket groups yet</p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              Create a group to start tracking external ServiceNow tickets.
            </p>
            <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1">
              <AddIcon size={14} />
              Add group
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2">Description</th>
                <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Ext. Tickets</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Status</th>
                <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[64px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {visibleGroups.map(node => (
                <GroupRow key={node.id} node={node} onEdit={() => setEditGroup(node)} onDelete={() => setGroupToDelete(node)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={5} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {visibleGroups.length} of {groupNodes.length} groups
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showCreate && (
        <GroupDrawer
          mode="create"
          groupsTable={groupsTable}
          onClose={() => setShowCreate(false)}
          onSaved={async () => { await refetch(); setShowCreate(false); }}
        />
      )}

      {editGroup && (
        <GroupDrawer
          mode="edit"
          groupsTable={groupsTable}
          editNode={editGroup}
          onClose={() => setEditGroup(null)}
          onSaved={async () => { await refetch(); setEditGroup(null); }}
        />
      )}

      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setGroupToDelete(null)} />
          <div className="relative bg-white p-5 w-full max-w-sm shadow-lg">
            <h3 className="text-[0.875rem] font-semibold text-semantic-text mb-1.5">Delete group?</h3>
            <p className="text-[0.75rem] text-semantic-system-5 mb-5">
              "{groupToDelete.name}" will be removed. External tickets linked to this group will remain.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGroupToDelete(null)} className="px-3 py-1 text-[0.75rem] text-semantic-system-5 hover:text-semantic-text">
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

function GroupRow({ node, onEdit, onDelete }: { node: GroupNode; onEdit: () => void; onDelete: () => void }) {
  const nameAttrs = useInspectAttrs(node.record, 'Name');
  const descAttrs = useInspectAttrs(node.record, 'Description');
  const activeAttrs = useInspectAttrs(node.record, 'Active');

  return (
    <tr
      className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]"
      style={{ opacity: node.active ? 1 : 0.55 }}
    >
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: node.active ? '#003F2D' : '#CAD1D3' }}>
            <FolderSpecialIcon size={14} style={{ color: node.active ? '#17E88F' : '#FFFFFF' }} />
          </div>
          <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate">{node.name}</span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...descAttrs} className={`text-[0.6875rem] truncate block ${node.description ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.description || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <ConfirmationNumberIcon size={12} className="text-semantic-system-7" />
          <span className="text-[0.6875rem] font-mono text-semantic-text">{node.ticketCount}</span>
        </div>
      </td>
      <td className="py-1.5 px-2" {...activeAttrs}>
        {node.active ? (
          <span className="inline-flex items-center gap-0.5 px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
            <CheckCircleIcon size={12} style={{ color: '#006400' }} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 px-1 h-[18px] text-[0.5625rem] font-medium bg-semantic-surface text-semantic-system-5">
            <CancelIcon size={12} className="text-semantic-system-5" />
            Inactive
          </span>
        )}
      </td>
      <td className="py-1.5 px-2 pr-4">
        <div className="flex justify-end gap-0.5">
          <button onClick={onEdit} className="text-semantic-system-5 hover:text-core_palette-primary-1 p-0.5" aria-label={`Edit ${node.name}`}>
            <EditIcon size={14} />
          </button>
          <button onClick={onDelete} className="text-semantic-system-7 hover:text-semantic-error p-0.5" aria-label={`Delete ${node.name}`}>
            <DeleteIcon size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function GroupDrawer({
  mode, groupsTable, editNode, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  groupsTable: AirtableTable;
  editNode?: GroupNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: createGroup, loading: creating } = useCreateRecord(groupsTable);
  const { mutate: updateGroup, loading: updating } = useUpdateRecord(groupsTable);
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState(editNode?.name || '');
  const [description, setDescription] = useState(editNode?.description || '');
  const [active, setActive] = useState(editNode ? editNode.active : true);

  const saving = creating || updating;

  const handleSave = async () => {
    if (!name.trim()) { showSnackbar('Name is required', 'error'); return; }

    const fields: Record<string, any> = { Name: name, Description: description, Active: active };

    if (mode === 'create') {
      const result = await createGroup(fields);
      if (result) { showSnackbar(`Group "${name}" created`); onSaved(); }
      else showSnackbar('Failed to create group', 'error');
    } else if (editNode) {
      const result = await updateGroup({ recordId: editNode.id, fields });
      if (result) { showSnackbar(`Group "${name}" updated`); onSaved(); }
      else showSnackbar('Failed to update group', 'error');
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
              ? <FolderSpecialIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Group' : `Edit ${editNode?.name || 'Group'}`}
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
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: editNode.active ? '#003F2D' : '#CAD1D3' }}>
                <FolderSpecialIcon size={20} style={{ color: editNode.active ? '#17E88F' : '#FFFFFF' }} />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-semantic-text">{editNode.name}</p>
                <p className="text-[0.6875rem] text-semantic-system-5">{editNode.ticketCount} external ticket{editNode.ticketCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Nike Tech, CBRE, Internal IT"
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
            />
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of this vendor/system..."
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1 resize-none"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <button
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-5 w-9 items-center flex-shrink-0 mt-0.5 transition-colors ${active ? 'bg-core_palette-primary-1' : 'bg-semantic-system-8'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <div>
              <p className="text-[0.75rem] text-semantic-text">Active</p>
              <p className="text-[0.6875rem] text-semantic-system-5">
                {active ? 'This group is available for linking external tickets' : 'This group will not appear in external ticket forms'}
              </p>
            </div>
          </label>

          {editNode && (
            <div className="mt-2 pt-3 border-t border-semantic-surface">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Statistics</span>
              <div className="flex gap-3 mt-2">
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.ticketCount}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">External Tickets</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
