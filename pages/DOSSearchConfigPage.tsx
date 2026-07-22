import React, { useState, useMemo, useCallback } from 'react';
import {
  AirtableRecord,
  Table as AirtableTable,
  useUpdateRecord,
  useInspectAttrs,
} from '../lib/airtable-hooks';
import { useSnackbar } from '../components/SnackbarProvider';
import { SearchIcon, EditIcon, CheckCircleIcon } from '../components/Icons';

interface SearchLogEntry {
  id: string;
  record: AirtableRecord;
  question: string;
  confidence: string;
  feedback: string;
  matchedPrompt: string;
  searchDate: string;
  serviceCode: string;
  serviceTitle: string;
}

interface DOSServiceFAQ {
  id: string;
  record: AirtableRecord;
  name: string;
  serviceCode: string;
  commonQuestions: string;
  questionCount: number;
}

interface DOSSearchConfigPageProps {
  dosSearchLogTable: AirtableTable;
  dosSearchLogRecords: AirtableRecord[];
  dosRecords: AirtableRecord[];
  dosTable: AirtableTable;
  onRefreshSearchLog: () => Promise<void>;
}

type TabId = 'logs' | 'faq';
type LogSortField = 'searchDate' | 'question' | 'confidence' | 'feedback';
type LogSortDir = 'asc' | 'desc';

const confidenceColors: Record<string, string> = {
  'Strong Match': 'bg-[#E8F5E9] text-[#1B5E20]',
  'Likely Match': 'bg-[#FFF3E0] text-[#E65100]',
  'Possible Match': 'bg-[#FBE9E7] text-[#BF360C]',
};

const feedbackColors: Record<string, string> = {
  'Helpful': 'bg-[#E8F5E9] text-[#1B5E20]',
  'Partially Relevant': 'bg-[#FFF3E0] text-[#E65100]',
  'Not Relevant': 'bg-[#FFEBEE] text-[#B71C1C]',
};

