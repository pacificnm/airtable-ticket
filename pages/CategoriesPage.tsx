import React, { useState, useMemo } from 'react';
import {
  AddIcon,
  EditIcon,
  CategoryIcon,
  FolderIcon,
  ChevronRightIcon,
  ConfirmationNumberIcon,
  DescriptionIcon,
  PersonIcon,
  SpeedIcon,
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
import { ServiceLevel, Technician } from '../types';

/* ── Inline icons not in Icons.tsx ── */
const HomeIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const SubdirectoryArrowRightIcon = ({ size = 14, color = '#006400' }: { size?: number; color?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M19 15l-6 6-1.42-1.42L15.17 16H4V4h2v10h9.17l-3.59-3.58L13 9l6 6z" />
  </svg>
);

interface CategoriesPageProps {
  catTable: Table;
  subcatTable: Table;
  techTable: Table;
  slTable: Table;
  technicians: Technician[];
  serviceLevels: ServiceLevel[];
}

interface CategoryNode {
  id: string;
  record: AirtableRecord;
  name: string;
  description: string;
  subcategoryIds: string[];
}

interface SubcategoryNode {
  id: string;
  record: AirtableRecord;
  name: string;
  description: string;
  categoryIds: string[];
  techIds: string[];
  slIds: string[];
  ticketIds: string[];
  docIds: string[];
}

export function CategoriesPage({ catTable, subcatTable, techTable, slTable, technicians, serviceLevels }: CategoriesPageProps) {
  const { records: catRecords, loading: catLoading, refetch: refetchCats } = useRecords(catTable);
  const { records: subcatRecords, loading: subcatLoading, refetch: refetchSubcats } = useRecords(subcatTable);

  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [showCreateCat, setShowCreateCat] = useState(false);
  const [editCat, setEditCat] = useState<CategoryNode | null>(null);
  const [showCreateSubcat, setShowCreateSubcat] = useState(false);
  const [editSubcat, setEditSubcat] = useState<SubcategoryNode | null>(null);

  const loading = catLoading || subcatLoading;

  const categoryNodes: CategoryNode[] = useMemo(() =>
    catRecords.map(r => ({
      id: r.id,
      record: r,
      name: r.getCellValueAsString('Name'),
      description: r.getCellValueAsString('Description'),
      subcategoryIds: getLinkedRecordIds((r as any).fields?.['Subcategories']),
    })).filter(c => c.name),
    [catRecords]
  );

  const subcategoryNodes: SubcategoryNode[] = useMemo(() =>
    subcatRecords.map(r => ({
      id: r.id,
      record: r,
      name: r.getCellValueAsString('Name'),
      description: r.getCellValueAsString('Description'),
      categoryIds: getLinkedRecordIds((r as any).fields?.['Category']),
      techIds: getLinkedRecordIds((r as any).fields?.['Default Technicians']),
      slIds: getLinkedRecordIds((r as any).fields?.['Service Levels']),
      ticketIds: getLinkedRecordIds((r as any).fields?.['Tickets']),
      docIds: getLinkedRecordIds((r as any).fields?.['Documents']),
    })).filter(s => s.name),
    [subcatRecords]
  );

  const subcatMap = useMemo(() => {
    const map: Record<string, SubcategoryNode> = {};
    subcategoryNodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [subcategoryNodes]);

  // When a category is selected, show its subcategories
  const visibleSubcats = useMemo(() => {
    if (!selectedCategory) return [];
    return selectedCategory.subcategoryIds.map(id => subcatMap[id]).filter(Boolean);
  }, [selectedCategory, subcatMap]);

  const getTechNames = (ids: string[]) =>
    ids.map(id => technicians.find(t => t.id === id)?.name).filter(Boolean).join(', ');

  const getSlName = (ids: string[]) => {
    if (ids.length === 0) return '';
    return serviceLevels.find(s => s.id === ids[0])?.name || '';
  };

  const handleRefresh = async () => {
    await Promise.all([refetchCats(), refetchSubcats()]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <CategoryIcon size={16} style={{ color: '#003F2D' }} />
            <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Categories</span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-mono bg-semantic-surface text-semantic-system-5">
              {categoryNodes.length} categories
            </span>
            <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-mono bg-semantic-surface text-semantic-system-5">
              {subcategoryNodes.length} subcategories
            </span>
          </div>
          <button
            onClick={() => selectedCategory ? setShowCreateSubcat(true) : setShowCreateCat(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors"
          >
            <AddIcon size={14} />
            {selectedCategory ? 'New Subcategory' : 'New Category'}
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-1 text-[0.75rem] bg-transparent border-none cursor-pointer p-0 ${selectedCategory ? 'text-core_palette-primary-1 hover:underline' : 'text-semantic-text font-semibold'}`}
          >
            <HomeIcon size={12} />
            All Categories
          </button>
          {selectedCategory && (
            <>
              <ChevronRightIcon size={14} className="text-semantic-system-7" />
              <span className="text-[0.75rem] text-semantic-text font-semibold">
                {selectedCategory.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-core_palette-primary-1 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading" />
          </div>
        ) : !selectedCategory ? (
          /* Category list (top level) */
          categoryNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
                <FolderIcon size={20} style={{ color: '#17E88F' }} />
              </div>
              <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">No categories yet</p>
              <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
                Get started by creating your first category to organize tickets.
              </p>
              <button onClick={() => setShowCreateCat(true)} className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1">
                <AddIcon size={14} />
                Create category
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                  <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                  <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2">Description</th>
                  <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[80px]">Subcategories</th>
                  <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {categoryNodes.map(node => (
                  <tr key={node.id} className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]">
                    <td className="py-1.5 pl-4 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-core_palette-primary-1 cursor-pointer"
                          onClick={() => setSelectedCategory(node)}
                        >
                          <FolderIcon size={14} style={{ color: '#17E88F' }} />
                        </div>
                        <span
                          className="text-[0.75rem] font-medium text-core_palette-primary-1 cursor-pointer hover:underline truncate"
                          onClick={() => setSelectedCategory(node)}
                        >
                          {node.name}
                        </span>
                        <ChevronRightIcon size={12} style={{ color: '#003F2D' }} />
                      </div>
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`text-[0.6875rem] truncate block ${node.description ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
                        {node.description || '\u2014'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <SubdirectoryArrowRightIcon size={12} />
                        <span className="text-[0.6875rem] font-mono font-medium" style={{ color: '#006400' }}>{node.subcategoryIds.length}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 pr-4">
                      <div className="flex justify-end">
                        <button onClick={() => setEditCat(node)} className="text-semantic-system-5 hover:text-core_palette-primary-1 p-0.5" aria-label={`Edit ${node.name}`}>
                          <EditIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                  <td colSpan={4} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                    {categoryNodes.length} categories
                  </td>
                </tr>
              </tfoot>
            </table>
          )
        ) : (
          /* Subcategory list */
          visibleSubcats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-10 h-10 flex items-center justify-center mb-3 bg-core_palette-primary-1">
                <FolderIcon size={20} style={{ color: '#17E88F' }} />
              </div>
              <p className="text-[0.8125rem] font-semibold text-semantic-text mb-0.5">No subcategories</p>
              <p className="text-[0.75rem] text-semantic-system-5 max-w-[280px]">
                This category has no subcategories. Create one to organize further.
              </p>
              <button onClick={() => setShowCreateSubcat(true)} className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-core_palette-primary-1">
                <AddIcon size={14} />
                Add subcategory
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F5F7F7] border-b border-semantic-surface">
                  <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 pl-4 pr-2">Name</th>
                  <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2">Description</th>
                  <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[60px]">Tkts</th>
                  <th className="text-center text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[60px]">Docs</th>
                  <th className="text-left text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 w-[110px]">Service Level</th>
                  <th className="text-right text-[0.625rem] font-semibold text-semantic-system-7 uppercase tracking-wider py-1.5 px-2 pr-4 w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleSubcats.map(node => (
                  <SubcategoryRow
                    key={node.id}
                    node={node}
                    techNames={getTechNames(node.techIds)}
                    slName={getSlName(node.slIds)}
                    onEdit={() => setEditSubcat(node)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F5F7F7] border-t border-semantic-surface">
                  <td colSpan={6} className="px-4 py-1.5 text-[0.6875rem] text-semantic-system-7">
                    {visibleSubcats.length} subcategories in {selectedCategory.name}
                  </td>
                </tr>
              </tfoot>
            </table>
          )
        )}
      </div>

      {/* Category create/edit drawer */}
      {showCreateCat && (
        <CategoryDrawer
          mode="create"
          catTable={catTable}
          onClose={() => setShowCreateCat(false)}
          onSaved={async () => { await handleRefresh(); setShowCreateCat(false); }}
        />
      )}
      {editCat && (
        <CategoryDrawer
          mode="edit"
          catTable={catTable}
          editNode={editCat}
          onClose={() => setEditCat(null)}
          onSaved={async () => { await handleRefresh(); setEditCat(null); }}
        />
      )}

      {/* Subcategory create/edit drawer */}
      {showCreateSubcat && selectedCategory && (
        <SubcategoryDrawer
          mode="create"
          subcatTable={subcatTable}
          technicians={technicians}
          serviceLevels={serviceLevels}
          parentCategoryId={selectedCategory.id}
          onClose={() => setShowCreateSubcat(false)}
          onSaved={async () => { await handleRefresh(); setShowCreateSubcat(false); }}
        />
      )}
      {editSubcat && (
        <SubcategoryDrawer
          mode="edit"
          subcatTable={subcatTable}
          technicians={technicians}
          serviceLevels={serviceLevels}
          editNode={editSubcat}
          onClose={() => setEditSubcat(null)}
          onSaved={async () => { await handleRefresh(); setEditSubcat(null); }}
        />
      )}
    </div>
  );
}

function SubcategoryRow({
  node, techNames, slName, onEdit,
}: {
  node: SubcategoryNode;
  techNames: string;
  slName: string;
  onEdit: () => void;
}) {
  const nameAttrs = useInspectAttrs(node.record, 'Name');
  const descAttrs = useInspectAttrs(node.record, 'Description');

  return (
    <tr className="border-b border-semantic-surface transition-colors hover:bg-[#FAFBFB]">
      <td className="py-1.5 pl-4 pr-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 bg-[#538184]">
            <FolderIcon size={14} style={{ color: '#80BBAD' }} />
          </div>
          <div className="min-w-0">
            <span {...nameAttrs} className="text-[0.75rem] font-medium text-semantic-text truncate block">
              {node.name}
            </span>
            {techNames && (
              <div className="flex items-center gap-1 mt-0.5">
                <PersonIcon size={10} className="text-semantic-system-7" />
                <span className="text-[0.625rem] text-semantic-system-7 truncate">{techNames}</span>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-1.5 px-2">
        <span {...descAttrs} className={`text-[0.6875rem] truncate block ${node.description ? 'text-semantic-system-5' : 'text-semantic-system-7'}`}>
          {node.description || '\u2014'}
        </span>
      </td>
      <td className="py-1.5 px-2 text-center">
        <div className="flex items-center justify-center gap-0.5">
          <ConfirmationNumberIcon size={12} className="text-semantic-system-7" />
          <span className="text-[0.6875rem] font-mono text-semantic-text">{node.ticketIds.length}</span>
        </div>
      </td>
      <td className="py-1.5 px-2 text-center">
        {node.docIds.length > 0 ? (
          <div className="flex items-center justify-center gap-0.5">
            <DescriptionIcon size={12} className="text-semantic-system-7" />
            <span className="text-[0.6875rem] font-mono text-semantic-text">{node.docIds.length}</span>
          </div>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">{'\u2014'}</span>
        )}
      </td>
      <td className="py-1.5 px-2">
        {slName ? (
          <span className="inline-flex items-center gap-0.5 px-1 h-[18px] text-[0.5625rem] font-medium bg-semantic-surface text-semantic-system-5 truncate max-w-full">
            <SpeedIcon size={11} className="text-semantic-system-7" />
            {slName}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-semantic-system-7">{'\u2014'}</span>
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

/* ── Category Drawer (simplified — just Name + Description) ── */
function CategoryDrawer({
  mode, catTable, editNode, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  catTable: Table;
  editNode?: CategoryNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: createCat, loading: creating } = useCreateRecord(catTable);
  const { mutate: updateCat, loading: updating } = useUpdateRecord(catTable);
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState(editNode?.name || '');
  const [description, setDescription] = useState(editNode?.description || '');
  const saving = creating || updating;

  const handleSave = async () => {
    if (!name.trim()) { showSnackbar('Name is required', 'error'); return; }

    const fields: Record<string, any> = {
      Name: name.trim(),
      Description: description.trim(),
    };

    if (mode === 'create') {
      const result = await createCat(fields);
      if (result) { showSnackbar('Category created'); onSaved(); }
      else showSnackbar('Failed to create category', 'error');
    } else if (editNode) {
      const result = await updateCat({ recordId: editNode.id, fields });
      if (result) { showSnackbar('Category updated'); onSaved(); }
      else showSnackbar('Failed to update category', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            {mode === 'create'
              ? <CategoryIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Category' : `Edit ${editNode?.name || 'Category'}`}
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

        <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
          {editNode && (
            <div className="flex items-center gap-3 pb-3 border-b border-semantic-surface">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 bg-core_palette-primary-1">
                <FolderIcon size={20} style={{ color: '#17E88F' }} />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-semantic-text">{editNode.name}</p>
                <p className="text-[0.6875rem] text-semantic-system-5">{editNode.subcategoryIds.length} subcategories</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
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
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Subcategory Drawer (has Default Technicians, Service Levels) ── */
function SubcategoryDrawer({
  mode, subcatTable, technicians, serviceLevels, parentCategoryId, editNode, onClose, onSaved,
}: {
  mode: 'create' | 'edit';
  subcatTable: Table;
  technicians: Technician[];
  serviceLevels: ServiceLevel[];
  parentCategoryId?: string;
  editNode?: SubcategoryNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: createSubcat, loading: creating } = useCreateRecord(subcatTable);
  const { mutate: updateSubcat, loading: updating } = useUpdateRecord(subcatTable);
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState(editNode?.name || '');
  const [description, setDescription] = useState(editNode?.description || '');
  const [selectedTechs, setSelectedTechs] = useState<string[]>(editNode?.techIds || []);
  const [selectedSL, setSelectedSL] = useState(editNode?.slIds[0] || '');

  const saving = creating || updating;
  const activeTechs = technicians.filter(t => t.active);

  const handleTechToggle = (techId: string) => {
    setSelectedTechs(prev => prev.includes(techId) ? prev.filter(t => t !== techId) : [...prev, techId]);
  };

  const handleSave = async () => {
    if (!name.trim()) { showSnackbar('Name is required', 'error'); return; }

    const fields: Record<string, any> = {
      Name: name.trim(),
      Description: description.trim(),
      'Default Technicians': selectedTechs.length > 0 ? selectedTechs : [],
      'Service Levels': selectedSL ? [selectedSL] : [],
    };

    // When creating, link to parent category
    if (mode === 'create' && parentCategoryId) {
      fields['Category'] = [parentCategoryId];
    }

    if (mode === 'create') {
      const result = await createSubcat(fields);
      if (result) { showSnackbar('Subcategory created'); onSaved(); }
      else showSnackbar('Failed to create subcategory', 'error');
    } else if (editNode) {
      const result = await updateSubcat({ recordId: editNode.id, fields });
      if (result) { showSnackbar('Subcategory updated'); onSaved(); }
      else showSnackbar('Failed to update subcategory', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            {mode === 'create'
              ? <CategoryIcon size={16} style={{ color: '#17E88F' }} />
              : <EditIcon size={16} style={{ color: '#17E88F' }} />
            }
            <span className="text-[0.8125rem] font-semibold font-sans">
              {mode === 'create' ? 'New Subcategory' : `Edit ${editNode?.name || 'Subcategory'}`}
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

        <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
          {editNode && (
            <div className="flex items-center gap-3 pb-3 border-b border-semantic-surface">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 bg-[#538184]">
                <FolderIcon size={20} style={{ color: '#80BBAD' }} />
              </div>
              <div>
                <p className="text-[0.875rem] font-semibold text-semantic-text">{editNode.name}</p>
                <p className="text-[0.6875rem] text-semantic-system-5">{editNode.ticketIds.length} tickets · {editNode.docIds.length} docs</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
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
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 focus:ring-1 focus:ring-core_palette-primary-1 resize-none"
            />
          </div>

          {/* Technician multi-select */}
          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Default Technicians</label>
            <div className="border border-semantic-surface max-h-48 overflow-auto">
              {activeTechs.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTechToggle(t.id)}
                  className="flex items-center gap-2 w-full px-3 py-1 text-[0.75rem] text-left hover:bg-[#FAFBFB]"
                >
                  <span className={`w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 ${selectedTechs.includes(t.id) ? 'bg-core_palette-primary-1 border-core_palette-primary-1' : 'border-semantic-system-8'}`}>
                    {selectedTechs.includes(t.id) && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    )}
                  </span>
                  {t.name}
                </button>
              ))}
            </div>
            {selectedTechs.length > 0 && (
              <p className="mt-1 text-[0.625rem] text-semantic-system-5">{selectedTechs.map(id => technicians.find(t => t.id === id)?.name || id).join(', ')}</p>
            )}
          </div>

          <div>
            <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Service Level</label>
            <select
              value={selectedSL}
              onChange={e => setSelectedSL(e.target.value)}
              className="w-full px-3 py-1.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1"
            >
              <option value="">None</option>
              {serviceLevels.map(sl => (
                <option key={sl.id} value={sl.id}>{sl.name} — Response: {sl.responseHours}h · Resolution: {sl.resolutionHours}h</option>
              ))}
            </select>
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
                  <p className="text-[1rem] font-semibold font-mono text-core_palette-primary-1">{editNode.docIds.length}</p>
                  <p className="text-[0.625rem] text-semantic-system-5">Documents</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
