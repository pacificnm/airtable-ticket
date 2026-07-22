import React, { useState } from 'react';
import { AirtableRecord, useInspectAttrs } from '../lib/airtable-hooks';
import { NoteSource, SOURCE_CONFIG } from '../types';
import { timeAgo } from '../utils';
import { AddIcon, LockIcon } from './Icons';
import { RoleGuard, useHasPermission } from './RoleGuard';

export interface TicketNotesTabProps {
  ticketNotes: AirtableRecord[];
  showNoteForm: boolean;
  setShowNoteForm: (v: boolean) => void;
  handleAddNote: (title: string, content: string, source: NoteSource, isPrivate: boolean) => void;
}

export function TicketNotesTab({
  ticketNotes,
  showNoteForm,
  setShowNoteForm,
  handleAddNote,
}: TicketNotesTabProps) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">Communication Log</span>
        <RoleGuard permission="tickets.note.create">
          <button
            onClick={() => setShowNoteForm(true)}
            className="inline-flex items-center gap-1 text-[0.6875rem] text-core_palette-primary-1 hover:opacity-80 transition-opacity"
          >
            <AddIcon size={14} />
            Add Note
          </button>
        </RoleGuard>
      </div>

      {showNoteForm && (
        <NoteForm
          onSubmit={handleAddNote}
          onCancel={() => setShowNoteForm(false)}
        />
      )}

      {ticketNotes.length > 0 ? (
        <div>
          {ticketNotes.map((note: AirtableRecord, i: number) => (
            <NoteItem key={note.id} note={note} isLast={i === ticketNotes.length - 1} />
          ))}
        </div>
      ) : (
        !showNoteForm && (
          <div className="border border-dashed border-[rgba(202,209,211,0.3)] py-8 text-center">
            <p className="text-[0.875rem] text-[#666666] mb-1">No notes yet</p>
            <p className="text-[0.75rem] text-[rgba(67,82,84,0.5)] mb-3">Add a note to start the communication log for this ticket.</p>
            <RoleGuard permission="tickets.note.create">
              <button
                onClick={() => setShowNoteForm(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] transition-colors"
              >
                <AddIcon size={14} />
                Add First Note
              </button>
            </RoleGuard>
          </div>
        )
      )}
    </div>
  );
}

function NoteItem({ note, isLast }: { note: AirtableRecord; isLast: boolean }) {
  const source = note.getCellValueAsString('Source') as NoteSource;
  const noteTitle = note.getCellValueAsString('Note Title');
  const content = note.getCellValueAsString('Note');
  const createdDate = note.getCellValueAsString('Created');
  const isPrivate = !!note.getCellValue('Private');

  const sourceConfig = SOURCE_CONFIG[source] || SOURCE_CONFIG['In App'];

  const titleAttrs = useInspectAttrs(note, 'Note Title');
  const contentAttrs = useInspectAttrs(note, 'Note');

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-6 h-6 flex items-center justify-center text-white text-[0.625rem] flex-shrink-0"
          style={{ backgroundColor: sourceConfig.color }}
        >
          {sourceConfig.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[rgba(202,209,211,0.3)] mt-1" />}
      </div>
      <div className={`flex-1 ${isLast ? 'pb-2' : 'pb-4'}`}>
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span {...titleAttrs} className="text-[0.75rem] font-semibold text-semantic-text">{noteTitle}</span>
          <span
            className="inline-block px-1 py-0.5 text-[0.625rem] font-medium"
            style={{ backgroundColor: `${sourceConfig.color}15`, color: sourceConfig.color }}
          >
            {source}
          </span>
          {isPrivate && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[0.625rem] font-medium bg-[#FFF8E1] text-[#AF6002]">
              <LockIcon size={12} />
              Private
            </span>
          )}
        </div>
        <p {...contentAttrs} className="text-[0.75rem] text-[#666666] leading-normal whitespace-pre-wrap">{content}</p>
        <p className="text-[0.625rem] text-[rgba(67,82,84,0.5)] mt-0.5">{createdDate ? timeAgo(createdDate) : ''}</p>
      </div>
    </div>
  );
}

function NoteForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string, content: string, source: NoteSource, isPrivate: boolean) => void;
  onCancel: () => void;
}) {
  const [noteTitle, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState<NoteSource>('In App');
  const canChangeSource = useHasPermission('tickets.notes.source');
  const canMarkPrivate = useHasPermission('tickets.note.private');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!noteTitle.trim() || !content.trim()) return;
    onSubmit(noteTitle, content, source, isPrivate);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 border border-[rgba(202,209,211,0.3)] p-3 bg-[#F5F7F7]">
      {canChangeSource && (
        <div className="flex gap-1.5 mb-2">
          {(['Email', 'Slack', 'Meeting', 'In App'] as NoteSource[]).map(s => {
            const cfg = SOURCE_CONFIG[s];
            const isActive = source === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={`px-2 py-1 text-[0.6875rem] font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-[#666666] border border-[rgba(202,209,211,0.3)] bg-white hover:opacity-80'
                }`}
                style={isActive ? { backgroundColor: cfg.color } : undefined}
              >
                {cfg.icon} {s}
              </button>
            );
          })}
        </div>
      )}
      <input
        type="text"
        placeholder="Note title..."
        value={noteTitle}
        onChange={(e: any) => setTitle(e.target.value)}
        className="w-full mb-2 px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
      />
      <textarea
        placeholder="Note content..."
        value={content}
        onChange={(e: any) => setContent(e.target.value)}
        rows={3}
        className="w-full mb-2 px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white resize-none focus:outline-none focus:border-core_palette-primary-1 transition-colors"
      />
      <div className="flex items-center justify-between">
        {canMarkPrivate ? (
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-5 h-5 flex items-center justify-center border transition-colors ${
                isPrivate
                  ? 'bg-[#AF6002] border-[#AF6002] text-white'
                  : 'border-[rgba(202,209,211,0.3)] text-[rgba(67,82,84,0.5)]'
              }`}
            >
              <LockIcon size={14} />
            </button>
            <span className={`text-[0.75rem] ${isPrivate ? 'text-[#AF6002] font-semibold' : 'text-[#666666]'}`}>
              Private
            </span>
          </label>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[0.75rem] text-[#666666] hover:text-semantic-text transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!noteTitle.trim() || !content.trim()}
            className="px-3 py-1.5 text-[0.75rem] text-white bg-core_palette-primary-1 hover:bg-[#004D37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Note
          </button>
        </div>
      </div>
    </form>
  );
}