export function DOSSearchConfigPage({
  dosSearchLogTable,
  dosSearchLogRecords,
  dosRecords,
  dosTable,
  onRefreshSearchLog,
}: DOSSearchConfigPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('logs');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [sortField, setSortField] = useState<LogSortField>('searchDate');
  const [sortDir, setSortDir] = useState<LogSortDir>('desc');
  const [faqSearch, setFaqSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { showSnackbar } = useSnackbar();
  const { mutate: updateDosRecord, loading: saving } = useUpdateRecord(dosTable);

  const logEntries: SearchLogEntry[] = useMemo(() =>
    (dosSearchLogRecords || []).map(r => ({
      id: r.id,
      record: r,
      question: r.getCellValueAsString('Question'),
      confidence: r.getCellValueAsString('Confidence'),
      feedback: r.getCellValueAsString('Feedback'),
      matchedPrompt: r.getCellValueAsString('Matched Prompt'),
      searchDate: r.getCellValueAsString('Search Date'),
      serviceCode: r.getCellValueAsString('Service Code'),
      serviceTitle: r.getCellValueAsString('Service Title'),
    })),
    [dosSearchLogRecords]
  );

  const filteredLogs = useMemo(() => {
    let items = logEntries;
    if (confidenceFilter !== 'all') {
      items = items.filter(e => e.confidence === confidenceFilter);
    }
    if (feedbackFilter !== 'all') {
      items = items.filter(e => e.feedback === feedbackFilter);
    }
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      items = items.filter(e =>
        e.question.toLowerCase().includes(q) ||
        e.serviceTitle.toLowerCase().includes(q) ||
        e.serviceCode.toLowerCase().includes(q) ||
        e.matchedPrompt.toLowerCase().includes(q)
      );
    }
    items = [...items].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [logEntries, confidenceFilter, feedbackFilter, logSearch, sortField, sortDir]);

  const dosServices: DOSServiceFAQ[] = useMemo(() =>
    (dosRecords || []).map(r => {
      const cq = r.getCellValueAsString('Common Questions');
      const lines = cq ? cq.split('\n').filter((l: string) => l.trim()) : [];
      return {
        id: r.id,
        record: r,
        name: r.getCellValueAsString('Name'),
        serviceCode: r.getCellValueAsString('Service Code'),
        commonQuestions: cq,
        questionCount: lines.length,
      };
    }).sort((a, b) => {
      if (b.questionCount !== a.questionCount) return b.questionCount - a.questionCount;
      return a.name.localeCompare(b.name);
    }),
    [dosRecords]
  );

  const filteredFAQs = useMemo(() => {
    if (!faqSearch.trim()) return dosServices;
    const q = faqSearch.toLowerCase();
    return dosServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.serviceCode.toLowerCase().includes(q) ||
      s.commonQuestions.toLowerCase().includes(q)
    );
  }, [dosServices, faqSearch]);

  const startEdit = useCallback((service: DOSServiceFAQ) => {
    setEditingId(service.id);
    setEditValue(service.commonQuestions);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    try {
      await updateDosRecord({ recordId: editingId, fields: { 'Common Questions': editValue } });
      showSnackbar('Common questions updated', 'success');
      setEditingId(null);
      setEditValue('');
    } catch {
      showSnackbar('Failed to save changes', 'error');
    }
  }, [editingId, editValue, updateDosRecord, showSnackbar]);

  const toggleSort = useCallback((field: LogSortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const logStats = useMemo(() => {
    let helpful = 0, notRelevant = 0, noFeedback = 0;
    for (const e of logEntries) {
      if (e.feedback === 'Helpful') helpful++;
      else if (e.feedback === 'Not Relevant') notRelevant++;
      else if (!e.feedback) noFeedback++;
    }
    return { total: logEntries.length, helpful, notRelevant, noFeedback };
  }, [logEntries]);

  const faqStats = useMemo(() => {
    const total = dosServices.length;
    const withQuestions = dosServices.filter(s => s.questionCount > 0).length;
    const totalQuestions = dosServices.reduce((acc, s) => acc + s.questionCount, 0);
    return { total, withQuestions, totalQuestions };
  }, [dosServices]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[1.35rem] font-semibold text-core_palette-primary-3 tracking-tight">Ask DOS Configuration</h1>
            <p className="text-xs text-semantic-system-5 mt-0.5">Review search activity and manage frequently asked questions</p>
          </div>
          <button
            onClick={onRefreshSearchLog}
            className="px-3 py-1.5 text-xs font-medium bg-core_palette-primary-1 text-white hover:bg-core_palette-primary-3 transition-colors"
            aria-label="Refresh data"
          >
            Refresh
          </button>
        </div>

        <div className="flex gap-0 border-b border-core_palette-primary-5/30">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'logs'
                ? 'text-core_palette-primary-1'
                : 'text-semantic-system-5 hover:text-semantic-system-3'
            }`}
          >
            Search Logs
            <span className="ml-1.5 text-xs text-semantic-system-6">({logStats.total})</span>
            {activeTab === 'logs' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-core_palette-primary-2" />}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'faq'
                ? 'text-core_palette-primary-1'
                : 'text-semantic-system-5 hover:text-semantic-system-3'
            }`}
          >
            Common Questions
            <span className="ml-1.5 text-xs text-semantic-system-6">({faqStats.totalQuestions})</span>
            {activeTab === 'faq' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-core_palette-primary-2" />}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'logs' ? (
          <SearchLogsTab
            logs={filteredLogs}
            stats={logStats}
            confidenceFilter={confidenceFilter}
            feedbackFilter={feedbackFilter}
            logSearch={logSearch}
            sortField={sortField}
            sortDir={sortDir}
            onConfidenceFilter={setConfidenceFilter}
            onFeedbackFilter={setFeedbackFilter}
            onLogSearch={setLogSearch}
            onToggleSort={toggleSort}
          />
        ) : (
          <FAQTab
            services={filteredFAQs}
            stats={faqStats}
            faqSearch={faqSearch}
            onFaqSearch={setFaqSearch}
            editingId={editingId}
            editValue={editValue}
            saving={saving}
            onStartEdit={startEdit}
            onEditValueChange={setEditValue}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
          />
        )}
      </div>
    </div>
  );
}

