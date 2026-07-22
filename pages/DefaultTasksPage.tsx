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
import { Category } from '../types';
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  PlaylistAddCheckIcon,
} from '../components/Icons';

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  'Low': { bg: '#F2F4F8', text: '#666666' },
  'Medium': { bg: '#FFF8E1', text: '#AF6002' },
  'High': { bg: '#FDE8E8', text: '#B10F41' },
  'Critical': { bg: '#F3E0FF', text: '#6231AE' },
};

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

interface DefaultTaskNode {
  id: string;
  record: AirtableRecord;
  name: string;
  priority: string;
  categoryIds: string[];
  categoryNames: string;
}

interface DefaultTasksPageProps {
  defaultTasksTable: AirtableTable;
  categories: Category[];
}

export function DefaultTasksPage({ defaultTasksTable, categories }: DefaultTasksPageProps) {
  const { records, loading, refetch } = useRecords(defaultTasksTable);
  const { mutate: deleteRecord } = useDeleteRecord(defaultTasksTable);
  const { showSnackbar } = useSnackbar();

  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<DefaultTaskNode | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<DefaultTaskNode | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  const tasks: DefaultTaskNode[] = useMemo(() =>
    records.map(r => {
      const catIds = getLinkedRecordIds((r as any).fields?.['Category']);
      const catNames = catIds.map(id => {
        const cat = categories.find(c => c.id === id);
        return cat?.name || '';
      }).filter(Boolean).join(', ');
      return {
        id: r.id,
        record: r,
        name: r.getCellValueAsString('Name'),
        priority: r.getCellValueAsString('Priority'),
        categoryIds: catIds,
        categoryNames: catNames,
      };
    }).sort((a, b) => a.name.localeCompare(b.name)),
    [records, categories]
  );

  const filtered = filterCategory
    ? tasks.filter(t => t.categoryIds.includes(filterCategory))
    : tasks;

  const categoriesWithTasks = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => t.categoryIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
    return categories
      .filter(c => counts[c.id])
      .map(c => ({ ...c, count: counts[c.id] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, categories]);

  const handleDelete = async () => {
    if (!taskToDelete) return;
    const name = taskToDelete.name;
    try {
      await deleteRecord(taskToDelete.id);
      showSnackbar(`Default task "${name}" deleted`);
      setTaskToDelete(null);
      refetch();
    } catch {
      showSnackbar('Failed to delete default task', 'error');
      setTaskToDelete(null);
    }
  };

  const handleSaved = () => {
    setShowCreate(false);
    setEditTask(null);
    refetch();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlaylistAddCheckIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Default Tasks</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium" style={{ backgroundColor: '#E6FCE8', color: '#006400' }}>
              {filtered.length} task{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e: any) => setFilterCategory(e.target.value)}
              aria-label="Filter by category"
              className="px-2 py-1 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            >
              <option value="">All Categories</option>
              {categoriesWithTasks.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
              ))}
            </select>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors"
            >
              <AddIcon size={14} />
              New Default Task
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
              <PlaylistAddCheckIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">
              {filterCategory ? 'No default tasks for this category' : 'No default tasks yet'}
            </p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              Default tasks are automatically added to new tickets when a category is selected.
            </p>
            <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1">
              <AddIcon size={14} />
              Add default task
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[100px]">Priority</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2">Categories</th>
                <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[64px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filtered.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={() => setEditTask(task)}
                  onDelete={() => setTaskToDelete(task)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={4} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {filtered.length} of {tasks.length} default tasks
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showCreate && (
        <DefaultTaskDrawer
          mode="create"
          defaultTasksTable={defaultTasksTable}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {editTask && (
        <DefaultTaskDrawer
          mode="edit"
          defaultTasksTable={defaultTasksTable}
          categories={categories}
          editNode={editTask}
          onClose={() => setEditTask(null)}
          onSaved={handleSaved}
        />
      )}

      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setTaskToDelete(null)} />
          <div className="relative bg-white p-5 w-full max-w-sm shadow-lg">
            <h3 className="text-[0.875rem] font-semibold text-semantic-text mb-1.5">Delete default task?</h3>
            <p className="text-[0.75rem] text-semantic-system-5 mb-5">
              "{taskToDelete.name}" will be permanently removed. Existing tickets will not be affected.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setTaskToDelete(null)} className="px-3 py-1 text-[0.75rem] text-semantic-system-5 hover:text-semantic-text">
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

function TaskRow({ task, onEdit, onDelete }: { task: DefaultTaskNode; onEdit: () => void; onDelete: () => void }) {
  const nameAttrs = useInspectAttrs(task.record, 'Name');
  const prioColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['Medium'];

  return (
    <tr className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]">
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
            <PlaylistAddCheckIcon size={14} style={{ color: '#17E88F' }} />
          </div>
          <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate">{task.name}</span>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium" style={{ backgroundColor: prioColor.bg, color: prioColor.text }}>
          {task.priority}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <div className="flex flex-wrap gap-1">
          {task.categoryNames.split(', ').filter(Boolean).map(name => (
            <span key={name} className="inline-flex items-center px-1 h-[18px] text-[0.5625rem] font-medium bg-semantic-surface text-semantic-system-5">
              {name}
            </span>
          ))}
        </div>
      </td>
      <td className="py-1.5 px-2 pr-4">
        <div className="flex justify-end gap-0.5">
          <button onClick={onEdit} className="text-semantic-system-5 hover:text-core_palette-primary-1 p-0.5" aria-label={`Edit ${task.name}`}>
            <EditIcon size={14} />
          </button>
          <button onClick={onDelete} className="text-semantic-system-7 hover:text-semantic-error p-0.5" aria-label={`Delete ${task.name}`}>
            <DeleteIcon size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function DefaultTaskDrawer({
  mode, defaultTasksTable, categories, editNode, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  defaultTasksTable: AirtableTable;
  categories: Category[];
  editNode?: DefaultTaskNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: createRecord, loading: creating } = useCreateRecord(defaultTasksTable);
  const { mutate: updateRecord, loading: updating } = useUpdateRecord(defaultTasksTable);
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState(editNode?.name || '');
  const [priority, setPriority] = useState(editNode?.priority || 'Medium');
  const [selectedCats, setSelectedCats] = useState<string[]>(editNode?.categoryIds || []);

  const saving = creating || updating;

  const toggleCategory = (catId: string) => {
    setSelectedCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { showSnackbar('Name is required', 'error'); return; }
    if (selectedCats.length === 0) { showSnackbar('Select at least one category', 'error'); return; }

    const fields: Record<string, any> = {
      Name: name.trim(),
      Priority: priority,
      Category: selectedCats,
    };

    if (mode === 'create') {
      const result = await createRecord(fields);
      if (result) { showSnackbar(`Default task "${name}" created`); onSaved(); }
      else showSnackbar('Failed to create default task', 'error');
    } else if (editNode) {
      const result = await updateRecord({ recordId: editNode.id, fields });
      if (result) { showSnackbar(`Default task "${name}" updated`); onSaved(); }
      else showSnackbar('Failed to update default task', 'error');
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
              ? <PlaylistAddCheckIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Default Task' : `Edit ${editNode?.name || 'Default Task'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[0.75rem] text-white/60 hover:text-white">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || selectedCats.length === 0}
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
                <PlaylistAddCheckIcon size={20} style={{ color: '#17E88F' }} />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-semantic-text">{editNode.name}</p>
                <p className="text-[0.6875rem] text-semantic-system-5">
                  {editNode.priority} priority · {editNode.categoryIds.length} categor{editNode.categoryIds.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Task Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Verify issue reported..."
              autoFocus
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
            />
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e: any) => setPriority(e.target.value)}
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            >
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Assigned Categories *</label>
            <div className="border border-semantic-surface max-h-48 overflow-auto">
              {categories.filter(c => c.name).sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className="flex items-center gap-2 w-full px-3 py-1 text-[0.75rem] text-left hover:bg-[#FAFBFB]"
                >
                  <span className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 ${selectedCats.includes(c.id) ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-8'}`}>
                    {selectedCats.includes(c.id) && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    )}
                  </span>
                  <span className="text-semantic-text">{c.name}</span>
                  {c.description && (
                    <span className="text-[0.6875rem] text-semantic-system-7 ml-auto truncate max-w-[200px]">{c.description}</span>
                  )}
                </button>
              ))}
            </div>
            {selectedCats.length > 0 && (
              <p className="mt-1 text-[0.625rem] text-semantic-system-5">
                {selectedCats.map(id => categories.find(c => c.id === id)?.name || id).join(', ')}
              </p>
            )}
          </div>

          {editNode && (
            <div className="mt-2 pt-3 border-t border-semantic-surface">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Statistics</span>
              <div className="flex gap-3 mt-2">
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.categoryIds.length}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Categories</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
