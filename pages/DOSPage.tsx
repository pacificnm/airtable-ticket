import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  SearchIcon,
  CloseIcon,
  DescriptionIcon,
  ChevronRightIcon,
  ExpandMoreIcon,
  CheckCircleOutlineIcon,
} from '../components/Icons';
import { AirtableRecord, useBase, useRecords, useCreateRecord } from '../lib/airtable-hooks';

interface DOSNode {
  id: string;
  record: AirtableRecord;
  uid: string;
  recordType: string;
  hierarchyLevel: number;
  volumeCode: number | null;
  volumeTitle: string;
  chapterCode: number | null;
  chapterTitle: string;
  serviceCode: string;
  serviceTitle: string;
  definition: string;
  outcomesCount: number;
  responsibilitiesCount: number;
  outcomesText: string;
  responsibilitiesText: string;
  hasContent: boolean;
  serviceItemIds: string[];
  commonQuestions: string;
}

interface ServiceItemNode {
  id: string;
  uid: string;
  itemType: string;
  itemText: string;
  itemOrder: number;
  serviceCode: string;
  serviceTitle: string;
  parentServiceId: string;
}

interface VolumeGroup {
  volumeCode: number;
  volumeTitle: string;
  volumeNode: DOSNode | null;
  chapters: ChapterGroup[];
}

interface ChapterGroup {
  chapterCode: number;
  chapterTitle: string;
  chapterNode: DOSNode | null;
  sections: DOSNode[];
}

const VOLUME_COLORS: Record<number, string> = {
  1: '#003F2D',
  2: '#032842',
  3: '#538184',
  4: '#80BBAD',
  5: '#7F8480',
};

const VOLUME_ACCENT_COLORS: Record<number, string> = {
  1: '#17E88F',
  2: '#778F9C',
  3: '#96B3B6',
  4: '#C0D4CB',
  5: '#CAD1D3',
};

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  'Volume': { bg: '#003F2D', text: '#FFFFFF' },
  'Chapter': { bg: '#E3F2FD', text: '#0D47A1' },
  'Section': { bg: '#FFF3E0', text: '#E65100' },
};

interface DOSPageProps {
  dosRecords: AirtableRecord[];
  serviceItemRecords: AirtableRecord[];
}

