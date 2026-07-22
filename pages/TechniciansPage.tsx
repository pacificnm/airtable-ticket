import React, { useState, useMemo } from 'react';
import {
  AddIcon,
  EditIcon,
  PeopleIcon,
  PersonIcon,
  EmailIcon,
  CheckCircleIcon,
  CancelIcon,
  CloseIcon,
} from '../components/Icons';
import {
  AirtableRecord,
  Table,
  useRecords,
  useCreateRecord,
  useUpdateRecord,
  useInspectAttrs,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { useSnackbar } from '../components/SnackbarProvider';
import { Category } from '../types';

interface TechniciansPageProps {
  techTable: Table;
  peopleTable: Table;
  catRecords: AirtableRecord[];
  categories: Category[];
}

interface TechNode {
  id: string;
  record: AirtableRecord;
  name: string;
  active: boolean;
  categoryIds: string[];
  personalPhone: string;
  workPhone: string;
  workEmailNike: string;
  workEmail: string;
  airtableUser: string;
  team: string;
  department: string;
  serviceLine: string;
  people: string;
  peopleIds: string[];
}

export function TechniciansPage({ techTable, peopleTable, catRecords, categories }: TechniciansPageProps) {
  const { records: techRecords, loading, refetch: refetchTechs } = useRecords(techTable);

  const [showCreate, setShowCreate] = useState(false);
  const [editTech, setEditTech] = useState<TechNode | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const techNodes: TechNode[] = useMemo(() =>
    techRecords.map(r => ({
      id: r.id,
      record: r,
      name: r.getCellValueAsString('Name'),
      active: !!r.getCellValue('Active'),
      categoryIds: getLinkedRecordIds((r as any).fields?.['Categories']),
      personalPhone: r.getCellValueAsString('Personal Phone'),
      workPhone: r.getCellValueAsString('Work Phone'),
      workEmailNike: r.getCellValueAsString('Work Email (Nike)'),
      workEmail: r.getCellValueAsString('Work Email'),
      airtableUser: r.getCellValueAsString('Airtable User'),
      team: r.getCellValueAsString('Team'),
      department: r.getCellValueAsString('Department'),
      serviceLine: r.getCellValueAsString('Service Line'),
      people: r.getCellValueAsString('People'),
      peopleIds: getLinkedRecordIds((r as any).fields?.['People']),
    })).filter(n => n.name)
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [techRecords]
  );

  const visibleTechs = showInactive ? techNodes : techNodes.filter(n => n.active);
  const activeCount = techNodes.filter(n => n.active).length;
  const inactiveCount = techNodes.length - activeCount;

  return (
    <div className="flex flex-col h-full">
      {/* Compact header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PeopleIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Technicians</span>
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
              New Technician
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
        ) : visibleTechs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
              <PeopleIcon size={20} style={{ color: '#17E88F' }} />
            </div>
            <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">No technicians yet</p>
            <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
              Add your service desk team members to assign tickets and manage workload.
            </p>
            <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1">
              <AddIcon size={14} />
              Add technician
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[170px]">Work Email (Nike)</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[170px]">Work Email</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[100px]">Department</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[100px]">Airtable User</th>
                <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Status</th>
                <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[40px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {visibleTechs.map(node => (
                <TechnicianRow key={node.id} node={node} onEdit={() => setEditTech(node)} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                <td colSpan={7} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                  Showing {visibleTechs.length} of {techNodes.length} technicians
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showCreate && (
        <TechnicianDrawer
          mode="create"
          techTable={techTable}
          peopleTable={peopleTable}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={async () => { await refetchTechs(); setShowCreate(false); }}
        />
      )}

      {editTech && (
        <TechnicianDrawer
          mode="edit"
          techTable={techTable}
          peopleTable={peopleTable}
          categories={categories}
          editNode={editTech}
          onClose={() => setEditTech(null)}
          onSaved={async () => { await refetchTechs(); setEditTech(null); }}
        />
      )}
    </div>
  );
}

function TechnicianRow({ node, onEdit }: { node: TechNode; onEdit: () => void }) {
  const nameAttrs = useInspectAttrs(node.record, 'Name');
  const nikeEmailAttrs = useInspectAttrs(node.record, 'Work Email (Nike)');
  const workEmailAttrs = useInspectAttrs(node.record, 'Work Email');
  const departmentAttrs = useInspectAttrs(node.record, 'Department');
  const userAttrs = useInspectAttrs(node.record, 'Airtable User');
  const activeAttrs = useInspectAttrs(node.record, 'Active');

  return (
    <tr
      className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]"
      style={{ opacity: node.active ? 1 : 0.55 }}
    >
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: node.active ? '#003F2D' : '#CAD1D3' }}>
            <PersonIcon size={14} style={{ color: node.active ? '#17E88F' : '#FFFFFF' }} />
          </div>
          <div className="min-w-0">
            <span {...nameAttrs} className="block text-[0.75rem] font-medium text-semantic-text truncate">{node.name}</span>
            {node.personalPhone && <span className="block text-[0.625rem] text-semantic-system-7 truncate">{node.personalPhone}</span>}
          </div>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...nikeEmailAttrs} className={`text-[0.6875rem] truncate block ${node.workEmailNike ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.workEmailNike || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...workEmailAttrs} className={`text-[0.6875rem] truncate block ${node.workEmail ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.workEmail || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...departmentAttrs} className={`text-[0.6875rem] truncate block ${node.department ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.department || '—'}
        </span>
      </td>
      <td className="py-1.5 px-2">
        <span {...userAttrs} className={`text-[0.6875rem] truncate block ${node.airtableUser ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.airtableUser || '—'}
        </span>
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
        <div className="flex justify-end">
          <button onClick={onEdit} className="text-semantic-system-5 hover:text-core_palette-primary-1 p-0.5" aria-label={`Edit ${node.name}`}>
            <EditIcon size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function TechnicianDrawer({
  mode, techTable, peopleTable, categories, editNode, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  techTable: Table;
  peopleTable: Table;
  categories: Category[];
  editNode?: TechNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: createTech, loading: creating } = useCreateRecord(techTable);
  const { mutate: updateTech, loading: updating } = useUpdateRecord(techTable);
  const { records: peopleRecords, loading: peopleLoading } = useRecords(peopleTable);
  const { showSnackbar } = useSnackbar();

  const [selectedPersonId, setSelectedPersonId] = useState<string>(editNode?.peopleIds?.[0] || '');
  const [active, setActive] = useState(editNode ? editNode.active : true);
  const [selectedCats, setSelectedCats] = useState<string[]>(editNode?.categoryIds || []);

  const saving = creating || updating;

  const people = useMemo(() =>
    peopleRecords.map(r => ({
      id: r.id,
      name: r.getCellValueAsString('Name'),
      workEmailNike: r.getCellValueAsString('Work Email (Nike)'),
      workEmailCbre: r.getCellValueAsString('Work Email (CBRE)'),
      personalPhone: r.getCellValueAsString('Personal Phone'),
      workPhone: r.getCellValueAsString('Work Phone'),
      team: r.getCellValueAsString('Team'),
      department: r.getCellValueAsString('Department'),
    })).filter(p => p.name).sort((a, b) => a.name.localeCompare(b.name)),
    [peopleRecords]
  );

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  const handleSave = async () => {
    if (mode === 'create' && !selectedPersonId) {
      showSnackbar('Please select a person', 'error');
      return;
    }

    const fields: Record<string, any> = { Active: active };
    if (selectedPersonId) fields['People'] = [selectedPersonId];
    fields['Categories'] = selectedCats.length > 0 ? selectedCats : [];

    if (mode === 'create') {
      const result = await createTech(fields);
      if (result) { showSnackbar('Technician created'); onSaved(); }
      else showSnackbar('Failed to create technician', 'error');
    } else if (editNode) {
      const result = await updateTech({ recordId: editNode.id, fields });
      if (result) { showSnackbar('Technician updated'); onSaved(); }
      else showSnackbar('Failed to update technician', 'error');
    }
  };

  const handleCatToggle = (catId: string) => {
    setSelectedCats(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        {/* Dark header */}
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            {mode === 'create'
              ? <PersonIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Technician' : `Edit ${editNode?.name || 'Technician'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[0.75rem] text-white/60 hover:text-white">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || (mode === 'create' && !selectedPersonId)}
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
                <PersonIcon size={20} style={{ color: editNode.active ? '#17E88F' : '#FFFFFF' }} />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-semantic-text">{editNode.name}</p>
                <p className="text-[0.6875rem] text-semantic-system-5">{editNode.people}{editNode.department ? ` · ${editNode.department}` : ''}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Person</label>
            <select
              value={selectedPersonId}
              onChange={e => setSelectedPersonId(e.target.value)}
              disabled={peopleLoading}
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            >
              <option value="">{peopleLoading ? 'Loading people...' : 'Select a person'}</option>
              {people.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.workEmailNike ? ` — ${p.workEmailNike}` : ''}</option>
              ))}
            </select>
          </div>

          {selectedPerson && (
            <div className="bg-[#F5F7F7] p-3">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Person Details</span>
              <div className="flex flex-col gap-2 mt-2">
                {selectedPerson.workEmailNike && (
                  <div className="flex items-center gap-2">
                    <EmailIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Work Email (Nike)</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{selectedPerson.workEmailNike}</p>
                    </div>
                  </div>
                )}
                {selectedPerson.workEmailCbre && (
                  <div className="flex items-center gap-2">
                    <EmailIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Work Email (CBRE)</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{selectedPerson.workEmailCbre}</p>
                    </div>
                  </div>
                )}
                {selectedPerson.personalPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.75rem] text-semantic-system-7">📞</span>
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Personal Phone</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{selectedPerson.personalPhone}</p>
                    </div>
                  </div>
                )}
                {selectedPerson.workPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.75rem] text-semantic-system-7">📞</span>
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Work Phone</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{selectedPerson.workPhone}</p>
                    </div>
                  </div>
                )}
                {selectedPerson.department && (
                  <div className="flex items-center gap-2">
                    <PersonIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Department</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{selectedPerson.department}</p>
                    </div>
                  </div>
                )}
                {selectedPerson.team && (
                  <div className="flex items-center gap-2">
                    <PeopleIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Team</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{selectedPerson.team}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active toggle */}
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
                {active ? 'This technician can be assigned to tickets' : 'This technician will not appear in assignment lists'}
              </p>
            </div>
          </label>

          {/* Category multi-select */}
          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Assigned Categories</label>
            <div className="border border-semantic-surface max-h-48 overflow-auto">
              {categories.filter(c => c.name).sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleCatToggle(c.id)}
                  className="flex items-center gap-2 w-full px-3 py-1 text-[0.75rem] text-left hover:bg-[#FAFBFB]"
                >
                  <span className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 ${selectedCats.includes(c.id) ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-8'}`}>
                    {selectedCats.includes(c.id) && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    )}
                  </span>
                  {c.name}
                </button>
              ))}
            </div>
            {selectedCats.length > 0 && (
              <p className="mt-1 text-[0.625rem] text-semantic-system-5">{selectedCats.map(id => categories.find(c => c.id === id)?.name || id).join(', ')}</p>
            )}
          </div>

          {editNode && (
            <div className="mt-2 pt-3 border-t border-semantic-surface">
              <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Contact Details (from People)</span>
              <div className="flex flex-col gap-2 mt-2">
                {editNode.workEmailNike && (
                  <div className="flex items-center gap-2">
                    <EmailIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Work Email (Nike)</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.workEmailNike}</p>
                    </div>
                  </div>
                )}
                {editNode.workEmail && (
                  <div className="flex items-center gap-2">
                    <EmailIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Work Email</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.workEmail}</p>
                    </div>
                  </div>
                )}
                {editNode.personalPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.75rem] text-semantic-system-7">📞</span>
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Personal Phone</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.personalPhone}</p>
                    </div>
                  </div>
                )}
                {editNode.workPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-[0.75rem] text-semantic-system-7">📞</span>
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Work Phone</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.workPhone}</p>
                    </div>
                  </div>
                )}
                {editNode.airtableUser && (
                  <div className="flex items-center gap-2">
                    <PersonIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Airtable User</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.airtableUser}</p>
                    </div>
                  </div>
                )}
                {editNode.serviceLine && (
                  <div className="flex items-center gap-2">
                    <PersonIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Service Line</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.serviceLine}</p>
                    </div>
                  </div>
                )}
                {editNode.department && (
                  <div className="flex items-center gap-2">
                    <PersonIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Department</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.department}</p>
                    </div>
                  </div>
                )}
                {editNode.team && (
                  <div className="flex items-center gap-2">
                    <PeopleIcon size={12} className="text-semantic-system-7" />
                    <div>
                      <p className="text-[0.625rem] text-semantic-system-7">Team</p>
                      <p className="text-[0.75rem] text-semantic-system-5">{editNode.team}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Statistics</span>
                <div className="flex gap-3 mt-2">
                  <div className="text-center flex-1 py-2.5 bg-semantic-surface">
                    <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.categoryIds.length}</p>
                    <p className="text-[0.625rem] text-semantic-system-5">Categories</p>
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
