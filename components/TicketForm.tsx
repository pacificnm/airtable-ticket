import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Table,
  AirtableRecord,
  useCreateRecord,
  useUploadAttachment,
  getLinkedRecordIds,
} from '../lib/airtable-hooks';
import { ServiceLevel, Technician, Category } from '../types';
import { useSnackbar } from './SnackbarProvider';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useSendNotification } from '../hooks/useEventBus';
import { CloseIcon, CloudUploadIcon, SearchIcon, ConfirmationNumberIcon } from './Icons';

const STEPS = [
  { label: 'Title / Description', shortLabel: 'Details' },
  { label: 'Category', shortLabel: 'Category' },
  { label: 'Screenshots', shortLabel: 'Attach' },
];

interface TicketFormProps {
  ticketsTable: Table;
  tasksTable: Table;
  defaultTaskRecords: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  technicians: Technician[];
  categories: Category[];
  catRecords: AirtableRecord[];
  subcatRecords: AirtableRecord[];
  tableauRecords: AirtableRecord[];
  deviceRecords: AirtableRecord[];
  peopleRecords: AirtableRecord[];
  onClose: () => void;
  onCreated: () => void;
}

export function TicketForm({
  ticketsTable,
  tasksTable,
  defaultTaskRecords,
  serviceLevels,
  technicians,
  categories,
  catRecords,
  subcatRecords,
  tableauRecords,
  deviceRecords,
  peopleRecords,
  onClose,
  onCreated,
}: TicketFormProps) {
  const { currentUser } = useCurrentUser();
  const [activeStep, setActiveStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [requesterName, setRequesterName] = useState(currentUser?.name || '');
  const [requesterEmail, setRequesterEmail] = useState(currentUser?.email || '');
  const [dashboardId, setDashboardId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const deviceComboRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { mutate: createTicket } = useCreateRecord(ticketsTable);
  const { mutate: createTask } = useCreateRecord(tasksTable);
  const { mutate: uploadAttachment } = useUploadAttachment(ticketsTable);
  const { showSnackbar } = useSnackbar();
  const sendNotification = useSendNotification();

  const { parentCategories, childrenByParent } = useMemo(() => {
    const parents = [...catRecords].sort((a, b) =>
      a.getCellValueAsString('Name').localeCompare(b.getCellValueAsString('Name'))
    );

    const childMap: Record<string, AirtableRecord[]> = {};
    subcatRecords.forEach(rec => {
      const catIds = getLinkedRecordIds(rec.getCellValue('Category') as any);
      catIds.forEach(catId => {
        if (!childMap[catId]) childMap[catId] = [];
        childMap[catId].push(rec);
      });
    });
    Object.values(childMap).forEach(arr =>
      arr.sort((a, b) => a.getCellValueAsString('Name').localeCompare(b.getCellValueAsString('Name')))
    );

    return { parentCategories: parents, childrenByParent: childMap };
  }, [catRecords, subcatRecords]);

  const subcategories = parentCategoryId ? (childrenByParent[parentCategoryId] || []) : [];

  const applyDefaultsFromSubcategory = (subcatId: string) => {
    if (!subcatId) return;
    const subcatRec = subcatRecords.find(r => r.id === subcatId);
    if (!subcatRec) return;

    const defaultTechIds = getLinkedRecordIds(subcatRec.getCellValue('Default Technicians') as any);
    if (defaultTechIds.length > 0) {
      setAssignee(defaultTechIds[0]);
    }

    const defaultSlIds = getLinkedRecordIds(subcatRec.getCellValue('Service Levels') as any);
    if (defaultSlIds.length > 0) {
      const sl = serviceLevels.find(s => s.id === defaultSlIds[0]);
      if (sl) setPriority(sl.name);
    }
  };

  const handleParentCategoryChange = (newParentId: string) => {
    setParentCategoryId(newParentId);
    setCategoryId('');
    setDashboardId('');
    setSelectedDeviceId('');
    setDeviceSearch('');
  };

  const handleSubcategoryChange = (newSubId: string) => {
    setCategoryId(newSubId);
    setDashboardId('');
    setSelectedDeviceId('');
    setDeviceSearch('');
    if (newSubId) {
      applyDefaultsFromSubcategory(newSubId);
    }
  };

  const effectiveCategoryId = categoryId || parentCategoryId;

  const selectedSubcategoryName = useMemo(() => {
    if (categoryId) {
      const rec = subcatRecords.find(r => r.id === categoryId);
      return rec?.getCellValueAsString('Name') || '';
    }
    return '';
  }, [categoryId, subcatRecords]);

  const isDashboardEnhancement = selectedSubcategoryName === 'Dashboard Enhancement';
  const isNetworkDeviceIssue = selectedSubcategoryName === 'Network Device Issue';

  const filteredDevices = useMemo(() => {
    if (!deviceSearch.trim()) return [];
    const q = deviceSearch.toLowerCase();
    return deviceRecords
      .filter(d => {
        const ip = d.getCellValueAsString('IP Address').toLowerCase();
        const macLinked = d.getCellValue('MAC') as any;
        const macName = Array.isArray(macLinked)
          ? macLinked.map((m: any) => (m?.name || '')).join(' ').toLowerCase()
          : '';
        const name = d.getCellValueAsString('Name').toLowerCase();
        return ip.includes(q) || macName.includes(q) || name.includes(q);
      })
      .slice(0, 20);
  }, [deviceSearch, deviceRecords]);

  const selectedDevice = selectedDeviceId
    ? deviceRecords.find(d => d.id === selectedDeviceId)
    : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceComboRef.current && !deviceComboRef.current.contains(e.target as Node)) {
        setDeviceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileDrop = (e: any) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer?.files || []) as File[];
    setFiles(prev => [...prev, ...dropped.filter((f: File) => f.type.startsWith('image/'))]);
  };

  const handleFileSelect = (e: any) => {
    const selected = Array.from(e.target.files || []) as File[];
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const fields: any = {
        Title: title,
        Description: description,
        Status: 'Open',
        'Created Date': new Date().toISOString(),
        'Last Modified': new Date().toISOString(),
        'Requester Name': requesterName,
        'Requester Email': requesterEmail,
      };

      if (assignee) fields['Assigned Technician'] = [assignee];
      if (effectiveCategoryId) fields['Subcategory'] = [effectiveCategoryId];
      if (dashboardId) fields['Dashboards'] = [dashboardId];
      if (selectedDeviceId) fields['Devices'] = [selectedDeviceId];

      const record = await createTicket(fields);

      if (record && effectiveCategoryId) {
        const matchingDefaults = defaultTaskRecords.filter(dt => {
          const subcatIds = getLinkedRecordIds((dt as any).fields?.['Subcategory']);
          return subcatIds.includes(effectiveCategoryId);
        });
        for (const dt of matchingDefaults) {
          try {
            await createTask({
              Name: dt.getCellValueAsString('Name'),
              Priority: dt.getCellValueAsString('Priority') || 'Medium',
              Status: 'Todo',
              Ticket: [record.id],
            });
          } catch (err) {
            console.error('Failed to create default task:', err);
          }
        }
      }

      if (record && files.length > 0) {
        for (const file of files) {
          await uploadAttachment({
            recordId: record.id,
            fieldIdOrName: 'Screenshots',
            file,
          });
        }
      }

      if (assignee) {
        sendNotification(
          assignee,
          `New ticket assigned to you: ${title}`,
          `You have been assigned to a new ticket: "${title}".${description ? `\n\nDescription: ${description}` : ''}`,
        );
      }

      showSnackbar(`Ticket "${title}" created`);
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to create ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    if (step === 0) return !!title.trim();
    return true;
  };

  const handleNext = () => {
    if (activeStep < STEPS.length - 1 && canProceedFromStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const isLastStep = activeStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="fixed inset-0 bg-black/30 overlay-enter" onClick={onClose} />
      <div className="relative z-50 w-full sm:w-[520px] h-full bg-white flex flex-col sidesheet-enter">
        <div className="px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-core_palette-primary-3 text-white">
          <div className="flex items-center gap-2">
            <ConfirmationNumberIcon size={16} className="text-core_palette-primary-2" />
            <span className="text-[0.8125rem] font-semibold font-sans">New Ticket</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <StepperHeader activeStep={activeStep} onStepClick={(s: number) => { if (s < activeStep || canProceedFromStep(activeStep)) setActiveStep(s); }} />

        <div className="flex-1 px-5 py-4 flex flex-col overflow-auto">
          <div className="flex-1">
            {activeStep === 0 && (
              <StepTitleDescription
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                requesterName={requesterName}
                requesterEmail={requesterEmail}
                peopleRecords={peopleRecords}
                onPersonSelect={(person: AirtableRecord) => {
                  const name = person.getCellValueAsString('Name');
                  const nikeEmail = person.getCellValueAsString('Work Email (Nike)');
                  const cbreEmail = person.getCellValueAsString('Work Email (CBRE)');
                  setRequesterName(name);
                  setRequesterEmail(nikeEmail || cbreEmail || '');
                }}
              />
            )}

            {activeStep === 1 && (
              <StepCategory
                parentCategoryId={parentCategoryId}
                handleParentCategoryChange={handleParentCategoryChange}
                parentCategories={parentCategories}
                subcategories={subcategories}
                categoryId={categoryId}
                handleSubcategoryChange={handleSubcategoryChange}
                isDashboardEnhancement={isDashboardEnhancement}
                dashboardId={dashboardId}
                setDashboardId={setDashboardId}
                tableauRecords={tableauRecords}
                isNetworkDeviceIssue={isNetworkDeviceIssue}
                selectedDevice={selectedDevice}
                selectedDeviceId={selectedDeviceId}
                setSelectedDeviceId={setSelectedDeviceId}
                deviceSearch={deviceSearch}
                setDeviceSearch={setDeviceSearch}
                deviceDropdownOpen={deviceDropdownOpen}
                setDeviceDropdownOpen={setDeviceDropdownOpen}
                deviceComboRef={deviceComboRef}
                filteredDevices={filteredDevices}
                assignee={assignee}
                setAssignee={setAssignee}
                technicians={technicians}
                priority={priority}
                setPriority={setPriority}
                serviceLevels={serviceLevels}
              />
            )}

            {activeStep === 2 && (
              <StepScreenshots
                files={files}
                handleFileDrop={handleFileDrop}
                handleFileSelect={handleFileSelect}
                removeFile={removeFile}
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[rgba(202,209,211,0.15)]">
            <div>
              {activeStep > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.875rem] text-[#666666] hover:text-semantic-text transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                  Back
                </button>
              ) : (
                <button type="button" onClick={onClose} className="px-4 py-2 text-[0.875rem] text-[#666666] hover:text-semantic-text transition-colors">
                  Cancel
                </button>
              )}
            </div>
            <div>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!title.trim() || submitting}
                  className="px-5 py-2 text-[0.875rem] text-white bg-core_palette-primary-1 hover:bg-[#004D37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : 'Create Ticket'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceedFromStep(activeStep)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-[0.875rem] text-white bg-core_palette-primary-1 hover:bg-[#004D37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepperHeader({ activeStep, onStepClick }: { activeStep: number; onStepClick: (step: number) => void }) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-[rgba(202,209,211,0.3)] bg-[#FAFBFB]">
      <div className="flex items-center">
        {STEPS.map((step, idx) => (
          <React.Fragment key={idx}>
            <button
              type="button"
              onClick={() => onStepClick(idx)}
              className="flex items-center gap-2 group"
              aria-label={`Step ${idx + 1}: ${step.label}`}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center text-[0.6875rem] font-semibold transition-colors ${
                  idx < activeStep
                    ? 'bg-core_palette-primary-1 text-white'
                    : idx === activeStep
                    ? 'bg-core_palette-primary-1 text-white'
                    : 'bg-[#E6EAEA] text-[rgba(67,82,84,0.5)]'
                }`}
              >
                {idx < activeStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[0.75rem] font-medium hidden sm:block transition-colors ${
                  idx <= activeStep
                    ? 'text-semantic-text'
                    : 'text-[rgba(67,82,84,0.4)]'
                }`}
              >
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 mx-3">
                <div
                  className={`h-px transition-colors ${
                    idx < activeStep ? 'bg-core_palette-primary-1' : 'bg-[rgba(202,209,211,0.4)]'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function StepTitleDescription({
  title, setTitle, description, setDescription,
  requesterName, requesterEmail, peopleRecords, onPersonSelect,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  requesterName: string;
  requesterEmail: string;
  peopleRecords: AirtableRecord[];
  onPersonSelect: (person: AirtableRecord) => void;
}) {
  const [personSearch, setPersonSearch] = useState('');
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);
  const personComboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personComboRef.current && !personComboRef.current.contains(e.target as Node)) {
        setPersonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPeople = useMemo(() => {
    if (!personSearch.trim()) return [];
    const q = personSearch.trim().toLowerCase();
    return peopleRecords
      .filter(p => {
        const name = p.getCellValueAsString('Name').toLowerCase();
        const nikeEmail = p.getCellValueAsString('Work Email (Nike)').toLowerCase();
        const cbreEmail = p.getCellValueAsString('Work Email (CBRE)').toLowerCase();
        return name.includes(q) || nikeEmail.includes(q) || cbreEmail.includes(q);
      })
      .slice(0, 15);
  }, [personSearch, peopleRecords]);

  const handleSelectPerson = (person: AirtableRecord) => {
    onPersonSelect(person);
    setPersonSearch('');
    setPersonDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e: any) => setTitle(e.target.value)}
          placeholder="Brief description of the issue..."
          autoFocus
          className="w-full px-3 py-2 text-[0.875rem] border border-[rgba(202,209,211,0.3)] bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 transition-colors"
        />
      </div>
      <div>
        <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e: any) => setDescription(e.target.value)}
          placeholder="Full details of the issue or request..."
          rows={5}
          className="w-full px-3 py-2 text-[0.875rem] border border-[rgba(202,209,211,0.3)] bg-[#F5F7F7] resize-none focus:outline-none focus:border-core_palette-primary-1 transition-colors"
        />
      </div>
      <div>
        <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Requester</label>
        <div className="relative" ref={personComboRef}>
          <SearchIcon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(67,82,84,0.4)]" />
          <input
            type="text"
            value={personSearch}
            onChange={(e: any) => {
              setPersonSearch(e.target.value);
              setPersonDropdownOpen(true);
            }}
            onFocus={() => { if (personSearch.trim()) setPersonDropdownOpen(true); }}
            placeholder="Search by name or email..."
            className="w-full pl-8 pr-3 py-2 text-[0.875rem] border border-[rgba(202,209,211,0.3)] bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            aria-label="Search people"
          />
          {personDropdownOpen && personSearch.trim() && (
            <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-[rgba(202,209,211,0.3)] shadow-lg max-h-48 overflow-auto">
              {filteredPeople.length === 0 ? (
                <div className="px-3 py-3 text-[0.8125rem] text-[rgba(67,82,84,0.5)] text-center">No people found</div>
              ) : (
                filteredPeople.map(person => {
                  const name = person.getCellValueAsString('Name');
                  const nikeEmail = person.getCellValueAsString('Work Email (Nike)');
                  const cbreEmail = person.getCellValueAsString('Work Email (CBRE)');
                  const email = nikeEmail || cbreEmail || '';
                  const dept = person.getCellValueAsString('Department');
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleSelectPerson(person)}
                      className="w-full text-left px-3 py-2 hover:bg-[#F5F7F7] transition-colors border-b border-[rgba(202,209,211,0.15)] last:border-b-0"
                    >
                      <span className="text-[0.8125rem] font-medium text-semantic-text block truncate">{name}</span>
                      <span className="text-[0.75rem] text-[rgba(67,82,84,0.5)] block truncate">
                        {email}{dept ? ` · ${dept}` : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Requester Name</label>
          <input
            type="text"
            value={requesterName}
            disabled
            className="w-full px-3 py-2 text-[0.875rem] border border-[rgba(202,209,211,0.3)] bg-[#EAEDED] text-[#666666] cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Requester Email</label>
          <input
            type="email"
            value={requesterEmail}
            disabled
            className="w-full px-3 py-2 text-[0.875rem] border border-[rgba(202,209,211,0.3)] bg-[#EAEDED] text-[#666666] cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

function StepCategory({
  parentCategoryId, handleParentCategoryChange, parentCategories, subcategories,
  categoryId, handleSubcategoryChange,
  isDashboardEnhancement, dashboardId, setDashboardId, tableauRecords,
  isNetworkDeviceIssue, selectedDevice, selectedDeviceId, setSelectedDeviceId,
  deviceSearch, setDeviceSearch, deviceDropdownOpen, setDeviceDropdownOpen,
  deviceComboRef, filteredDevices,
  assignee, setAssignee, technicians,
  priority, setPriority, serviceLevels,
}: {
  parentCategoryId: string; handleParentCategoryChange: (v: string) => void;
  parentCategories: AirtableRecord[]; subcategories: AirtableRecord[];
  categoryId: string; handleSubcategoryChange: (v: string) => void;
  isDashboardEnhancement: boolean; dashboardId: string; setDashboardId: (v: string) => void;
  tableauRecords: AirtableRecord[];
  isNetworkDeviceIssue: boolean; selectedDevice: AirtableRecord | undefined | null;
  selectedDeviceId: string; setSelectedDeviceId: (v: string) => void;
  deviceSearch: string; setDeviceSearch: (v: string) => void;
  deviceDropdownOpen: boolean; setDeviceDropdownOpen: (v: boolean) => void;
  deviceComboRef: React.RefObject<any>; filteredDevices: AirtableRecord[];
  assignee: string; setAssignee: (v: string) => void;
  technicians: Technician[];
  priority: string; setPriority: (v: string) => void;
  serviceLevels: ServiceLevel[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[0.8125rem] text-[rgba(67,82,84,0.6)] mb-4 leading-relaxed">
          Select a category to route the ticket and auto-assign defaults.
        </p>
      </div>

      <div>
        <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Category</label>
        <select
          value={parentCategoryId}
          onChange={(e: any) => handleParentCategoryChange(e.target.value)}
          className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
          aria-label="Category"
        >
          <option value="">Select category</option>
          {parentCategories.map(c => (
            <option key={c.id} value={c.id}>{c.getCellValueAsString('Name')}</option>
          ))}
        </select>
      </div>

      {parentCategoryId && subcategories.length > 0 && (
        <div>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Subcategory</label>
          <select
            value={categoryId}
            onChange={(e: any) => handleSubcategoryChange(e.target.value)}
            className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            aria-label="Subcategory"
          >
            <option value="">Select subcategory</option>
            {subcategories.map(c => (
              <option key={c.id} value={c.id}>{c.getCellValueAsString('Name')}</option>
            ))}
          </select>
        </div>
      )}

      {isDashboardEnhancement && (
        <div>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Tableau Dashboard</label>
          <select
            value={dashboardId}
            onChange={(e: any) => setDashboardId(e.target.value)}
            className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            aria-label="Tableau Dashboard"
          >
            <option value="">Select a dashboard</option>
            {tableauRecords
              .slice()
              .sort((a, b) => a.getCellValueAsString('Dashboard').localeCompare(b.getCellValueAsString('Dashboard')))
              .map(d => (
                <option key={d.id} value={d.id}>{d.getCellValueAsString('Dashboard')}</option>
              ))}
          </select>
        </div>
      )}

      {isNetworkDeviceIssue && (
        <div>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Network Device</label>
          {selectedDevice ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-[rgba(202,209,211,0.3)] bg-[#F5F7F7]">
              <div className="flex-1 min-w-0">
                <span className="text-[0.8125rem] font-medium text-semantic-text block truncate">
                  {selectedDevice.getCellValueAsString('Name') || 'Unnamed Device'}
                </span>
                <span className="text-[0.75rem] text-[rgba(67,82,84,0.5)] block truncate">
                  IP: {selectedDevice.getCellValueAsString('IP Address') || '—'}
                  {(() => {
                    const macLinked = selectedDevice.getCellValue('MAC') as any;
                    const mac = Array.isArray(macLinked) && macLinked[0]?.name;
                    return mac ? ` · MAC: ${mac}` : '';
                  })()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedDeviceId(''); setDeviceSearch(''); }}
                className="p-0.5 text-[#666666] hover:text-[#9B1C31] transition-colors flex-shrink-0"
                aria-label="Remove device"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          ) : (
            <div className="relative" ref={deviceComboRef}>
              <input
                type="text"
                value={deviceSearch}
                onChange={(e: any) => {
                  setDeviceSearch(e.target.value);
                  setDeviceDropdownOpen(true);
                }}
                onFocus={() => { if (deviceSearch.trim()) setDeviceDropdownOpen(true); }}
                placeholder="Search by IP address or MAC address..."
                className="w-full px-3 py-2 text-[0.875rem] border border-[rgba(202,209,211,0.3)] bg-[#F5F7F7] focus:outline-none focus:border-core_palette-primary-1 transition-colors"
                aria-label="Search devices"
              />
              {deviceDropdownOpen && deviceSearch.trim() && (
                <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-[rgba(202,209,211,0.3)] shadow-lg max-h-48 overflow-auto">
                  {filteredDevices.length === 0 ? (
                    <div className="px-3 py-2 text-[0.8125rem] text-[rgba(67,82,84,0.5)]">No devices found</div>
                  ) : (
                    filteredDevices.map(d => {
                      const macLinked = d.getCellValue('MAC') as any;
                      const mac = Array.isArray(macLinked) && macLinked[0]?.name;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId(d.id);
                            setDeviceSearch('');
                            setDeviceDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#F5F7F7] transition-colors border-b border-[rgba(202,209,211,0.15)] last:border-b-0"
                        >
                          <span className="text-[0.8125rem] font-medium text-semantic-text block truncate">
                            {d.getCellValueAsString('Name') || 'Unnamed Device'}
                          </span>
                          <span className="text-[0.75rem] text-[rgba(67,82,84,0.5)] block truncate">
                            IP: {d.getCellValueAsString('IP Address') || '—'}
                            {mac ? ` · MAC: ${mac}` : ''}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Assign To</label>
          <select
            value={assignee}
            disabled
            className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-[#EAEDED] text-[#666666] cursor-not-allowed"
            aria-label="Assign to"
          >
            <option value="">Unassigned</option>
            {technicians.filter(t => t.active).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Priority / SLA</label>
          <select
            value={priority}
            disabled
            className="w-full px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-[#EAEDED] text-[#666666] cursor-not-allowed"
            aria-label="Priority"
          >
            <option value="">Select priority</option>
            {serviceLevels.sort((a, b) => a.priorityOrder - b.priorityOrder).map(sl => (
              <option key={sl.id} value={sl.name}>
                {sl.name} (resolve {sl.resolutionHours}h)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function StepScreenshots({
  files, handleFileDrop, handleFileSelect, removeFile,
}: {
  files: File[];
  handleFileDrop: (e: any) => void;
  handleFileSelect: (e: any) => void;
  removeFile: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[0.8125rem] text-[rgba(67,82,84,0.6)] mb-4 leading-relaxed">
          Attach any relevant screenshots. This step is optional — you can submit the ticket without attachments.
        </p>
      </div>

      <div>
        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-1">Screenshots</span>
        <div
          onDragOver={(e: any) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-[rgba(202,209,211,0.4)] py-10 text-center cursor-pointer hover:border-core_palette-primary-1 hover:bg-[#F5F9F8] transition-colors"
        >
          <label className="cursor-pointer block">
            <CloudUploadIcon size={36} className="text-[rgba(67,82,84,0.35)] mx-auto mb-2" />
            <p className="text-[0.875rem] text-[rgba(67,82,84,0.5)] mb-1">
              Drop images here or <span className="text-core_palette-primary-1 font-medium">browse</span>
            </p>
            <p className="text-[0.6875rem] text-[rgba(67,82,84,0.35)]">PNG, JPG, GIF up to 10MB</p>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        </div>
      </div>

      {files.length > 0 && (
        <div>
          <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)] mb-2">
            Attached ({files.length})
          </span>
          <div className="grid grid-cols-4 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative group aspect-square">
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="w-full h-full object-cover border border-[rgba(202,209,211,0.3)]"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#9B1C31] text-white text-[0.625rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#B10F41]"
                >
                  ×
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[0.55rem] text-white truncate block">{f.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
