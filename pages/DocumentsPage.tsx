import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { RichTextEditor } from '../components/RichTextEditor';
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
import { timeAgo } from '../utils';
import { DOC_STATUS_COLORS } from '../types';
import {
  SearchIcon,
  AddIcon,
  ArrowBackIcon,
  ArticleIcon,
  FolderIcon,
  DescriptionIcon,
  CloseIcon,
  EditIcon,
} from '../components/Icons';
import { RoleGuard, useHasPermission } from '../components/RoleGuard';

interface DocumentsPageProps {
  docsTable: Table;
  catTable: Table;
}

const STATUS_OPTIONS = ['Draft', 'In Review', 'Published', 'Archived'];

export function DocumentsPage({ docsTable, catTable }: DocumentsPageProps) {
  const { records: docRecords, loading: docsLoading, refetch: refetchDocs } = useRecords(docsTable);
  const { records: catRecords } = useRecords(catTable);
  const canEditDocs = useHasPermission('documents.edit');

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => canEditDocs ? '' : 'Published');
  const [selectedDoc, setSelectedDoc] = useState<AirtableRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editDoc, setEditDoc] = useState<AirtableRecord | null>(null);

  const categories = useMemo(() =>
    catRecords.map(r => ({
      id: r.id,
      name: r.getCellValueAsString('Name'),
    })).filter(c => c.name).sort((a, b) => a.name.localeCompare(b.name)),
    [catRecords]
  );

  const categoryDocCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    docRecords.forEach(doc => {
      const catIds = getLinkedRecordIds((doc as any).fields?.['Categories']);
      catIds.forEach(cid => {
        counts[cid] = (counts[cid] || 0) + 1;
      });
    });
    return counts;
  }, [docRecords]);

  const filteredDocs = useMemo(() => {
    return docRecords.filter(doc => {
      if (selectedCategory) {
        const catIds = getLinkedRecordIds((doc as any).fields?.['Categories']);
        if (!catIds.includes(selectedCategory)) return false;
      }
      if (statusFilter && doc.getCellValueAsString('Status') !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const searchable = [
          doc.getCellValueAsString('Title'),
          doc.getCellValueAsString('Body'),
          doc.getCellValueAsString('Categories'),
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [docRecords, selectedCategory, statusFilter, search]);

  const refreshedSelectedDoc = selectedDoc
    ? docRecords.find(d => d.id === selectedDoc.id) || selectedDoc
    : null;

  if (refreshedSelectedDoc) {
    return (
      <DocumentReader
        doc={refreshedSelectedDoc}
        onBack={() => setSelectedDoc(null)}
        onEdit={() => {
          setEditDoc(refreshedSelectedDoc);
          setSelectedDoc(null);
        }}
      />
    );
  }

  return (
    <div className="flex h-full">
      <nav className="w-[260px] flex-shrink-0 bg-[#012A2D] text-white flex flex-col border-r border-[rgba(255,255,255,0.08)] overflow-y-auto">
        <div className="px-4 pt-5 pb-2">
          <span className="text-[rgba(255,255,255,0.35)] text-[0.575rem] tracking-[0.1em] uppercase block">
            Table of Contents
          </span>
        </div>

        <button
          onClick={() => setSelectedCategory('')}
          className={`flex items-center gap-2 w-full text-left px-4 py-1.5 mx-1 transition-colors ${
            !selectedCategory ? 'bg-[rgba(0,63,45,0.5)] text-[#17E88F]' : 'bg-transparent text-[#CAD1D3] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
          }`}
        >
          <DescriptionIcon size={16} />
          <span className="text-[0.8125rem] font-medium flex-1">All Documents</span>
          <span className="text-[0.6875rem] text-[rgba(255,255,255,0.4)]">{docRecords.length}</span>
        </button>

        <div className="px-2 py-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5 transition-colors ${
                selectedCategory === cat.id ? 'bg-[rgba(0,63,45,0.5)] text-[#17E88F]' : 'bg-transparent text-[#CAD1D3] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
              }`}
            >
              <FolderIcon size={15} />
              <span className="text-[0.8125rem] font-medium flex-1 truncate">{cat.name}</span>
              <span className="text-[0.6875rem] text-[rgba(255,255,255,0.4)]">{categoryDocCounts[cat.id] || 0}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-[rgba(202,209,211,0.3)]">
          <div className="relative flex-1">
            <SearchIcon size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              aria-label="Search documents"
              className="w-full pl-8 pr-3 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            />
          </div>

          <RoleGuard permission="documents.edit">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors min-w-[140px]"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </RoleGuard>

          <RoleGuard permission="documents.create">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors whitespace-nowrap"
            >
              <AddIcon size={16} />
              Create
            </button>
          </RoleGuard>
        </div>

        <div className="flex-1 overflow-auto bg-[#F5F7F7]">
          {docsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-core_palette-primary-1 border-t-transparent animate-spin" role="status" aria-label="Loading" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="text-[rgba(202,209,211,0.5)] mb-4">
                <DescriptionIcon size={48} />
              </div>
              <h3 className="text-[1rem] font-semibold text-semantic-text mb-1">No documents found</h3>
              <p className="text-[0.875rem] text-[#666666] max-w-[300px] leading-normal">
                {search || statusFilter || selectedCategory
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by creating your first document.'}
              </p>
              {!search && !statusFilter && !selectedCategory && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-1 text-[0.8125rem] text-core_palette-primary-1 hover:opacity-80 transition-opacity"
                >
                  <AddIcon size={14} />
                  Create document
                </button>
              )}
            </div>
          ) : (
            <div className="px-6 py-4 flex flex-col gap-2">
              <p className="text-[0.75rem] text-[#999999] mb-1">
                {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
              </p>
              {filteredDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onSelect={() => setSelectedDoc(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateDocumentDrawer
          docsTable={docsTable}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            await refetchDocs();
            setShowCreate(false);
          }}
        />
      )}

      {editDoc && (
        <EditDocumentDrawer
          doc={editDoc}
          docsTable={docsTable}
          categories={categories}
          onClose={() => setEditDoc(null)}
          onSaved={async () => {
            await refetchDocs();
            setEditDoc(null);
          }}
        />
      )}
    </div>
  );
}

function DocumentCard({ doc, onSelect }: { doc: AirtableRecord; onSelect: () => void }) {
  const titleAttrs = useInspectAttrs(doc, 'Title');
  const docTitle = doc.getCellValueAsString('Title');
  const status = doc.getCellValueAsString('Status');
  const body = doc.getCellValueAsString('Body');
  const lastModified = doc.getCellValueAsString('Last Modified');
  const docCategories = doc.getCellValueAsString('Categories');

  const statusColor = DOC_STATUS_COLORS[status] || DOC_STATUS_COLORS['Draft'];
  const preview = body ? body.replace(/[#*_\[\]()>`~\-]/g, '').slice(0, 150) : '';

  return (
    <button
      onClick={onSelect}
      className="block w-full text-left p-4 bg-white border border-[rgba(202,209,211,0.3)] cursor-pointer transition-colors hover:border-core_palette-primary-1 hover:bg-[#FAFBFB]"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ArticleIcon size={18} className="text-core_palette-primary-1 flex-shrink-0" />
          <p {...titleAttrs} className="text-[0.875rem] font-semibold text-semantic-text truncate">
            {docTitle}
          </p>
        </div>
        <span
          className="inline-block px-1.5 py-0.5 text-[0.625rem] font-semibold flex-shrink-0"
          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
        >
          {status || 'Draft'}
        </span>
      </div>
      {preview && (
        <p className="text-[0.8125rem] text-[#666666] leading-normal line-clamp-2 ml-7 mb-1">
          {preview}...
        </p>
      )}
      <div className="flex items-center gap-2 ml-7 mt-1">
        {docCategories && (
          <span className="inline-block px-1.5 py-0.5 text-[0.625rem] font-medium bg-[#E6EAEA] text-semantic-text">
            {docCategories}
          </span>
        )}
        {lastModified && (
          <span className="text-[0.6875rem] text-[#999999]">Updated {timeAgo(lastModified)}</span>
        )}
      </div>
    </button>
  );
}

function DocumentReader({ doc, onBack, onEdit }: { doc: AirtableRecord; onBack: () => void; onEdit: () => void }) {
  const titleAttrs = useInspectAttrs(doc, 'Title');
  const bodyAttrs = useInspectAttrs(doc, 'Body');
  const docTitle = doc.getCellValueAsString('Title');
  const body = doc.getCellValueAsString('Body');
  const status = doc.getCellValueAsString('Status');
  const lastModified = doc.getCellValueAsString('Last Modified');
  const docCategories = doc.getCellValueAsString('Categories');
  const createdBy = doc.getCellValueAsString('Created By');

  const statusColor = DOC_STATUS_COLORS[status] || DOC_STATUS_COLORS['Draft'];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-[rgba(202,209,211,0.3)] bg-[#F5F7F7]">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[0.75rem] text-core_palette-primary-1 hover:opacity-80 transition-opacity -ml-1"
          >
            <ArrowBackIcon size={14} />
            Back to documents
          </button>
          <RoleGuard permission="documents.edit">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] font-medium text-white bg-core_palette-primary-1 hover:bg-[#004D37] transition-colors"
            >
              <EditIcon size={14} />
              Edit
            </button>
          </RoleGuard>
        </div>
        <h1 {...titleAttrs} className="text-[1.5rem] font-serif font-normal text-semantic-text leading-tight mb-2">
          {docTitle}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-block px-1.5 py-0.5 text-[0.625rem] font-semibold"
            style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
          >
            {status || 'Draft'}
          </span>
          {docCategories && (
            <span className="inline-block px-1.5 py-0.5 text-[0.625rem] font-medium bg-[#E6EAEA] text-semantic-text">
              {docCategories}
            </span>
          )}
          {createdBy && (
            <span className="text-[0.6875rem] text-[#999999]">by {createdBy}</span>
          )}
          {lastModified && (
            <span className="text-[0.6875rem] text-[#999999]">· Updated {timeAgo(lastModified)}</span>
          )}
        </div>
      </div>

      <div {...bodyAttrs} className="flex-1 overflow-auto px-8 py-6 prose-cbre">
        {body ? (
          <ReactMarkdown>{body}</ReactMarkdown>
        ) : (
          <div className="text-center py-12">
            <p className="text-[0.875rem] text-[#999999]">This document has no content yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateDocumentDrawer({
  docsTable,
  categories,
  onClose,
  onCreated,
}: {
  docsTable: Table;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { mutate: createDoc, loading: creating } = useCreateRecord(docsTable);
  const { showSnackbar } = useSnackbar();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('Draft');

  const handleCreate = async () => {
    if (!title.trim()) {
      showSnackbar('Title is required', 'error');
      return;
    }
    try {
      const fields: Record<string, any> = {
        Title: title.trim(),
        Body: body,
        Status: status,
      };
      if (category) {
        fields['Categories'] = [{ id: category }];
      }
      await createDoc(fields);
      showSnackbar('Document created');
      onCreated();
    } catch {
      showSnackbar('Failed to create document', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative z-50 w-full h-full bg-white flex flex-col sidesheet-enter">
        <div className="px-4 h-12 bg-core_palette-primary-3 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArticleIcon size={16} className="text-[#17E88F]" />
            <span className="text-[0.8125rem] font-semibold">New Document</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-2.5 py-1 text-[0.75rem] text-white/60 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="px-2.5 py-1 text-[0.75rem] font-semibold bg-core_palette-primary-2 text-core_palette-primary-3 hover:bg-[#14D080] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-semantic-surface bg-[#FAFBFB]">
              <input
                type="text"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
                autoFocus
                placeholder="Document title"
                className="w-full text-[1.25rem] font-serif font-normal text-semantic-text leading-tight bg-transparent border-none outline-none placeholder:text-[#999999]"
              />
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <label className="block text-[0.625rem] text-semantic-system-7 mb-0.5">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="px-2 py-0.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors min-w-[140px]"
                  >
                    <option value="">None</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.625rem] text-semantic-system-7 mb-0.5">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="px-2 py-0.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors min-w-[120px]"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Start writing your document content..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditDocumentDrawer({
  doc,
  docsTable,
  categories,
  onClose,
  onSaved,
}: {
  doc: AirtableRecord;
  docsTable: Table;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { mutate: updateDoc, loading: saving } = useUpdateRecord(docsTable);
  const { showSnackbar } = useSnackbar();

  const existingCatIds = getLinkedRecordIds((doc as any).fields?.['Categories']);

  const [title, setTitle] = useState(doc.getCellValueAsString('Title'));
  const [body, setBody] = useState(doc.getCellValueAsString('Body'));
  const [category, setCategory] = useState(existingCatIds[0] || '');
  const [status, setStatus] = useState(doc.getCellValueAsString('Status') || 'Draft');

  const handleSave = async () => {
    if (!title.trim()) {
      showSnackbar('Title is required', 'error');
      return;
    }
    try {
      const fields: Record<string, any> = {
        Title: title.trim(),
        Body: body,
        Status: status,
      };
      if (category) {
        fields['Categories'] = [{ id: category }];
      } else {
        fields['Categories'] = [];
      }
      await updateDoc({ recordId: doc.id, fields });
      showSnackbar('Document saved');
      onSaved();
    } catch {
      showSnackbar('Failed to save document', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative z-50 w-full h-full bg-white flex flex-col sidesheet-enter">
        <div className="px-4 h-12 bg-core_palette-primary-3 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <EditIcon size={16} className="text-[#17E88F]" />
            <span className="text-[0.8125rem] font-semibold">Edit Document</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-2.5 py-1 text-[0.75rem] text-white/60 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="px-2.5 py-1 text-[0.75rem] font-semibold bg-core_palette-primary-2 text-core_palette-primary-3 hover:bg-[#14D080] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-semantic-surface bg-[#FAFBFB]">
              <input
                type="text"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
                autoFocus
                placeholder="Document title"
                className="w-full text-[1.25rem] font-serif font-normal text-semantic-text leading-tight bg-transparent border-none outline-none placeholder:text-[#999999]"
              />
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <label className="block text-[0.625rem] text-semantic-system-7 mb-0.5">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="px-2 py-0.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors min-w-[140px]"
                  >
                    <option value="">None</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.625rem] text-semantic-system-7 mb-0.5">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="px-2 py-0.5 text-[0.75rem] border border-semantic-surface bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors min-w-[120px]"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Start writing your document content..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
