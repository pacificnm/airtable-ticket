import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AirtableRecord, useInspectAttrs } from '../../lib/airtable-hooks';
import { DOC_STATUS_COLORS } from '../../types';
import { timeAgo } from '../../utils';
import { DescriptionIcon, ArticleIcon, ArrowBackIcon } from '../../components/Icons';

export interface TicketDocumentsTabProps {
  documents: AirtableRecord[];
  category: string;
}

export function TicketDocumentsTab({ documents, category }: TicketDocumentsTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<AirtableRecord | null>(null);

  if (selectedDoc) {
    return <DocumentReader doc={selectedDoc} onBack={() => setSelectedDoc(null)} />;
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="text-[rgba(202,209,211,0.5)] mb-4">
          <DescriptionIcon size={40} />
        </div>
        <h3 className="text-[1rem] font-semibold text-semantic-text mb-1.5">No documents</h3>
        <p className="text-[0.875rem] text-[#666666] max-w-[280px] leading-normal">
          {category
            ? `No documents are linked to the "${category}" category yet.`
            : 'Assign a category to this ticket to see related documents.'}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
          Related Documents
          <span className="inline-block ml-2 px-1 h-[18px] text-[0.625rem] font-mono bg-[#F2F4F8] text-[#666666] leading-[18px]">
            {documents.length}
          </span>
        </span>
        {category && (
          <span className="inline-block px-1.5 py-0.5 text-[0.625rem] font-medium bg-[#F2F4F8] text-semantic-text">
            {category}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {documents.map(doc => (
          <DocumentCard key={doc.id} doc={doc} onSelect={() => setSelectedDoc(doc)} />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ doc, onSelect }: { doc: AirtableRecord; onSelect: () => void }) {
  const titleAttrs = useInspectAttrs(doc, 'Title');
  const docTitle = doc.getCellValueAsString('Title');
  const status = doc.getCellValueAsString('Status');
  const body = doc.getCellValueAsString('Body');
  const lastModified = doc.getCellValueAsString('Last Modified');

  const statusColor = DOC_STATUS_COLORS[status] || DOC_STATUS_COLORS['Draft'];
  const preview = body ? body.replace(/[#*_\[\]()>`~-]/g, '').slice(0, 120) : '';

  return (
    <button
      onClick={onSelect}
      className="block w-full text-left p-3 bg-[#F5F7F7] border border-[rgba(202,209,211,0.3)] cursor-pointer hover:border-core_palette-primary-1 hover:bg-[#EFF3F3] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <ArticleIcon size={16} className="flex-shrink-0 text-core_palette-primary-1" />
          <span {...titleAttrs} className="text-[0.8125rem] font-semibold text-semantic-text truncate">{docTitle}</span>
        </div>
        <span className="inline-block px-1 py-0.5 text-[0.6rem] font-semibold flex-shrink-0" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
          {status}
        </span>
      </div>
      {preview && (
        <p className="text-[0.75rem] text-[#666666] leading-snug line-clamp-2 ml-6">
          {preview}...
        </p>
      )}
      {lastModified && (
        <p className="text-[0.625rem] text-[rgba(67,82,84,0.5)] mt-1 ml-6">
          Updated {timeAgo(lastModified)}
        </p>
      )}
    </button>
  );
}

function DocumentReader({ doc, onBack }: { doc: AirtableRecord; onBack: () => void }) {
  const titleAttrs = useInspectAttrs(doc, 'Title');
  const bodyAttrs = useInspectAttrs(doc, 'Body');
  const docTitle = doc.getCellValueAsString('Title');
  const body = doc.getCellValueAsString('Body');
  const status = doc.getCellValueAsString('Status');
  const lastModified = doc.getCellValueAsString('Last Modified');
  const categories = doc.getCellValueAsString('Subcategory');

  const statusColor = DOC_STATUS_COLORS[status] || DOC_STATUS_COLORS['Draft'];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[rgba(202,209,211,0.3)] bg-[#F5F7F7]">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 mb-1.5 -ml-1.5 hover:opacity-80">
          <ArrowBackIcon size={14} />
          Back to documents
        </button>
        <h3 {...titleAttrs} className="text-[1rem] text-semantic-text leading-tight mb-1.5">{docTitle}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block px-1 py-0.5 text-[0.6rem] font-semibold" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
            {status}
          </span>
          {categories && (
            <span className="inline-block px-1 py-0.5 text-[0.6rem] font-medium bg-[#F2F4F8] text-semantic-text">
              {categories}
            </span>
          )}
          {lastModified && (
            <span className="text-[0.625rem] text-[rgba(67,82,84,0.5)]">
              Updated {timeAgo(lastModified)}
            </span>
          )}
        </div>
      </div>
      <div
        {...bodyAttrs}
        className="flex-1 overflow-auto px-5 py-4 prose-cbre"
      >
        {body ? (
          <ReactMarkdown>{body}</ReactMarkdown>
        ) : (
          <div className="text-center py-8">
            <p className="text-[rgba(67,82,84,0.5)]">This document has no content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