export function DOSPage({ dosRecords, serviceItemRecords }: DOSPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<number>>(new Set([1]));
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [tocSearch, setTocSearch] = useState('');

  const dosNodes: DOSNode[] = useMemo(() =>
    dosRecords
      .map(r => {
        const recordType = r.getCellValueAsString('Record Type');
        if (!recordType) return null;
        const serviceItemLinks = r.getCellValue('Service Items') as any;
        const serviceItemIds = Array.isArray(serviceItemLinks)
          ? serviceItemLinks.map((l: any) => l.id)
          : [];
        return {
          id: r.id,
          record: r,
          uid: r.getCellValueAsString('Service UID'),
          recordType,
          hierarchyLevel: (r.getCellValue('Hierarchy Level') as number) || 0,
          volumeCode: r.getCellValue('Volume Code') as number | null,
          volumeTitle: r.getCellValueAsString('Volume Title'),
          chapterCode: r.getCellValue('Chapter Code') as number | null,
          chapterTitle: r.getCellValueAsString('Chapter Title'),
          serviceCode: r.getCellValueAsString('Service Code'),
          serviceTitle: r.getCellValueAsString('Service Title'),
          definition: r.getCellValueAsString('Definition'),
          outcomesCount: (r.getCellValue('Outcomes Count') as number) || 0,
          responsibilitiesCount: (r.getCellValue('Responsibility Count') as number) || 0,
          outcomesText: r.getCellValueAsString('Outcomes Text'),
          responsibilitiesText: r.getCellValueAsString('Responsibilities Text'),
          hasContent: !!r.getCellValue('Has Content'),
          serviceItemIds,
          commonQuestions: r.getCellValueAsString('Common Questions') || '',
        };
      })
      .filter((n): n is DOSNode => n !== null)
      .sort((a, b) => {
        const vc = (a.volumeCode || 0) - (b.volumeCode || 0);
        if (vc !== 0) return vc;
        const cc = (a.chapterCode || 0) - (b.chapterCode || 0);
        if (cc !== 0) return cc;
        return a.serviceCode.localeCompare(b.serviceCode, undefined, { numeric: true });
      }),
    [dosRecords]
  );

  const serviceItemMap = useMemo(() => {
    const map = new Map<string, ServiceItemNode[]>();
    serviceItemRecords.forEach(r => {
      const itemType = r.getCellValueAsString('Item Type');
      if (!itemType) return;
      const servicesLink = r.getCellValue('Services') as any;
      const parentId = Array.isArray(servicesLink) && servicesLink.length > 0
        ? servicesLink[0].id
        : '';
      const node: ServiceItemNode = {
        id: r.id,
        uid: r.getCellValueAsString('Item UID'),
        itemType,
        itemText: r.getCellValueAsString('Item Text'),
        itemOrder: (r.getCellValue('Item Order') as number) || 0,
        serviceCode: r.getCellValueAsString('Service Code'),
        serviceTitle: r.getCellValueAsString('Service Title'),
        parentServiceId: parentId,
      };
      if (parentId) {
        const existing = map.get(parentId) || [];
        existing.push(node);
        map.set(parentId, existing);
      }
    });
    map.forEach(items => items.sort((a, b) => a.itemOrder - b.itemOrder));
    return map;
  }, [serviceItemRecords]);

  const volumeGroups: VolumeGroup[] = useMemo(() => {
    const volMap = new Map<number, VolumeGroup>();

    dosNodes.forEach(node => {
      const vc = node.volumeCode || 0;
      if (!volMap.has(vc)) {
        volMap.set(vc, {
          volumeCode: vc,
          volumeTitle: node.volumeTitle,
          volumeNode: null,
          chapters: [],
        });
      }
      const vol = volMap.get(vc)!;

      if (node.recordType === 'Volume') {
        vol.volumeNode = node;
        vol.volumeTitle = node.volumeTitle || node.serviceTitle;
      } else if (node.recordType === 'Chapter') {
        const chKey = `${vc}-${node.chapterCode}`;
        let chapter = vol.chapters.find(c => c.chapterCode === node.chapterCode);
        if (!chapter) {
          chapter = {
            chapterCode: node.chapterCode || 0,
            chapterTitle: node.chapterTitle || node.serviceTitle,
            chapterNode: null,
            sections: [],
          };
          vol.chapters.push(chapter);
        }
        chapter.chapterNode = node;
        chapter.chapterTitle = node.chapterTitle || node.serviceTitle;
      } else if (node.recordType === 'Section') {
        let chapter = vol.chapters.find(c => c.chapterCode === node.chapterCode);
        if (!chapter) {
          chapter = {
            chapterCode: node.chapterCode || 0,
            chapterTitle: node.chapterTitle || '',
            chapterNode: null,
            sections: [],
          };
          vol.chapters.push(chapter);
        }
        chapter.sections.push(node);
      }
    });

    return Array.from(volMap.values()).sort((a, b) => a.volumeCode - b.volumeCode);
  }, [dosNodes]);

  const selectedNode = useMemo(() =>
    dosNodes.find(n => n.id === selectedId) || null,
    [dosNodes, selectedId]
  );

  const selectedItems = useMemo(() =>
    selectedNode ? (serviceItemMap.get(selectedNode.id) || []) : [],
    [selectedNode, serviceItemMap]
  );

  const outcomes = useMemo(() =>
    selectedItems.filter(i => i.itemType === 'Outcome'),
    [selectedItems]
  );

  const responsibilities = useMemo(() =>
    selectedItems.filter(i => i.itemType === 'Responsibility'),
    [selectedItems]
  );

  const toggleVolume = (vc: number) => {
    setExpandedVolumes(prev => {
      const next = new Set(prev);
      if (next.has(vc)) next.delete(vc); else next.add(vc);
      return next;
    });
  };

  const toggleChapter = (key: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectNode = (node: DOSNode) => {
    setSelectedId(node.id);
    if (node.volumeCode) {
      setExpandedVolumes(prev => new Set(prev).add(node.volumeCode!));
    }
    if (node.chapterCode && node.volumeCode) {
      setExpandedChapters(prev => new Set(prev).add(`${node.volumeCode}-${node.chapterCode}`));
    }
  };

  const totalServices = dosNodes.filter(n => n.recordType === 'Section' || n.recordType === 'Chapter').length;

  const filteredMatch = (title: string, code: string) => {
    if (!tocSearch) return true;
    const q = tocSearch.toLowerCase();
    return title.toLowerCase().includes(q) || code.toLowerCase().includes(q);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-white border-b border-semantic-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <DescriptionIcon size={16} style={{ color: '#003F2D' }} />
          <span className="text-[0.8125rem] font-semibold text-semantic-text font-sans">Description of Services</span>
          <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium bg-semantic-surface text-semantic-system-5">
            {volumeGroups.length} volumes
          </span>
          <span className="inline-flex items-center px-1.5 h-[18px] text-[0.625rem] font-medium bg-semantic-surface text-semantic-system-5">
            {totalServices} services
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[300px] flex-shrink-0 bg-white border-r border-semantic-surface flex flex-col">
          <div className="px-3 py-2 border-b border-semantic-surface flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                <SearchIcon size={13} className="text-semantic-system-7" />
              </div>
              <input
                type="text"
                placeholder="Search services..."
                value={tocSearch}
                onChange={e => setTocSearch(e.target.value)}
                className="w-full pl-7 pr-7 py-1 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1"
              />
              {tocSearch && (
                <button onClick={() => setTocSearch('')} className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-semantic-system-7 hover:text-semantic-system-5" aria-label="Clear search">
                  <CloseIcon size={13} />
                </button>
              )}
            </div>
          </div>

          <nav className="flex-1 overflow-auto py-1" tabIndex={0}>
            {volumeGroups.map(vol => {
              const isVolExpanded = expandedVolumes.has(vol.volumeCode);
              const volColor = VOLUME_COLORS[vol.volumeCode] || '#003F2D';
              const volAccent = VOLUME_ACCENT_COLORS[vol.volumeCode] || '#17E88F';

              const hasMatchingChildren = tocSearch
                ? vol.chapters.some(ch =>
                    filteredMatch(ch.chapterTitle, ch.chapterNode?.serviceCode || '') ||
                    ch.sections.some(s => filteredMatch(s.serviceTitle, s.serviceCode))
                  )
                : true;

              if (tocSearch && !hasMatchingChildren && !filteredMatch(vol.volumeTitle, String(vol.volumeCode))) {
                return null;
              }

              return (
                <div key={vol.volumeCode}>
                  <button
                    onClick={() => {
                      toggleVolume(vol.volumeCode);
                      if (vol.volumeNode) setSelectedId(vol.volumeNode.id);
                    }}
                    className={`w-full flex items-center gap-1.5 px-3 py-2 text-left transition-colors group ${
                      selectedId === vol.volumeNode?.id
                        ? 'bg-[rgba(0,63,45,0.08)]'
                        : 'hover:bg-[#FAFBFB]'
                    }`}
                  >
                    <div
                      className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: volColor }}
                    >
                      <span className="text-[0.5625rem] font-bold" style={{ color: volAccent }}>
                        {vol.volumeCode}
                      </span>
                    </div>
                    <span className="flex-1 text-[0.75rem] font-semibold text-semantic-text truncate">
                      {vol.volumeTitle}
                    </span>
                    <span className="text-semantic-system-7 transition-transform flex-shrink-0" style={{ transform: isVolExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      <ExpandMoreIcon size={16} />
                    </span>
                  </button>

                  {isVolExpanded && vol.chapters.map(ch => {
                    const chKey = `${vol.volumeCode}-${ch.chapterCode}`;
                    const isChExpanded = expandedChapters.has(chKey);
                    const hasSections = ch.sections.length > 0;

                    const chapterMatches = filteredMatch(ch.chapterTitle, ch.chapterNode?.serviceCode || '');
                    const sectionMatches = ch.sections.some(s => filteredMatch(s.serviceTitle, s.serviceCode));
                    if (tocSearch && !chapterMatches && !sectionMatches) return null;

                    return (
                      <div key={chKey}>
                        <button
                          onClick={() => {
                            if (hasSections) toggleChapter(chKey);
                            if (ch.chapterNode) selectNode(ch.chapterNode);
                          }}
                          className={`w-full flex items-center gap-1.5 pl-7 pr-3 py-1.5 text-left transition-colors ${
                            selectedId === ch.chapterNode?.id
                              ? 'bg-[rgba(0,63,45,0.08)]'
                              : 'hover:bg-[#FAFBFB]'
                          }`}
                        >
                          {hasSections ? (
                            <span className="text-semantic-system-7 flex-shrink-0 transition-transform" style={{ transform: isChExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                              <ChevronRightIcon size={14} />
                            </span>
                          ) : (
                            <span className="w-[14px] flex-shrink-0" />
                          )}
                          <span className="inline-flex items-center px-1 h-[14px] text-[0.5rem] font-mono font-medium flex-shrink-0" style={{ backgroundColor: '#E3F2FD', color: '#0D47A1' }}>
                            {ch.chapterNode?.serviceCode || ch.chapterCode}
                          </span>
                          <span className="flex-1 text-[0.6875rem] text-semantic-text truncate">
                            {ch.chapterTitle}
                          </span>
                          {ch.chapterNode && (ch.chapterNode.outcomesCount > 0 || ch.chapterNode.responsibilitiesCount > 0) && (
                            <span className="text-[0.5rem] text-semantic-system-7 flex-shrink-0">
                              {ch.chapterNode.outcomesCount + ch.chapterNode.responsibilitiesCount}
                            </span>
                          )}
                        </button>

                        {isChExpanded && ch.sections.map(sec => {
                          if (tocSearch && !filteredMatch(sec.serviceTitle, sec.serviceCode)) return null;

                          return (
                            <button
                              key={sec.id}
                              onClick={() => selectNode(sec)}
                              className={`w-full flex items-center gap-1.5 pl-14 pr-3 py-1.5 text-left transition-colors ${
                                selectedId === sec.id
                                  ? 'bg-[rgba(0,63,45,0.08)]'
                                  : 'hover:bg-[#FAFBFB]'
                              }`}
                            >
                              <span className="inline-flex items-center px-1 h-[14px] text-[0.5rem] font-mono font-medium flex-shrink-0" style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>
                                {sec.serviceCode}
                              </span>
                              <span className="flex-1 text-[0.6875rem] text-semantic-text truncate">
                                {sec.serviceTitle}
                              </span>
                              {(sec.outcomesCount > 0 || sec.responsibilitiesCount > 0) && (
                                <span className="text-[0.5rem] text-semantic-system-7 flex-shrink-0">
                                  {sec.outcomesCount + sec.responsibilitiesCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 min-w-0 overflow-auto bg-[#F5F7F7]">
          {selectedNode ? (
            <ContentReader
              node={selectedNode}
              outcomes={outcomes}
              responsibilities={responsibilities}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      <AskDOSPanel
        dosNodes={dosNodes}
        dosRecords={dosRecords}
        serviceItemRecords={serviceItemRecords}
        serviceItemMap={serviceItemMap}
        onSelectNode={selectNode}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-12 h-12 flex items-center justify-center mb-4" style={{ backgroundColor: '#003F2D' }}>
        <DescriptionIcon size={24} style={{ color: '#17E88F' }} />
      </div>
      <p className="text-[0.875rem] font-semibold text-semantic-text mb-1">
        Description of Services
      </p>
      <p className="text-[0.75rem] text-semantic-system-5 max-w-[320px]">
        Select a volume, chapter, or service from the table of contents to view its details, expected outcomes, and responsibilities.
      </p>
    </div>
  );
}

function ContentReader({ node, outcomes, responsibilities }: {
  node: DOSNode;
  outcomes: ServiceItemNode[];
  responsibilities: ServiceItemNode[];
}) {
  const typeStyle = TYPE_STYLES[node.recordType] || TYPE_STYLES['Section'];
  const volColor = VOLUME_COLORS[node.volumeCode || 1] || '#003F2D';
  const volAccent = VOLUME_ACCENT_COLORS[node.volumeCode || 1] || '#17E88F';

  return (
    <div className="max-w-[780px] mx-auto">
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: `3px solid ${volColor}` }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="inline-flex items-center px-1.5 h-[20px] text-[0.625rem] font-mono font-semibold"
            style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
          >
            {node.serviceCode}
          </span>
          <span
            className="inline-flex items-center px-1.5 h-[18px] text-[0.5625rem] font-medium uppercase tracking-wider"
            style={{ backgroundColor: '#F2F4F8', color: '#616670' }}
          >
            {node.recordType}
          </span>
          {node.volumeTitle && (
            <span className="text-[0.625rem] text-semantic-system-7">
              Volume {node.volumeCode}: {node.volumeTitle}
            </span>
          )}
        </div>
        <h1 className="text-[1.25rem] font-semibold text-semantic-text font-sans leading-tight">
          {node.serviceTitle}
        </h1>
        {node.chapterTitle && node.recordType === 'Section' && (
          <p className="text-[0.75rem] text-semantic-system-5 mt-1">
            Chapter {node.chapterCode}: {node.chapterTitle}
          </p>
        )}
      </div>

      {node.definition && (
        <div className="px-6 py-5">
          <div className="flex items-center gap-1.5 mb-3">
            <DescriptionIcon size={14} style={{ color: '#003F2D' }} />
            <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Definition</span>
          </div>
          <div className="text-[0.8125rem] text-semantic-text leading-relaxed whitespace-pre-wrap">
            {node.definition}
          </div>
        </div>
      )}

      {outcomes.length > 0 && (
        <div className="px-6 py-5 border-t border-semantic-surface">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: '#E6FCE8' }}>
              <CheckCircleOutlineIcon size={13} style={{ color: '#006400' }} />
            </div>
            <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Expected Outcomes</span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 text-[0.5625rem] font-medium bg-[#E6FCE8] text-[#006400]">
              {outcomes.length}
            </span>
          </div>
          <div className="space-y-0">
            {outcomes.map((item, idx) => (
              <div key={item.id} className="flex gap-3 py-2.5 border-b border-[#F0F2F2] last:border-b-0">
                <span className="text-[0.625rem] font-mono text-semantic-system-7 w-5 flex-shrink-0 pt-0.5 text-right">
                  {idx + 1}
                </span>
                <p className="text-[0.8125rem] text-semantic-text leading-relaxed flex-1">
                  {item.itemText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {responsibilities.length > 0 && (
        <div className="px-6 py-5 border-t border-semantic-surface">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 flex items-center justify-center" style={{ backgroundColor: '#E3F2FD' }}>
              <ResponsibilityIcon />
            </div>
            <span className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest">Responsibilities</span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 text-[0.5625rem] font-medium bg-[#E3F2FD] text-[#0D47A1]">
              {responsibilities.length}
            </span>
          </div>
          <div className="space-y-0">
            {responsibilities.map((item, idx) => (
              <div key={item.id} className="flex gap-3 py-2.5 border-b border-[#F0F2F2] last:border-b-0">
                <span className="text-[0.625rem] font-mono text-semantic-system-7 w-5 flex-shrink-0 pt-0.5 text-right">
                  {idx + 1}
                </span>
                <p className="text-[0.8125rem] text-semantic-text leading-relaxed flex-1">
                  {item.itemText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {outcomes.length === 0 && responsibilities.length === 0 && !node.definition && (
        <div className="px-6 py-12 text-center">
          <p className="text-[0.8125rem] text-semantic-system-5">
            {node.recordType === 'Volume'
              ? 'Select a chapter or section within this volume to view its details.'
              : node.recordType === 'Chapter' && node.outcomesCount === 0 && node.responsibilitiesCount === 0
              ? 'This chapter contains sections below. Select a section to view its outcomes and responsibilities.'
              : 'No content available for this item.'}
          </p>
        </div>
      )}

      <div className="h-12" />
    </div>
  );
}

function ResponsibilityIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={13} height={13} fill="#0D47A1">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

function getBigrams(str: string): Set<string> {
  const s = str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const bigrams = new Set<string>();
  const words = s.split(/\s+/);
  for (const w of words) {
    for (let i = 0; i < w.length - 1; i++) {
      bigrams.add(w.substring(i, i + 2));
    }
  }
  return bigrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getContentWords(text: string): string[] {
  const STOP = new Set([
    'a','an','the','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','shall','can',
    'need','must','i','me','my','we','our','us','you','your','he','she','it',
    'they','them','their','this','that','these','those','of','in','to','for',
    'with','on','at','by','from','up','about','into','through','during','before',
    'after','above','below','between','out','off','over','under','again','and',
    'but','or','nor','not','so','yet','both','either','if','then','than','too',
    'very','just','also','what','which','who','whom','when','where','why','how',
    'all','each','every','any','few','more','most','some','such','no','only',
    'own','same','there','here',
  ]);
  return normalizeText(text).split(' ').filter(w => w.length > 1 && !STOP.has(w));
}

interface PromptEntry {
  prompt: string;
  promptNorm: string;
  promptBigrams: Set<string>;
  promptWords: string[];
  dosNodeId: string;
  serviceItemIds: string[];
}

interface DeepMatchResult {
  node: DOSNode;
  confidence: 'strong' | 'likely' | 'possible';
  score: number;
  matchedPrompt: string | null;
  matchedItems: { type: string; text: string }[];
}

function buildPromptIndex(
  dosRecords: AirtableRecord[],
  serviceItemRecords: AirtableRecord[],
  dosNodes: DOSNode[],
  serviceItemMap: Map<string, ServiceItemNode[]>,
): PromptEntry[] {
  const entries: PromptEntry[] = [];
  const seen = new Set<string>();

  const addEntry = (prompt: string, dosNodeId: string, itemIds: string[]) => {
    const norm = normalizeText(prompt);
    if (norm.length < 3) return;
    const key = `${dosNodeId}::${norm}`;
    if (seen.has(key)) {
      const existing = entries.find(e => e.dosNodeId === dosNodeId && e.promptNorm === norm);
      if (existing && itemIds.length > 0) {
        existing.serviceItemIds = [...new Set([...existing.serviceItemIds, ...itemIds])];
      }
      return;
    }
    seen.add(key);
    entries.push({
      prompt,
      promptNorm: norm,
      promptBigrams: getBigrams(prompt),
      promptWords: getContentWords(prompt),
      dosNodeId,
      serviceItemIds: itemIds,
    });
  };

  for (const r of dosRecords) {
    const prompt = r.getCellValueAsString('Prompt Checker')?.trim();
    if (prompt) addEntry(prompt, r.id, []);
  }

  for (const r of serviceItemRecords) {
    const prompt = r.getCellValueAsString('Prompts')?.trim();
    if (!prompt) continue;
    const servicesLink = r.getCellValue('Services') as any;
    const dosId = Array.isArray(servicesLink) && servicesLink.length > 0 ? servicesLink[0].id : '';
    if (!dosId) continue;
    const cleanPrompt = prompt.replace(/^"|"$/g, '').trim();
    if (cleanPrompt) addEntry(cleanPrompt, dosId, [r.id]);
  }

  for (const node of dosNodes) {
    if (!node.commonQuestions) continue;
    const lines = node.commonQuestions.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    for (const line of lines) {
      addEntry(line, node.id, []);
    }
  }

  for (const node of dosNodes) {
    if (node.recordType === 'Volume') continue;
    const items = serviceItemMap.get(node.id) || [];
    for (const item of items) {
      if (!item.itemText || item.itemText.length < 10) continue;
      const itemPrompt = `${item.itemType === 'Outcome' ? 'Outcome' : 'Responsibility'}: ${item.itemText}`;
      addEntry(itemPrompt, node.id, [item.id]);
    }
  }

  return entries;
}

function buildWordFrequency(dosNodes: DOSNode[]): Map<string, number> {
  const docCount = new Map<string, number>();
  for (const node of dosNodes) {
    if (node.recordType === 'Volume') continue;
    const text = (node.serviceTitle + ' ' + node.definition + ' ' + node.outcomesText + ' ' + node.responsibilitiesText).toLowerCase();
    const words = new Set(text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1));
    for (const w of words) {
      docCount.set(w, (docCount.get(w) || 0) + 1);
    }
  }
  return docCount;
}

function getWordIDF(word: string, docFreq: Map<string, number>, totalDocs: number): number {
  const df = docFreq.get(word) || 0;
  if (df === 0) return 1.0;
  return Math.log(totalDocs / (1 + df)) / Math.log(totalDocs);
}

function deepMatchSearch(
  query: string,
  promptIndex: PromptEntry[],
  dosNodes: DOSNode[],
  serviceItemMap: Map<string, ServiceItemNode[]>,
  serviceItemRecords: AirtableRecord[],
): DeepMatchResult[] {
  const queryNorm = normalizeText(query);
  const queryBigrams = getBigrams(query);
  const queryWords = getContentWords(query);

  if (queryWords.length === 0) return [];

  const sectionNodes = dosNodes.filter(n => n.recordType !== 'Volume');
  const docFreq = buildWordFrequency(dosNodes);
  const totalDocs = sectionNodes.length || 1;

  const wordWeights = new Map<string, number>();
  for (const w of queryWords) {
    wordWeights.set(w, getWordIDF(w, docFreq, totalDocs));
  }
  const totalWeight = Array.from(wordWeights.values()).reduce((s, v) => s + v, 0) || 1;

  const nodeMap = new Map<string, DOSNode>();
  for (const n of dosNodes) nodeMap.set(n.id, n);

  const scored = new Map<string, { score: number; prompt: string | null; itemIds: string[] }>();

  for (const entry of promptIndex) {
    const sim = jaccardSimilarity(queryBigrams, entry.promptBigrams);

    let weightedOverlap = 0;
    for (const qw of queryWords) {
      const idf = wordWeights.get(qw) || 0.5;
      for (const pw of entry.promptWords) {
        if (qw === pw) {
          weightedOverlap += idf;
          break;
        }
        if (qw.length > 3 && pw.length > 3 && (pw.startsWith(qw.substring(0, 3)) || qw.startsWith(pw.substring(0, 3)))) {
          weightedOverlap += idf * 0.7;
          break;
        }
        if (qw.length > 5 && pw.length > 5) {
          const qSub = qw.substring(0, Math.min(qw.length, 6));
          const pSub = pw.substring(0, Math.min(pw.length, 6));
          if (qSub === pSub) {
            weightedOverlap += idf * 0.5;
            break;
          }
        }
      }
    }
    const wordScore = totalWeight > 0 ? weightedOverlap / totalWeight : 0;

    let exactBonus = 0;
    if (entry.promptNorm.includes(queryNorm) || queryNorm.includes(entry.promptNorm)) {
      exactBonus = 0.4;
    } else {
      for (const qw of queryWords) {
        if (qw.length > 3 && entry.promptNorm.includes(qw)) {
          exactBonus += 0.05;
        }
      }
      exactBonus = Math.min(exactBonus, 0.2);
    }

    const combinedScore = (sim * 0.3) + (wordScore * 0.6) + exactBonus;

    if (combinedScore > 0.1) {
      const existing = scored.get(entry.dosNodeId);
      if (!existing || combinedScore > existing.score) {
        scored.set(entry.dosNodeId, {
          score: combinedScore,
          prompt: entry.prompt,
          itemIds: entry.serviceItemIds,
        });
      } else if (existing && entry.serviceItemIds.length > 0) {
        existing.itemIds = [...new Set([...existing.itemIds, ...entry.serviceItemIds])];
      }
    }
  }

  for (const node of sectionNodes) {
    if (scored.has(node.id) && scored.get(node.id)!.score > 0.3) continue;

    const titleLower = node.serviceTitle.toLowerCase();
    const defLower = (node.definition || '').toLowerCase();
    const outcomesLower = (node.outcomesText || '').toLowerCase();
    const respLower = (node.responsibilitiesText || '').toLowerCase();
    const fullText = titleLower + ' ' + defLower + ' ' + outcomesLower + ' ' + respLower;

    let weightedHits = 0;
    let hitCount = 0;
    let titleHitWeight = 0;
    let itemHitWeight = 0;
    for (const qw of queryWords) {
      const idf = wordWeights.get(qw) || 0.5;
      if (fullText.includes(qw)) {
        weightedHits += idf;
        hitCount++;
        if (titleLower.includes(qw)) {
          titleHitWeight += idf;
        }
        if (outcomesLower.includes(qw) || respLower.includes(qw)) {
          itemHitWeight += idf * 0.3;
        }
      }
    }

    if (hitCount === 0) continue;
    const hitRatio = hitCount / queryWords.length;
    if (hitRatio < 0.3) continue;

    let fallbackScore = (weightedHits / totalWeight) * 0.5;
    if (titleHitWeight > 0) {
      fallbackScore += (titleHitWeight / totalWeight) * 0.3;
    }
    fallbackScore += (itemHitWeight / totalWeight) * 0.15;

    if (fallbackScore > 0.08) {
      const existing = scored.get(node.id);
      if (!existing || fallbackScore > existing.score) {
        scored.set(node.id, { score: fallbackScore, prompt: null, itemIds: [] });
      }
    }
  }

  const results: DeepMatchResult[] = [];
  for (const [nodeId, data] of scored) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const matchedItems: { type: string; text: string }[] = [];

    if (data.itemIds.length > 0) {
      for (const itemId of data.itemIds) {
        const items = serviceItemMap.get(nodeId) || [];
        const item = items.find(i => i.id === itemId);
        if (item) {
          matchedItems.push({ type: item.itemType, text: item.itemText });
        }
      }
    }

    if (matchedItems.length === 0) {
      const items = serviceItemMap.get(nodeId) || [];
      const relevant = items
        .map(item => {
          const textLower = item.itemText.toLowerCase();
          let w = 0;
          for (const qw of queryWords) {
            if (textLower.includes(qw)) w += (wordWeights.get(qw) || 0.5);
          }
          return { item, weight: w };
        })
        .filter(r => r.weight > 0)
        .sort((a, b) => b.weight - a.weight);
      for (const r of relevant.slice(0, 4)) {
        matchedItems.push({ type: r.item.itemType, text: r.item.itemText });
      }
    }

    let confidence: 'strong' | 'likely' | 'possible';
    if (data.score >= 0.4) confidence = 'strong';
    else if (data.score >= 0.2) confidence = 'likely';
    else confidence = 'possible';

    results.push({
      node,
      confidence,
      score: data.score,
      matchedPrompt: data.prompt,
      matchedItems,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20);
}

const CONFIDENCE_STYLES = {
  strong: { label: 'Strong Match', bg: '#E6FCE8', text: '#006400', dot: '#17E88F' },
  likely: { label: 'Likely Match', bg: '#E3F2FD', text: '#0D47A1', dot: '#538184' },
  possible: { label: 'Possible Match', bg: '#FFF3E0', text: '#E65100', dot: '#DBD99A' },
};

function AskDOSPanel({
  dosNodes,
  dosRecords,
  serviceItemRecords,
  serviceItemMap,
  onSelectNode,
}: {
  dosNodes: DOSNode[];
  dosRecords: AirtableRecord[];
  serviceItemRecords: AirtableRecord[];
  serviceItemMap: Map<string, ServiceItemNode[]>;
  onSelectNode: (node: DOSNode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { base } = useBase();
  const searchLogTable = base?.getTableByName('DOS Search Log') || null;
  const { records: searchLogRecords, refetch: refetchSearchLog } = useRecords(searchLogTable as any, { enabled: !!searchLogTable } as any);
  const { mutate: createLogRecord } = useCreateRecord(searchLogTable);

  const feedbackHistory = useMemo(() => {
    const history = new Map<string, { question: string; questionBigrams: Set<string>; feedback: string }[]>();
    if (!searchLogRecords?.length) return history;
    for (const r of searchLogRecords) {
      const question = r.getCellValueAsString('Question')?.trim();
      const feedback = r.getCellValueAsString('Feedback')?.trim();
      const serviceLink = r.getCellValue('Matched Service') as any;
      const nodeId = Array.isArray(serviceLink) && serviceLink.length > 0 ? serviceLink[0].id : '';
      if (!question || !feedback || !nodeId) continue;
      if (!history.has(nodeId)) history.set(nodeId, []);
      history.get(nodeId)!.push({ question, questionBigrams: getBigrams(question), feedback });
    }
    return history;
  }, [searchLogRecords]);

  const verifiedNodes = useMemo(() => {
    const verified = new Set<string>();
    for (const [nodeId, entries] of feedbackHistory) {
      if (entries.some(e => e.feedback === 'Helpful')) verified.add(nodeId);
    }
    return verified;
  }, [feedbackHistory]);

  const promptIndex = useMemo(
    () => buildPromptIndex(dosRecords, serviceItemRecords, dosNodes, serviceItemMap),
    [dosRecords, serviceItemRecords, dosNodes, serviceItemMap]
  );

  const exampleQuestions = useMemo(() => {
    const seen = new Set<string>();
    const examples: string[] = [];
    const questionEntries = promptIndex.filter(e => {
      const p = e.prompt.trim();
      return p.endsWith('?') && p.length > 15 && p.length < 80 && !p.startsWith('Outcome:') && !p.startsWith('Responsibility:');
    });
    const shuffled = [...questionEntries].sort(() => Math.random() - 0.5);
    for (const entry of shuffled) {
      const clean = entry.prompt.replace(/^"|"$/g, '').trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        examples.push(clean);
      }
      if (examples.length >= 5) break;
    }
    return examples;
  }, [promptIndex]);

  const results = useMemo(() => {
    if (!hasSearched || query.trim().length < 3) return [];
    return deepMatchSearch(query, promptIndex, dosNodes, serviceItemMap, serviceItemRecords);
  }, [query, promptIndex, dosNodes, serviceItemMap, serviceItemRecords, hasSearched]);

  const boostedResults = useMemo(() => {
    if (results.length === 0 || feedbackHistory.size === 0) return results;
    const qBigrams = getBigrams(query);
    const adjusted = results.map(result => {
      const entries = feedbackHistory.get(result.node.id) || [];
      let boost = 0;
      for (const entry of entries) {
        const sim = jaccardSimilarity(qBigrams, entry.questionBigrams);
        if (sim < 0.4) continue;
        if (entry.feedback === 'Helpful') boost += 0.15 * sim;
        else if (entry.feedback === 'Not Relevant') boost -= 0.2 * sim;
        else if (entry.feedback === 'Partially Relevant') boost += 0.03 * sim;
      }
      if (boost === 0) return result;
      const newScore = Math.max(0.01, Math.min(1, result.score + boost));
      let confidence: 'strong' | 'likely' | 'possible';
      if (newScore >= 0.5) confidence = 'strong';
      else if (newScore >= 0.3) confidence = 'likely';
      else confidence = 'possible';
      return { ...result, score: newScore, confidence };
    });
    adjusted.sort((a, b) => b.score - a.score);
    return adjusted;
  }, [results, feedbackHistory, query]);

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 3) {
      setHasSearched(true);
      setExpandedResult(null);
      setFeedbackGiven({});
    }
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleResultClick = useCallback((node: DOSNode) => {
    onSelectNode(node);
    setIsOpen(false);
  }, [onSelectNode]);

  const handleExampleClick = useCallback((q: string) => {
    setQuery(q);
    setHasSearched(false);
    setFeedbackGiven({});
    setTimeout(() => {
      setHasSearched(true);
      setExpandedResult(null);
    }, 50);
  }, []);

  const handleFeedback = useCallback(async (result: DeepMatchResult, feedback: string) => {
    if (!searchLogTable || feedbackGiven[result.node.id]) return;
    setFeedbackGiven(prev => ({ ...prev, [result.node.id]: feedback }));
    const fields: Record<string, any> = {
      'Question': query,
      'Matched Service': [result.node.id],
      'Confidence': CONFIDENCE_STYLES[result.confidence].label,
      'Feedback': feedback,
      'Search Date': new Date().toISOString(),
      'Service Code': result.node.serviceCode,
      'Service Title': result.node.serviceTitle,
    };
    if (result.matchedPrompt) fields['Matched Prompt'] = result.matchedPrompt;
    await createLogRecord(fields);
    refetchSearchLog();
    setToastMessage(
      feedback === 'Helpful' ? 'Thanks! This helps improve future results.' :
      feedback === 'Not Relevant' ? 'Noted — this result will be deprioritized.' :
      'Thanks for the feedback!'
    );
    setTimeout(() => setToastMessage(null), 3000);
  }, [query, searchLogTable, feedbackGiven, createLogRecord, refetchSearchLog]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    setHasSearched(false);
  }, [query]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 text-white font-medium text-[0.8125rem] transition-all hover:scale-[1.03] active:scale-[0.98]"
        style={{
          backgroundColor: '#003F2D',
          boxShadow: '0 4px 20px rgba(0,63,45,0.35), 0 2px 6px rgba(0,0,0,0.12)',
        }}
        aria-label="Ask DOS"
      >
        <AskIcon />
        <span className="font-sans">Ask DOS</span>
      </button>
    );
  }

  const strongCount = boostedResults.filter(r => r.confidence === 'strong').length;
  const likelyCount = boostedResults.filter(r => r.confidence === 'likely').length;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 right-6 z-40 w-[440px] max-h-[75vh] flex flex-col bg-white"
      style={{
        boxShadow: '0 8px 40px rgba(0,63,45,0.2), 0 2px 8px rgba(0,0,0,0.08)',
        animation: 'askDosSlideUp 200ms ease-out',
      }}
    >
      <style>{`
        @keyframes askDosSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: '#003F2D' }}>
        <div className="flex items-center gap-2">
          <AskIcon />
          <div>
            <span className="text-[0.8125rem] font-semibold text-white font-sans block leading-tight">Ask DOS</span>
            <span className="text-[0.5625rem] text-[#17E88F] font-sans">Deep Match · Item-Level · Learning</span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close Ask DOS"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-semantic-surface flex-shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the DOS..."
              className="w-full pl-3 pr-8 py-2 text-[0.75rem] border border-semantic-surface bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 font-sans"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setHasSearched(false); }}
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-semantic-system-7 hover:text-semantic-system-5"
                aria-label="Clear"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={query.trim().length < 3}
            className="px-3 py-2 text-[0.75rem] font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#003F2D' }}
          >
            <SearchIcon size={14} style={{ color: '#fff' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0" tabIndex={0}>
        {!hasSearched ? (
          <div className="px-4 py-5">
            <p className="text-[0.6875rem] text-semantic-system-5 mb-3">
              Ask questions in natural language. Deep Match searches across service definitions, individual outcomes, responsibilities, and curated Q&amp;A prompts.
            </p>
            {exampleQuestions.length > 0 && (
              <div>
                <p className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest mb-2 font-medium">Try asking</p>
                <div className="space-y-1.5">
                  {exampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(q)}
                      className="w-full text-left px-3 py-2 text-[0.6875rem] text-semantic-text bg-[#F5F7F7] hover:bg-[#EEF1F1] transition-colors group flex items-center gap-2"
                    >
                      <span className="text-core_palette-primary-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <ChevronRightIcon size={10} />
                      </span>
                      <span className="flex-1">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : boostedResults.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[0.8125rem] font-medium text-semantic-text mb-1">No matches found</p>
            <p className="text-[0.6875rem] text-semantic-system-5 max-w-[300px] mx-auto mb-4">
              Try rephrasing your question or using different keywords. Deep Match searches service titles, definitions, individual outcomes, and responsibilities.
            </p>
            {exampleQuestions.length > 0 && (
              <div>
                <p className="text-[0.5625rem] text-semantic-system-7 uppercase tracking-widest mb-2">Try one of these</p>
                {exampleQuestions.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(q)}
                    className="block w-full text-left px-3 py-1.5 text-[0.6875rem] text-core_palette-primary-1 hover:bg-[#F5F7F7] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="px-4 py-2 bg-[#F5F7F7] border-b border-semantic-surface flex items-center gap-3">
              <span className="text-[0.625rem] font-medium text-semantic-system-5">
                {boostedResults.length} {boostedResults.length === 1 ? 'service' : 'services'} matched
              </span>
              {strongCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[0.5625rem]" style={{ color: '#006400' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#17E88F' }} />
                  {strongCount} strong
                </span>
              )}
              {likelyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[0.5625rem]" style={{ color: '#0D47A1' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#538184' }} />
                  {likelyCount} likely
                </span>
              )}
            </div>
            <div>
              {boostedResults.map(result => {
                const conf = CONFIDENCE_STYLES[result.confidence];
                const typeStyle = TYPE_STYLES[result.node.recordType] || TYPE_STYLES['Section'];
                const isExpanded = expandedResult === result.node.id;

                return (
                  <div key={result.node.id} className="border-b border-semantic-surface">
                    <div className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: conf.dot }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span
                              className="inline-flex items-center px-1 h-[16px] text-[0.5rem] font-mono font-semibold flex-shrink-0"
                              style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
                            >
                              {result.node.serviceCode}
                            </span>
                            <span
                              className="inline-flex items-center px-1.5 h-[14px] text-[0.5rem] font-medium flex-shrink-0"
                              style={{ backgroundColor: conf.bg, color: conf.text }}
                            >
                              {conf.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <button
                              onClick={() => handleResultClick(result.node)}
                              className="text-[0.75rem] font-medium text-semantic-text hover:text-core_palette-primary-1 transition-colors text-left leading-snug"
                            >
                              {result.node.serviceTitle}
                            </button>
                            {verifiedNodes.has(result.node.id) && (
                              <span className="flex-shrink-0" title="Previously verified as helpful">
                                <CheckCircleOutlineIcon size={13} style={{ color: '#17E88F' }} />
                              </span>
                            )}
                          </div>
                          {result.node.volumeTitle && (
                            <p className="text-[0.5625rem] text-semantic-system-7 mt-0.5">
                              Vol. {result.node.volumeCode}: {result.node.volumeTitle}
                              {result.node.chapterTitle && result.node.recordType === 'Section' && (
                                <> &middot; Ch. {result.node.chapterCode}: {result.node.chapterTitle}</>
                              )}
                            </p>
                          )}

                          {result.matchedPrompt && (
                            <p className="text-[0.5625rem] text-brand-secondary-2 mt-1.5 italic">
                              Matched: &ldquo;{result.matchedPrompt}&rdquo;
                            </p>
                          )}

                          {result.node.definition && (
                            <p className="text-[0.6875rem] text-semantic-system-5 leading-relaxed mt-1.5 line-clamp-2">
                              {result.node.definition.substring(0, 200)}{result.node.definition.length > 200 ? '...' : ''}
                            </p>
                          )}

                          {result.matchedItems.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => setExpandedResult(isExpanded ? null : result.node.id)}
                                className="flex items-center gap-1 text-[0.5625rem] font-medium text-core_palette-primary-1 hover:text-core_palette-primary-3 transition-colors"
                              >
                                <span className="transition-transform" style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                  <ChevronRightIcon size={10} />
                                </span>
                                {result.matchedItems.length} relevant {result.matchedItems.length === 1 ? 'item' : 'items'}
                                <span className="text-semantic-system-7 font-normal ml-0.5">
                                  ({result.matchedItems.filter(i => i.type === 'Outcome').length} outcomes, {result.matchedItems.filter(i => i.type === 'Responsibility').length} responsibilities)
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 space-y-1.5 pl-2 border-l-2" style={{ borderColor: conf.dot }}>
                                  {result.matchedItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-start">
                                      <span
                                        className="inline-flex items-center px-1 h-[14px] text-[0.4375rem] font-medium flex-shrink-0 mt-0.5"
                                        style={{
                                          backgroundColor: item.type === 'Outcome' ? '#E6FCE8' : '#E3F2FD',
                                          color: item.type === 'Outcome' ? '#006400' : '#0D47A1',
                                        }}
                                      >
                                        {item.type === 'Outcome' ? 'OUT' : 'RSP'}
                                      </span>
                                      <p className="text-[0.6875rem] text-semantic-text leading-relaxed flex-1">
                                        {item.text.substring(0, 250)}{item.text.length > 250 ? '...' : ''}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between">
                            <button
                              onClick={() => handleResultClick(result.node)}
                              className="flex items-center gap-1 text-[0.5625rem] font-medium text-core_palette-primary-1 hover:text-core_palette-primary-3 transition-colors"
                            >
                              View in DOS
                              <ChevronRightIcon size={10} />
                            </button>

                            {feedbackGiven[result.node.id] ? (
                              <span className="text-[0.5625rem] text-semantic-system-6 flex items-center gap-1">
                                {feedbackGiven[result.node.id] === 'Helpful' && <ThumbUpIcon size={11} color="#006400" />}
                                {feedbackGiven[result.node.id] === 'Not Relevant' && <ThumbDownIcon size={11} color="#C62828" />}
                                {feedbackGiven[result.node.id] === 'Partially Relevant' && <span className="text-[0.5625rem]">~</span>}
                                <span style={{ color: feedbackGiven[result.node.id] === 'Helpful' ? '#006400' : feedbackGiven[result.node.id] === 'Not Relevant' ? '#C62828' : '#666' }}>
                                  {feedbackGiven[result.node.id]}
                                </span>
                              </span>
                            ) : searchLogTable && (
                              <div className="flex items-center gap-0.5">
                                <span className="text-[0.5rem] text-semantic-system-7 mr-1">Rate</span>
                                <button
                                  onClick={() => handleFeedback(result, 'Helpful')}
                                  className="p-1 rounded hover:bg-[#E6FCE8] transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                                  title="Helpful"
                                  aria-label="Mark as helpful"
                                >
                                  <ThumbUpIcon size={12} color="#538184" />
                                </button>
                                <button
                                  onClick={() => handleFeedback(result, 'Partially Relevant')}
                                  className="p-1 rounded hover:bg-[#FFF3E0] transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center text-[0.625rem] text-semantic-system-6"
                                  title="Partially relevant"
                                  aria-label="Mark as partially relevant"
                                >
                                  ~
                                </button>
                                <button
                                  onClick={() => handleFeedback(result, 'Not Relevant')}
                                  className="p-1 rounded hover:bg-[#FFEBEE] transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center"
                                  title="Not relevant"
                                  aria-label="Mark as not relevant"
                                >
                                  <ThumbDownIcon size={12} color="#538184" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {toastMessage && (
        <div
          className="absolute bottom-3 left-3 right-3 px-3 py-2 text-[0.6875rem] font-medium text-white flex items-center gap-2"
          style={{
            backgroundColor: '#003F2D',
            animation: 'askDosSlideUp 150ms ease-out',
          }}
        >
          <CheckCircleOutlineIcon size={14} style={{ color: '#17E88F' }} />
          {toastMessage}
        </div>
      )}
    </div>
  );
}

function ThumbUpIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  );
}

function ThumbDownIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
    </svg>
  );
}

function AskIcon({ color = '#17E88F' }: { color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill={color}>
      <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-3.5h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z" />
    </svg>
  );
}
