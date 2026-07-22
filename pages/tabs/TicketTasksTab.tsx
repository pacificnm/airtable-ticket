import React, { useState } from 'react';
import {
  AirtableRecord,
  Table,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useInspectAttrs,
} from '../../lib/airtable-hooks';
import { useSnackbar } from '../../components/SnackbarProvider';
import { RoleGuard } from '../../components/RoleGuard';
import { AddIcon, EditIcon, DeleteIcon, CloseIcon, CheckCircleIcon } from '../../components/Icons';

const TASK_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Todo': { bg: '#F2F4F8', text: '#435254', dot: '#999999' },
  'In Progress': { bg: '#E3F2FD', text: '#0D47A1', dot: '#1976D2' },
  'Done': { bg: '#E6FCE8', text: '#006400', dot: '#048A0E' },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  'Low': { bg: '#F2F4F8', text: '#666666' },
  'Medium': { bg: '#FFF8E1', text: '#AF6002' },
  'High': { bg: '#FDE8E8', text: '#B10F41' },
  'Critical': { bg: '#F3E0FF', text: '#6231AE' },
};

const STATUS_OPTIONS = ['Todo', 'In Progress', 'Done'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export interface TicketTasksTabProps {
  tasks: AirtableRecord[];
  tasksTable: Table;
  ticketId: string;
  technicians: { id: string; name: string; active: boolean }[];
  onRefresh: () => void;
}

export function TicketTasksTab({ tasks, tasksTable, ticketId, technicians, onRefresh }: TicketTasksTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<AirtableRecord | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<AirtableRecord | null>(null);
  const { mutate: createTask } = useCreateRecord(tasksTable);
  const { mutate: updateTask } = useUpdateRecord(tasksTable);
  const { mutate: deleteTask } = useDeleteRecord(tasksTable);
  const { showSnackbar } = useSnackbar();

  const doneCount = tasks.filter(t => t.getCellValueAsString('Status') === 'Done').length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder: Record<string, number> = { 'In Progress': 0, 'Todo': 1, 'Done': 2 };
    const sa = statusOrder[a.getCellValueAsString('Status')] ?? 1;
    const sb = statusOrder[b.getCellValueAsString('Status')] ?? 1;
    if (sa !== sb) return sa - sb;
    const prioOrder: Record<string, number> = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    const pa = prioOrder[a.getCellValueAsString('Priority')] ?? 2;
    const pb = prioOrder[b.getCellValueAsString('Priority')] ?? 2;
    return pa - pb;
  });

  const handleToggleStatus = async (task: AirtableRecord) => {
    const current = task.getCellValueAsString('Status');
    const next = current === 'Done' ? 'Todo' : 'Done';
    try {
      await updateTask({ recordId: task.id, fields: { Status: next } });
      showSnackbar(next === 'Done' ? 'Task completed' : 'Task reopened');
      onRefresh();
    } catch {
      showSnackbar('Failed to update task', 'error');
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      showSnackbar('Task deleted');
      setTaskToDelete(null);
      onRefresh();
    } catch {
      showSnackbar('Failed to delete task', 'error');
    }
  };

  const handleSave = async (fields: Record<string, any>) => {
    try {
      if (editingTask) {
        await updateTask({ recordId: editingTask.id, fields });
        showSnackbar('Task updated');
      } else {
        await createTask({ ...fields, Ticket: [ticketId] });
        showSnackbar('Task created');
      }
      setShowForm(false);
      setEditingTask(null);
      onRefresh();
    } catch {
      showSnackbar(editingTask ? 'Failed to update task' : 'Failed to create task', 'error');
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
          Tasks
          {totalCount > 0 && (
            <span className="inline-block ml-2 px-1 h-[18px] text-[0.625rem] font-mono bg-[#F2F4F8] text-[#666666] leading-[18px]">
              {doneCount}/{totalCount}
            </span>
          )}
        </span>
        {!showForm && !editingTask && (
          <RoleGuard permission="tickets.tasks.create">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 hover:opacity-80 min-h-[28px]"
            >
              <AddIcon size={14} />
              Add Task
            </button>
          </RoleGuard>
        )}
      </div>

      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 bg-[#E6EAEA] overflow-hidden">
              <div
                className="h-full bg-core_palette-primary-2 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[0.625rem] font-mono text-[#666666] flex-shrink-0">{progressPct}%</span>
          </div>
        </div>
      )}

      {(showForm || editingTask) && (
        <TaskForm
          task={editingTask}
          technicians={technicians}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}

      {totalCount === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-[rgba(202,209,211,0.5)] mb-4">
            <CheckCircleIcon size={40} />
          </div>
          <h3 className="text-[1rem] font-semibold text-semantic-text mb-1.5">No tasks yet</h3>
          <p className="text-[0.875rem] text-[#666666] max-w-[280px] leading-normal mb-4">
            Break this ticket into actionable tasks to track progress.
          </p>
          <RoleGuard permission="tickets.tasks.create">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] transition-colors"
            >
              <AddIcon size={14} />
              Add Task
            </button>
          </RoleGuard>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sortedTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => handleToggleStatus(task)}
              onEdit={() => { setEditingTask(task); setShowForm(false); }}
              onDelete={() => setTaskToDelete(task)}
            />
          ))}
        </div>
      )}

      {taskToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setTaskToDelete(null)} />
          <div className="relative z-50 bg-white shadow-xl p-5 w-80">
            <h3 className="text-[0.9375rem] font-semibold text-semantic-text">Delete task?</h3>
            <p className="mt-1 text-[0.8125rem] text-[#666666]">
              "{taskToDelete.getCellValueAsString('Name')}" will be permanently removed.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] hover:bg-[#F5F7F7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-[0.75rem] bg-semantic-error text-white hover:opacity-90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }: {
  task: AirtableRecord;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const nameAttrs = useInspectAttrs(task, 'Name');
  const name = task.getCellValueAsString('Name');
  const status = task.getCellValueAsString('Status');
  const priority = task.getCellValueAsString('Priority');
  const assignee = task.getCellValueAsString('Assignee');
  const dueDate = task.getCellValueAsString('Due Date');
  const isDone = status === 'Done';

  const statusColor = TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS['Todo'];
  const prioColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS['Medium'];

  return (
    <div className={`group flex items-start gap-2.5 px-3 py-2 border border-[rgba(202,209,211,0.2)] hover:border-[rgba(202,209,211,0.5)] transition-colors ${isDone ? 'bg-[#FAFBFB]' : 'bg-white'}`}>
      <RoleGuard permission="tickets.tasks.edit">
        <button
          onClick={onToggle}
          className={`flex-shrink-0 mt-0.5 w-4 h-4 border-2 flex items-center justify-center transition-colors ${
            isDone
              ? 'bg-core_palette-primary-1 border-core_palette-primary-1'
              : 'border-[#CAD1D3] hover:border-core_palette-primary-1'
          }`}
          aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isDone && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      </RoleGuard>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span {...nameAttrs} className={`text-[0.8125rem] font-medium truncate ${isDone ? 'line-through text-[#999999]' : 'text-semantic-text'}`}>
            {name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isDone && (
            <span
              className="inline-flex items-center gap-1 px-1 py-0.5 text-[0.55rem] font-semibold uppercase"
              style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
            >
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor.dot }} />
              {status}
            </span>
          )}
          {priority && (
            <span
              className="inline-block px-1 py-0.5 text-[0.55rem] font-semibold uppercase"
              style={{ backgroundColor: prioColor.bg, color: prioColor.text }}
            >
              {priority}
            </span>
          )}
          {assignee && (
            <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">{assignee}</span>
          )}
          {dueDate && (
            <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">Due {dueDate}</span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <RoleGuard permission="tickets.tasks.edit">
          <button onClick={onEdit} className="p-1 text-[#999999] hover:text-semantic-text transition-colors" aria-label="Edit task">
            <EditIcon size={14} />
          </button>
        </RoleGuard>
        <RoleGuard permission="tickets.tasks.delete">
          <button onClick={onDelete} className="p-1 text-[#999999] hover:text-semantic-error transition-colors" aria-label="Delete task">
            <DeleteIcon size={14} />
          </button>
        </RoleGuard>
      </div>
    </div>
  );
}