function SearchLogsTab({
  logs, stats, confidenceFilter, feedbackFilter, logSearch,
  sortField, sortDir, onConfidenceFilter, onFeedbackFilter, onLogSearch, onToggleSort,
}: {
  logs: SearchLogEntry[];
  stats: { total: number; helpful: number; notRelevant: number; noFeedback: number };
  confidenceFilter: string;
  feedbackFilter: string;
  logSearch: string;
  sortField: LogSortField;
  sortDir: LogSortDir;
  onConfidenceFilter: (v: string) => void;
  onFeedbackFilter: (v: string) => void;
  onLogSearch: (v: string) => void;
  onToggleSort: (field: LogSortField) => void;
}) {
  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Searches" value={stats.total} />
        <StatCard label="Helpful" value={stats.helpful} accent="text-[#1B5E20]" />
        <StatCard label="Not Relevant" value={stats.notRelevant} accent="text-[#B71C1C]" />
        <StatCard label="No Feedback" value={stats.noFeedback} accent="text-semantic-system-5" />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-semantic-system-6" />
          <input
            type="text"
            value={logSearch}
            onChange={(e: any) => onLogSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-core_palette-primary-5/40 bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          />
        </div>
        <select
          value={confidenceFilter}
          onChange={(e: any) => onConfidenceFilter(e.target.value)}
          className="text-xs border border-core_palette-primary-5/40 bg-white px-2 py-1.5 focus:outline-none focus:border-core_palette-primary-1"
          aria-label="Filter by confidence"
        >
          <option value="all">All Confidence</option>
          <option value="Strong Match">Strong Match</option>
          <option value="Likely Match">Likely Match</option>
          <option value="Possible Match">Possible Match</option>
        </select>
        <select
          value={feedbackFilter}
          onChange={(e: any) => onFeedbackFilter(e.target.value)}
          className="text-xs border border-core_palette-primary-5/40 bg-white px-2 py-1.5 focus:outline-none focus:border-core_palette-primary-1"
          aria-label="Filter by feedback"
        >
          <option value="all">All Feedback</option>
          <option value="Helpful">Helpful</option>
          <option value="Partially Relevant">Partially Relevant</option>
          <option value="Not Relevant">Not Relevant</option>
        </select>
      </div>

      {logs.length === 0 ? (
        <div className="py-16 text-center">
          <SearchIcon size={32} className="mx-auto text-semantic-system-8 mb-2" />
          <p className="text-sm font-medium text-semantic-system-4">No search logs found</p>
          <p className="text-xs text-semantic-system-6 mt-1">
            {logSearch || confidenceFilter !== 'all' || feedbackFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Search logs will appear here as users interact with Ask DOS'}
          </p>
        </div>
      ) : (
        <div className="border border-core_palette-primary-5/30 overflow-x-auto" tabIndex={0}>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-semantic-surface text-left">
                <SortableHeader label="Date" field="searchDate" currentField={sortField} dir={sortDir} onSort={onToggleSort} width="w-[120px]" />
                <SortableHeader label="Question" field="question" currentField={sortField} dir={sortDir} onSort={onToggleSort} width="min-w-[200px]" />
                <SortableHeader label="Confidence" field="confidence" currentField={sortField} dir={sortDir} onSort={onToggleSort} width="w-[110px]" />
                <SortableHeader label="Feedback" field="feedback" currentField={sortField} dir={sortDir} onSort={onToggleSort} width="w-[110px]" />
                <th className="px-3 py-2 font-semibold text-semantic-system-4 w-[100px]">Service Code</th>
                <th className="px-3 py-2 font-semibold text-semantic-system-4 min-w-[150px]">Service Title</th>
                <th className="px-3 py-2 font-semibold text-semantic-system-4 min-w-[180px]">Matched Prompt</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(entry => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortableHeader({ label, field, currentField, dir, onSort, width }: {
  label: string;
  field: LogSortField;
  currentField: LogSortField;
  dir: LogSortDir;
  onSort: (field: LogSortField) => void;
  width?: string;
}) {
  const active = currentField === field;
  return (
    <th className={`px-3 py-2 font-semibold text-semantic-system-4 ${width || ''}`}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-core_palette-primary-1 transition-colors"
      >
        {label}
        {active && <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  );
}

function LogRow({ entry }: { entry: SearchLogEntry }) {
  const questionAttrs = useInspectAttrs(entry.record, 'Question');
  const confidenceAttrs = useInspectAttrs(entry.record, 'Confidence');
  const feedbackAttrs = useInspectAttrs(entry.record, 'Feedback');
  const dateAttrs = useInspectAttrs(entry.record, 'Search Date');
  const codeAttrs = useInspectAttrs(entry.record, 'Service Code');
  const titleAttrs = useInspectAttrs(entry.record, 'Service Title');
  const promptAttrs = useInspectAttrs(entry.record, 'Matched Prompt');

  const formattedDate = useMemo(() => {
    if (!entry.searchDate) return '—';
    try {
      const d = new Date(entry.searchDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return entry.searchDate;
    }
  }, [entry.searchDate]);

  return (
    <tr className="border-t border-core_palette-primary-5/20 hover:bg-semantic-surface/50 transition-colors">
      <td className="px-3 py-2 text-semantic-system-5 whitespace-nowrap" {...dateAttrs}>{formattedDate}</td>
      <td className="px-3 py-2 text-semantic-system-2 font-medium" {...questionAttrs}>{entry.question || '—'}</td>
      <td className="px-3 py-2" {...confidenceAttrs}>
        {entry.confidence ? (
          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold ${confidenceColors[entry.confidence] || 'bg-gray-100 text-gray-600'}`}>
            {entry.confidence}
          </span>
        ) : <span className="text-semantic-system-7">—</span>}
      </td>
      <td className="px-3 py-2" {...feedbackAttrs}>
        {entry.feedback ? (
          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold ${feedbackColors[entry.feedback] || 'bg-gray-100 text-gray-600'}`}>
            {entry.feedback}
          </span>
        ) : <span className="text-semantic-system-7">—</span>}
      </td>
      <td className="px-3 py-2 font-mono text-semantic-system-4" {...codeAttrs}>{entry.serviceCode || '—'}</td>
      <td className="px-3 py-2 text-semantic-system-3" {...titleAttrs}>{entry.serviceTitle || '—'}</td>
      <td className="px-3 py-2 text-semantic-system-5 max-w-[250px] truncate" {...promptAttrs}>{entry.matchedPrompt || '—'}</td>
    </tr>
  );
}

function FAQTab({
  services, stats, faqSearch, onFaqSearch, editingId, editValue, saving,
  onStartEdit, onEditValueChange, onSaveEdit, onCancelEdit,
}: {
  services: DOSServiceFAQ[];
  stats: { total: number; withQuestions: number; totalQuestions: number };
  faqSearch: string;
  onFaqSearch: (v: string) => void;
  editingId: string | null;
  editValue: string;
  saving: boolean;
  onStartEdit: (service: DOSServiceFAQ) => void;
  onEditValueChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="px-6 py-4">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="DOS Services" value={stats.total} />
        <StatCard label="With Questions" value={stats.withQuestions} accent="text-core_palette-primary-1" />
        <StatCard label="Total Questions" value={stats.totalQuestions} accent="text-core_palette-primary-1" />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-semantic-system-6" />
          <input
            type="text"
            value={faqSearch}
            onChange={(e: any) => onFaqSearch(e.target.value)}
            placeholder="Search services or questions..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-core_palette-primary-5/40 bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          />
        </div>
      </div>

      {services.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium text-semantic-system-4">No services found</p>
          <p className="text-xs text-semantic-system-6 mt-1">Try adjusting your search</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map(service => (
            <FAQServiceCard
              key={service.id}
              service={service}
              isEditing={editingId === service.id}
              editValue={editValue}
              saving={saving}
              onStartEdit={() => onStartEdit(service)}
              onEditValueChange={onEditValueChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FAQServiceCard({
  service, isEditing, editValue, saving,
  onStartEdit, onEditValueChange, onSaveEdit, onCancelEdit,
}: {
  service: DOSServiceFAQ;
  isEditing: boolean;
  editValue: string;
  saving: boolean;
  onStartEdit: () => void;
  onEditValueChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const nameAttrs = useInspectAttrs(service.record, 'Name');
  const codeAttrs = useInspectAttrs(service.record, 'Service Code');
  const questions = service.commonQuestions ? service.commonQuestions.split('\n').filter((l: string) => l.trim()) : [];

  return (
    <div className="border border-core_palette-primary-5/30 bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 bg-semantic-surface/40">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-semantic-system-5 bg-white px-1.5 py-0.5 border border-core_palette-primary-5/20" {...codeAttrs}>
            {service.serviceCode}
          </span>
          <span className="text-sm font-medium text-core_palette-primary-3" {...nameAttrs}>{service.name}</span>
          <span className="text-[10px] text-semantic-system-6">
            {service.questionCount} question{service.questionCount !== 1 ? 's' : ''}
          </span>
        </div>
        {!isEditing && (
          <button
            onClick={onStartEdit}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-core_palette-primary-1 hover:bg-core_palette-primary-1/10 transition-colors"
            aria-label={`Edit questions for ${service.name}`}
          >
            <EditIcon size={12} />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="p-4">
          <p className="text-[10px] text-semantic-system-5 mb-2">One question per line. These questions will appear as search prompts and help users find this service.</p>
          <textarea
            value={editValue}
            onChange={(e: any) => onEditValueChange(e.target.value)}
            rows={Math.max(5, (editValue.match(/\n/g) || []).length + 2)}
            className="w-full text-xs border border-core_palette-primary-5/40 bg-white px-3 py-2 focus:outline-none focus:border-core_palette-primary-1 transition-colors font-sans leading-relaxed resize-y"
            placeholder="How do I request a new laptop?&#10;What is the process for software installation?&#10;Who handles network access requests?"
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={onCancelEdit}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-semantic-system-4 border border-core_palette-primary-5/40 hover:bg-semantic-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium bg-core_palette-primary-1 text-white hover:bg-core_palette-primary-3 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? (
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status" aria-label="Loading" />
              ) : (
                <CheckCircleIcon size={12} />
              )}
              Save
            </button>
          </div>
        </div>
      ) : questions.length > 0 ? (
        <div className="px-4 py-2.5">
          <ul className="flex flex-col gap-1">
            {questions.map((q: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-semantic-system-3">
                <span className="text-core_palette-primary-2 mt-px flex-shrink-0">?</span>
                <span>{q.trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-semantic-system-6 italic">No common questions — click Edit to add some</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-core_palette-primary-5/30 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-semantic-system-6">{label}</p>
      <p className={`text-xl font-semibold mt-0.5 ${accent || 'text-semantic-system-2'}`}>{value}</p>
    </div>
  );
}
