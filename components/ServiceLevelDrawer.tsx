import React, { useState } from 'react';
import { EditIcon, SpeedIcon, CloseIcon } from './Icons';
import {
  Table,
  useCreateRecord,
  useUpdateRecord,
} from '../lib/airtable-hooks';
import { useSnackbar } from './SnackbarProvider';
import { SLNode, formatHours } from '../pages/ServiceLevelsPage';

interface ServiceLevelDrawerProps {
  mode: 'create' | 'edit';
  slTable: Table;
  editNode?: SLNode;
  onClose: () => void;
  onSaved: () => void;
}

export function ServiceLevelDrawer({
  mode,
  slTable,
  editNode,
  onClose,
  onSaved,
}: ServiceLevelDrawerProps) {
  const { mutate: createSL, loading: creating } = useCreateRecord(slTable);
  const { mutate: updateSL, loading: updating } = useUpdateRecord(slTable);
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState(editNode?.name || '');
  const [description, setDescription] = useState(editNode?.description || '');
  const [responseHours, setResponseHours] = useState(editNode ? String(editNode.responseHours) : '');
  const [resolutionHours, setResolutionHours] = useState(editNode ? String(editNode.resolutionHours) : '');
  const [priorityOrder, setPriorityOrder] = useState(editNode ? String(editNode.priorityOrder) : '');

  const saving = creating || updating;

  const handleSave = async () => {
    if (!name.trim()) {
      showSnackbar('Name is required', 'error');
      return;
    }
    const respH = parseFloat(responseHours);
    const resolH = parseFloat(resolutionHours);
    const pOrder = parseInt(priorityOrder, 10);

    if (isNaN(respH) || respH <= 0) {
      showSnackbar('Response time must be a positive number', 'error');
      return;
    }
    if (isNaN(resolH) || resolH <= 0) {
      showSnackbar('Resolution time must be a positive number', 'error');
      return;
    }
    if (isNaN(pOrder) || pOrder <= 0) {
      showSnackbar('Priority order must be a positive integer', 'error');
      return;
    }

    const fields: Record<string, any> = {
      Name: name.trim(),
      Description: description.trim(),
      'Response Time (hours)': respH,
      'Resolution Time (hours)': resolH,
      'Priority Order': pOrder,
    };

    if (mode === 'create') {
      const result = await createSL(fields);
      if (result) {
        showSnackbar('Service level created');
        onSaved();
      } else {
        showSnackbar('Failed to create service level', 'error');
      }
    } else if (editNode) {
      const result = await updateSL({ recordId: editNode.id, fields });
      if (result) {
        showSnackbar('Service level updated');
        onSaved();
      } else {
        showSnackbar('Failed to update service level', 'error');
      }
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
              ? <SpeedIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Service Level' : 'Edit Service Level'}
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

        {/* Form body */}
        <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Critical, High, Medium, Low"
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
            />
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe when this service level should be applied"
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Response Time (hours) *</label>
              <input
                type="number"
                value={responseHours}
                onChange={e => setResponseHours(e.target.value)}
                min={0}
                step={0.5}
                placeholder="e.g. 1"
                className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Resolution Time (hours) *</label>
              <input
                type="number"
                value={resolutionHours}
                onChange={e => setResolutionHours(e.target.value)}
                min={0}
                step={0.5}
                placeholder="e.g. 4"
                className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Priority Order *</label>
            <input
              type="number"
              value={priorityOrder}
              onChange={e => setPriorityOrder(e.target.value)}
              min={1}
              step={1}
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1"
            />
            <p className="mt-1 text-[0.625rem] text-semantic-system-5">Lower numbers = higher priority. E.g. Critical=1, High=2</p>
          </div>

          {editNode && (
            <div className="mt-2 pt-3 border-t border-semantic-surface">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Statistics</span>
              <div className="flex gap-3 mt-2">
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.ticketIds.length}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Tickets</p>
                </div>
                <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.categoryIds.length}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Categories</p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-semantic-surface">
                <p className="text-[0.5625rem] text-semantic-system-7 font-medium uppercase tracking-wider mb-2">SLA Targets</p>
                <div className="flex gap-5">
                  <div>
                    <p className="text-[0.625rem] text-semantic-system-5">First Response</p>
                    <p className="text-[0.875rem] font-semibold font-mono text-core_palette-primary-1">{formatHours(editNode.responseHours)}</p>
                  </div>
                  <div>
                    <p className="text-[0.625rem] text-semantic-system-5">Full Resolution</p>
                    <p className="text-[0.875rem] font-semibold font-mono text-core_palette-primary-1">{formatHours(editNode.resolutionHours)}</p>
                  </div>
                  <div>
                    <p className="text-[0.625rem] text-semantic-system-5">Priority</p>
                    <p className="text-[0.875rem] font-semibold font-mono text-core_palette-primary-1">P{editNode.priorityOrder}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