function TaskForm({ task, technicians, onSave, onCancel }: {
  task: AirtableRecord | null;
  technicians: { id: string; name: string; active: boolean }[];
  onSave: (fields: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(task?.getCellValueAsString('Name') || '');
  const [status, setStatus] = useState(task?.getCellValueAsString('Status') || 'Todo');
  const [priority, setPriority] = useState(task?.getCellValueAsString('Priority') || 'Medium');
  const [assignee, setAssignee] = useState(task?.getCellValueAsString('Assignee') || '');
  const [dueDate, setDueDate] = useState(task?.getCellValueAsString('Due Date') || '');
  const [notes, setNotes] = useState(task?.getCellValueAsString('Notes') || '');
  const [saving, setSaving] = useState(false);

  const activeTechs = technicians.filter(t => t.active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const fields: Record<string, any> = {
      Name: name.trim(),
      Status: status,
      Priority: priority,
    };
    if (assignee) fields.Assignee = assignee;
    if (dueDate) fields['Due Date'] = dueDate;
    if (notes.trim()) fields.Notes = notes.trim();
    await onSave(fields);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 border border-[rgba(202,209,211,0.3)] bg-[#FAFBFB]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(202,209,211,0.3)]">
        <span className="text-[0.75rem] font-semibold text-semantic-text">
          {task ? 'Edit Task' : 'New Task'}
        </span>
        <button type="button" onClick={onCancel} className="p-0.5 text-[#666666] hover:text-semantic-text">
          <CloseIcon size={14} />
        </button>
      </div>
      <div className="px-3 py-3 space-y-2.5">
        <div>
          <label className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e: any) => setName(e.target.value)}
            placeholder="Task name..."
            autoFocus
            required
            className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Status</label>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Priority</label>
            <select
              value={priority}
              onChange={(e: any) => setPriority(e.target.value)}
              className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            >
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Assignee</label>
            <select
              value={assignee}
              onChange={(e: any) => setAssignee(e.target.value)}
              className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            >
              <option value="">Unassigned</option>
              {activeTechs.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e: any) => setDueDate(e.target.value)}
              className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-0.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e: any) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors resize-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[rgba(202,209,211,0.3)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-[0.75rem] border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="px-3 py-1 text-[0.75rem] bg-core_palette-primary-1 text-white hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : task ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
