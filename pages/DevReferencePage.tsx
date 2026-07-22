import React, { useState, useCallback } from 'react';
import { SearchIcon, CheckCircleIcon } from '../components/Icons';

type CategoryId = 'all' | 'layout' | 'data' | 'forms' | 'feedback' | 'hooks';

interface ComponentDoc {
  id: string;
  name: string;
  file: string;
  category: CategoryId;
  categoryLabel: string;
  description: string;
  whenToUse: string;
  props: { name: string; type: string; description: string }[];
  usage: string;
  source: string;
}

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'layout', label: 'Layout & Navigation' },
  { id: 'data', label: 'Data Display' },
  { id: 'forms', label: 'Forms & Inputs' },
  { id: 'feedback', label: 'Feedback & Status' },
  { id: 'hooks', label: 'Hooks & Utilities' },
];

const COMPONENTS: ComponentDoc[] = [
  {
    id: 'roleguard',
    name: 'RoleGuard',
    file: 'components/RoleGuard.tsx',
    category: 'layout',
    categoryLabel: 'Layout & Navigation',
    description: 'A wrapper component that conditionally renders its children based on the current user\'s permissions. Also exports a useHasPermission hook for programmatic permission checks.',
    whenToUse: 'Wrap any UI section that should only be visible to users with specific role permissions. Use the hook variant when you need to conditionally apply logic rather than hide UI.',
    props: [
      { name: 'permission', type: 'string | string[]', description: 'Permission key(s) required to see the content' },
      { name: 'requireAll', type: 'boolean', description: 'If true, all permissions must match (default: false = any match)' },
      { name: 'fallback', type: 'ReactNode', description: 'Content to show when access is denied (default: null)' },
      { name: 'children', type: 'ReactNode', description: 'Content to show when access is granted' },
    ],
    usage: `<RoleGuard permission="config.view">
  <AdminPanel />
</RoleGuard>

<RoleGuard permission={["tickets.create", "tickets.edit"]} requireAll>
  <BulkEditButton />
</RoleGuard>

// Hook variant
const canEdit = useHasPermission('tickets.edit');`,
    source: `import React from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface RoleGuardProps {
  permission: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ permission, requireAll = false, fallback = null, children }: RoleGuardProps) {
  const { currentUser } = useCurrentUser();
  if (!currentUser) return <>{fallback}</>;
  const requiredPerms = Array.isArray(permission) ? permission : [permission];
  const userPerms = currentUser.permissions;
  const hasAccess = requireAll
    ? requiredPerms.every(p => userPerms.includes(p))
    : requiredPerms.some(p => userPerms.includes(p));
  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}

export function useHasPermission(permission: string | string[], requireAll = false): boolean {
  const { currentUser } = useCurrentUser();
  if (!currentUser) return false;
  const requiredPerms = Array.isArray(permission) ? permission : [permission];
  const userPerms = currentUser.permissions;
  return requireAll
    ? requiredPerms.every(p => userPerms.includes(p))
    : requiredPerms.some(p => userPerms.includes(p));
}`,
  },
  {
    id: 'mainmenu',
    name: 'MainMenu',
    file: 'components/MainMenu.tsx',
    category: 'layout',
    categoryLabel: 'Layout & Navigation',
    description: 'A slide-out navigation drawer anchored to the left side. Uses a dark theme (core_palette-primary-3 background) with section groupings, icon+label menu items, and an animated slide-in transition. Includes the UserSelector at the bottom.',
    whenToUse: 'Use as the primary navigation pattern for apps with many distinct sections. The menu groups items under category headings and highlights the active view.',
    props: [
      { name: 'open', type: 'boolean', description: 'Whether the menu drawer is visible' },
      { name: 'onClose', type: '() => void', description: 'Called when the backdrop or close button is clicked' },
      { name: 'view', type: 'AppView', description: 'Current active view for highlighting the selected item' },
      { name: 'onViewChange', type: '(view: AppView) => void', description: 'Called when a menu item is clicked' },
      { name: 'peopleRecords', type: 'AirtableRecord[]', description: 'People records for the UserSelector' },
    ],
    usage: `const [menuOpen, setMenuOpen] = useState(false);

<MainMenu
  open={menuOpen}
  onClose={() => setMenuOpen(false)}
  view={currentView}
  onViewChange={setCurrentView}
  peopleRecords={data.peopleRecords}
/>`,
    source: `// Key pattern: MenuButton helper for consistent nav items
function MenuButton({ selected, onClick, icon, label }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={\`flex items-center gap-2 w-full py-1.5 px-3 text-[0.8125rem] font-medium transition-colors \${
        selected
          ? 'bg-[rgba(0,63,45,0.5)] text-core_palette-primary-2'
          : 'text-core_palette-primary-5 hover:bg-white/[0.06] hover:text-white'
      }\`}
    >
      <span className="w-5 flex items-center justify-center flex-shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// Key pattern: Section grouping with RoleGuard
<nav className="flex-1 px-2 py-3 flex flex-col gap-4 overflow-auto">
  <div>
    <span className="block px-3 mb-1 text-[0.575rem] font-semibold uppercase tracking-[0.1em] text-white/35">
      Section Title
    </span>
    <MenuButton selected={view === 'kanban'} onClick={() => navigate('kanban')}
      icon={<ConfirmationNumberIcon size={18} />} label="All Tickets" />
  </div>
  <RoleGuard permission="config.view">
    <div>
      <span className="...">Configuration</span>
      {/* Config-only menu items */}
    </div>
  </RoleGuard>
</nav>

// Key pattern: Slide-in animation
<div style={{ animation: 'slideInLeft 0.25s cubic-bezier(0.75, 0.02, 0.5, 1) forwards' }}>
  <style>{\`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }\`}</style>
</div>`,
  },
  {
    id: 'header',
    name: 'Header',
    file: 'components/Header.tsx',
    category: 'layout',
    categoryLabel: 'Layout & Navigation',
    description: 'The top app bar with hamburger menu trigger, title, navigation tabs, view toggle buttons (Board/Table/Timeline), and notification/avatar icons. Defines the AppView type union used across the entire app for state-based routing.',
    whenToUse: 'Use as the top-level navigation bar. The view toggle pattern (Board/Table/Timeline buttons) is reusable for any page that offers multiple display modes.',
    props: [
      { name: 'view', type: 'AppView', description: 'Current active view' },
      { name: 'onViewChange', type: '(view: AppView) => void', description: 'View navigation handler' },
      { name: 'onNewTicket', type: '() => void', description: 'Create new ticket action' },
      { name: 'ticketCount', type: 'number', description: 'Badge count for tickets' },
      { name: 'unreadCount', type: 'number', description: 'Notification badge count' },
    ],
    usage: `// AppView type — add new views here
export type AppView = 'kanban' | 'table' | 'timeline' | 'groups' | ...;

// View toggle pattern
<div className="flex bg-[rgba(0,63,45,0.4)]">
  <button
    onClick={() => onViewChange('kanban')}
    className={\`... \${view === 'kanban' ? 'bg-core_palette-primary-1 text-white' : 'text-core_palette-primary-5 hover:text-white'}\`}
  >
    <ViewColumnIcon size={16} /> Board
  </button>
  {/* More toggle buttons */}
</div>`,
    source: `export type AppView = 'kanban' | 'table' | 'timeline' | 'groups' | 'technicians' | 'people' | 'categories' | 'servicelevels' | 'documents' | 'devices' | 'software' | 'locations' | 'dos' | 'tableau' | 'defaulttasks' | 'roles' | 'permissions' | 'dossearchconfig';

// To add a new view:
// 1. Add the view name to AppView union above
// 2. Add a MenuButton in MainMenu.tsx
// 3. Add the view to overflowHidden in AppRouter.tsx if full-height
// 4. Add the rendering condition in AppRouter.tsx
// 5. Add data loading in viewNeeds() in useServiceDeskData.tsx`,
  },
  {
    id: 'kanbanboard',
    name: 'KanbanBoard',
    file: 'components/KanbanBoard.tsx',
    category: 'data',
    categoryLabel: 'Data Display',
    description: 'A horizontal scrolling Kanban board that groups records into columns by status. Each column shows a count badge and renders cards with priority badges, SLA indicators, requester/assignee info, and timestamps.',
    whenToUse: 'Use for any workflow visualization where records move through defined stages. The column-grouping pattern works with any single-select field.',
    props: [
      { name: 'tickets', type: 'AirtableRecord[]', description: 'Records to display as cards' },
      { name: 'serviceLevels', type: 'ServiceLevel[]', description: 'SLA definitions for time calculations' },
      { name: 'onSelectTicket', type: '(record) => void', description: 'Called when a card is clicked' },
    ],
    usage: `<KanbanBoard
  tickets={filteredTickets}
  serviceLevels={data.serviceLevels}
  onSelectTicket={handleSelectTicket}
/>`,
    source: `// Key pattern: Group records by status into columns
const grouped = STATUS_ORDER.reduce((acc, status) => {
  acc[status] = tickets.filter(t => t.getCellValueAsString('Status') === status);
  return acc;
}, {} as Record<TicketStatus, AirtableRecord[]>);

// Key pattern: Column layout
<div className="flex gap-4 px-6 py-4 overflow-x-auto min-h-0 flex-1" tabIndex={0}>
  {STATUS_ORDER.map(status => (
    <div key={status} className="flex-shrink-0 w-[280px] flex flex-col">
      {/* Column header with dot + label + count */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: colors.dot }} />
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em]">{status}</span>
        <span className="font-mono text-[#999999] ml-auto text-[0.75rem]">{columnTickets.length}</span>
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {columnTickets.map(ticket => <KanbanCard key={ticket.id} ... />)}
        {columnTickets.length === 0 && (
          <div className="border border-dashed ... py-8 flex items-center justify-center">
            <span className="text-[#999999] text-[0.75rem]">No tickets</span>
          </div>
        )}
      </div>
    </div>
  ))}
</div>

// Key pattern: Card with data provenance
function KanbanCard({ ticket, serviceLevels, onSelect }) {
  const titleAttrs = useInspectAttrs(ticket, 'Title');
  return (
    <article className="bg-white border ... hover:border-[rgba(0,63,45,0.4)] cursor-pointer" onClick={onSelect}>
      <p {...titleAttrs} className="text-[0.875rem] font-medium ...">{title}</p>
      {/* badges, SLA, metadata */}
    </article>
  );
}`,
  },
  {
    id: 'tickettable',
    name: 'TicketTable',
    file: 'components/TicketTable.tsx',
    category: 'data',
    categoryLabel: 'Data Display',
    description: 'A sortable data table with clickable column headers, status/priority badges, and SLA indicators per row. Includes empty state handling and date-aware sorting.',
    whenToUse: 'Use for any list of records that needs sortable columns, status badges, and row-click navigation to a detail view.',
    props: [
      { name: 'tickets', type: 'AirtableRecord[]', description: 'Records to display as rows' },
      { name: 'serviceLevels', type: 'ServiceLevel[]', description: 'SLA definitions' },
      { name: 'onSelectTicket', type: '(record) => void', description: 'Called when a row is clicked' },
    ],
    usage: `<TicketTable
  tickets={filteredTickets}
  serviceLevels={data.serviceLevels}
  onSelectTicket={handleSelectTicket}
/>`,
    source: `// Key pattern: Sort state management
type SortKey = 'Title' | 'Status' | 'Service Level' | 'Assigned Technician' | 'Created Date' | 'Type';

const [sortKey, setSortKey] = useState<SortKey>('Created Date');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

const handleSort = (key: SortKey) => {
  if (sortKey === key) {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
  } else {
    setSortKey(key);
    setSortDir('asc');
  }
};

// Key pattern: Date-aware sorting
const sorted = [...tickets].sort((a, b) => {
  const av = a.getCellValueAsString(sortKey);
  const bv = b.getCellValueAsString(sortKey);
  if (sortKey === 'Created Date') {
    const da = new Date(av).getTime() || 0;
    const db = new Date(bv).getTime() || 0;
    return sortDir === 'asc' ? da - db : db - da;
  }
  const cmp = av.localeCompare(bv);
  return sortDir === 'asc' ? cmp : -cmp;
});

// Key pattern: Sortable column headers
const columns = [
  { label: 'Title', field: 'Title' },
  { label: 'Priority', field: 'Service Level' },
  ...
];

<thead>
  <tr className="bg-white">
    {columns.map(col => (
      <th key={col.field} onClick={() => handleSort(col.field)}
        className="... cursor-pointer select-none hover:text-semantic-text">
        <span className="inline-flex items-center gap-1">
          {col.label}
          {sortKey === col.field && (
            sortDir === 'asc' ? <ArrowUpwardIcon size={14} /> : <ArrowDownwardIcon size={14} />
          )}
        </span>
      </th>
    ))}
  </tr>
</thead>`,
  },
  {
    id: 'filters',
    name: 'Filters',
    file: 'components/Filters.tsx',
    category: 'forms',
    categoryLabel: 'Forms & Inputs',
    description: 'A horizontal filter bar with a search input and multiple select dropdowns. Includes a "Clear" button that shows the count of active filters. Select dropdowns are permission-aware via RoleGuard.',
    whenToUse: 'Use above any list or table view that needs search + multi-field filtering. The FilterState interface and update pattern are reusable.',
    props: [
      { name: 'filters', type: 'FilterState', description: 'Current filter values (status, type, priority, assignee, search)' },
      { name: 'onChange', type: '(filters: FilterState) => void', description: 'Called when any filter changes' },
      { name: 'technicians', type: 'Technician[]', description: 'Options for the assignee dropdown' },
      { name: 'serviceLevels', type: 'ServiceLevel[]', description: 'Options for the priority dropdown' },
    ],
    usage: `const [filters, setFilters] = useState<FilterState>({
  status: '', type: '', priority: '', assignee: '', search: ''
});

<Filters
  filters={filters}
  onChange={setFilters}
  technicians={data.technicians}
  serviceLevels={data.serviceLevels}
/>`,
    source: `export interface FilterState {
  status: string;
  type: string;
  priority: string;
  assignee: string;
  search: string;
}

export function Filters({ filters, onChange, technicians, serviceLevels }: FiltersProps) {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearableCount = [filters.status, filters.type, filters.priority, filters.assignee]
    .filter(Boolean).length;

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b ...">
      {/* Search with icon */}
      <div className="relative flex-1">
        <SearchIcon size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" />
        <input type="text" value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          aria-label="Search tickets"
          className="w-full pl-9 pr-3 py-1.5 text-[0.8125rem] border ..." />
      </div>

      {/* Select dropdowns with aria-label */}
      <select value={filters.status} onChange={(e) => update('status', e.target.value)}
        aria-label="Filter by status" className="min-w-[130px] px-2 py-1.5 ...">
        <option value="">All Statuses</option>
        {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Permission-gated filter */}
      <RoleGuard permission="ticket.view.others">
        <select value={filters.assignee} ...>
          {technicians.filter(t => t.active).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </RoleGuard>

      {/* Clear button with count */}
      {clearableCount > 0 && (
        <button onClick={() => onChange({ status: '', type: '', priority: '', assignee: '', search: filters.search })}>
          Clear ({clearableCount})
        </button>
      )}
    </div>
  );
}`,
  },
  {
    id: 'servicelevel-drawer',
    name: 'ServiceLevelDrawer',
    file: 'components/ServiceLevelDrawer.tsx',
    category: 'forms',
    categoryLabel: 'Forms & Inputs',
    description: 'A slide-out sidesheet for creating or editing records. Features a dark header with save/cancel, form fields with validation, and statistics section in edit mode. Demonstrates the standard create/edit drawer pattern.',
    whenToUse: 'Use this pattern for any create/edit form that should appear as a right-side sidesheet. The mode prop (create/edit) and validation pattern are reusable.',
    props: [
      { name: 'mode', type: "'create' | 'edit'", description: 'Whether creating a new record or editing existing' },
      { name: 'slTable', type: 'Table', description: 'Airtable table reference for CRUD operations' },
      { name: 'editNode', type: 'SLNode', description: 'Existing record data when editing' },
      { name: 'onClose', type: '() => void', description: 'Called to dismiss the drawer' },
      { name: 'onSaved', type: '() => void', description: 'Called after successful save (trigger refetch)' },
    ],
    usage: `const [showDrawer, setShowDrawer] = useState(false);
const [editNode, setEditNode] = useState<SLNode | null>(null);

{showDrawer && (
  <ServiceLevelDrawer
    mode={editNode ? 'edit' : 'create'}
    slTable={tables.slTable}
    editNode={editNode}
    onClose={() => { setShowDrawer(false); setEditNode(null); }}
    onSaved={() => { setShowDrawer(false); refetch(); }}
  />
)}`,
    source: `// Key pattern: Sidesheet overlay structure
<div className="fixed inset-0 z-50 flex justify-end">
  <div className="absolute inset-0 bg-black/30" onClick={onClose} />
  <div className="relative w-full max-w-[520px] bg-white flex flex-col">
    {/* Dark header with actions */}
    <div className="px-4 py-2.5 flex items-center justify-between bg-core_palette-primary-3 text-white">
      <div className="flex items-center gap-2">
        <EditIcon size={16} style={{ color: '#17E88F' }} />
        <span className="text-[0.8125rem] font-semibold">{mode === 'create' ? 'New' : 'Edit'} Record</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="px-2.5 py-1 bg-core_palette-primary-2 text-core_palette-primary-3">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
    {/* Form body */}
    <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
      <div>
        <label className="block text-[0.75rem] text-semantic-system-5 mb-1">Name *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full px-3 py-1.5 text-[0.75rem] border ..." />
      </div>
    </div>
  </div>
</div>

// Key pattern: Create vs Update
const { mutate: createRecord } = useCreateRecord(table);
const { mutate: updateRecord } = useUpdateRecord(table);

if (mode === 'create') {
  await createRecord(fields);
} else {
  await updateRecord({ recordId: editNode.id, fields });
}`,
  },
  {
    id: 'snackbar',
    name: 'SnackbarProvider',
    file: 'components/SnackbarProvider.tsx',
    category: 'feedback',
    categoryLabel: 'Feedback & Status',
    description: 'A React context provider that manages toast notifications. Toasts auto-dismiss after 4 seconds with an exit animation. Supports 4 severity levels with distinct colors and icons.',
    whenToUse: 'Wrap your app root with SnackbarProvider, then call showSnackbar() from any component via the useSnackbar hook. Use for operation feedback (save success, delete confirmation, error messages).',
    props: [
      { name: 'children', type: 'ReactNode', description: 'App content to wrap' },
    ],
    usage: `// In your app root
<SnackbarProvider>
  <App />
</SnackbarProvider>

// In any component
const { showSnackbar } = useSnackbar();

await saveRecord();
showSnackbar('Record saved successfully', 'success');

// On error
showSnackbar('Failed to save changes', 'error');

// Severity options: 'success' | 'error' | 'warning' | 'info'`,
    source: `type Severity = 'success' | 'error' | 'warning' | 'info';

const SEVERITY_CLASSES: Record<Severity, string> = {
  success: 'bg-[#E6FCE8] border-l-[#006400] text-[#006400]',
  error: 'bg-[#FDECEF] border-l-[#9B1C31] text-[#9B1C31]',
  warning: 'bg-[#FFF8E6] border-l-[#8B6914] text-[#8B6914]',
  info: 'bg-[#E8F0FE] border-l-[#003F2D] text-[#003F2D]',
};

export function SnackbarProvider({ children }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showSnackbar = useCallback((message: string, severity: Severity = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 200);
    }, 4000);
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={\`pointer-events-auto flex items-center gap-2 px-4 py-2.5 border-l-[3px] shadow-lg
              min-w-[320px] max-w-[480px] \${SEVERITY_CLASSES[toast.severity]}
              \${toast.exiting ? 'toast-exit' : 'toast-enter'}\`}>
            <span>{SEVERITY_ICON[toast.severity]}</span>
            <span className="flex-1 text-[0.8125rem] font-medium">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}`,
  },
  {
    id: 'slaindicator',
    name: 'SLAIndicator',
    file: 'components/SLAIndicator.tsx',
    category: 'feedback',
    categoryLabel: 'Feedback & Status',
    description: 'Displays SLA status with color-coded badges and an optional progress bar. Shows overdue (red), warning (amber), on-track (green), or completed states.',
    whenToUse: 'Use anywhere you need to show time-based status. The color logic (overdue/warning/on-track) and progress bar pattern work for any deadline-tracking feature.',
    props: [
      { name: 'sla', type: 'SLAStatus | null', description: 'Calculated SLA object with label, percentUsed, isOverdue' },
      { name: 'compact', type: 'boolean', description: 'If true, hides the progress bar (for table rows)' },
    ],
    usage: `const sla = calculateSLA(createdDate, serviceLevel, status);
<SLAIndicator sla={sla} />
<SLAIndicator sla={sla} compact />`,
    source: `export function SLAIndicator({ sla, compact }: { sla: SLAStatus | null; compact?: boolean }) {
  if (!sla) return <span className="text-[#999999] text-[0.75rem]">No SLA</span>;

  if (sla.label === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1">
        <CheckCircleOutlineIcon size={14} className="text-[#006400]" />
        {!compact && <span className="text-[#006400] text-[0.75rem]">Done</span>}
      </span>
    );
  }

  const isOverdue = sla.isOverdue;
  const isWarning = !isOverdue && sla.percentUsed > 75;

  const bgColor = isOverdue ? '#FFF0F0' : isWarning ? '#FFF8E1' : '#F0FAF0';
  const textColor = isOverdue ? '#B10F41' : isWarning ? '#AF6002' : '#006400';
  const barColor = isOverdue ? '#E81717' : isWarning ? '#FFBA05' : '#048A0E';

  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-block px-1.5 py-0.5 text-[0.75rem] font-medium font-mono"
        style={{ backgroundColor: bgColor, color: textColor }}>
        {sla.label}
      </span>
      {!compact && (
        <div className="h-1 w-full bg-[#E6EAEA]">
          <div className="h-full transition-all duration-300"
            style={{ width: \`\${Math.min(sla.percentUsed, 100)}%\`, backgroundColor: barColor }} />
        </div>
      )}
    </div>
  );
}`,
  },
  {
    id: 'dossearchconfig',
    name: 'DOSSearchConfigPage',
    file: 'pages/DOSSearchConfigPage.tsx',
    category: 'data',
    categoryLabel: 'Data Display',
    description: 'A full config page combining a sortable/filterable data table with stat cards and an inline-editing FAQ manager. Demonstrates tabbed views, stat summary cards, search+filter bars, sortable table headers, and inline record editing with save/cancel.',
    whenToUse: 'Reference this as a template for any admin/config page that needs: stat overview cards, a filterable table, and inline editing of records.',
    props: [
      { name: 'dosSearchLogRecords', type: 'AirtableRecord[]', description: 'Search log records to display' },
      { name: 'dosRecords', type: 'AirtableRecord[]', description: 'DOS service records for FAQ editing' },
      { name: 'dosTable', type: 'Table', description: 'Table reference for updating records' },
      { name: 'onRefreshSearchLog', type: '() => Promise<void>', description: 'Refetch callback' },
    ],
    usage: `<DOSSearchConfigPage
  dosSearchLogTable={tables.dosSearchLogTable}
  dosSearchLogRecords={data.dosSearchLogRecords}
  dosRecords={data.dosRecords}
  dosTable={tables.dosTable}
  onRefreshSearchLog={data.refetchDosSearchLog}
/>`,
    source: `// Key pattern: Tab navigation with active indicator
<div className="flex gap-0 border-b border-core_palette-primary-5/30">
  <button onClick={() => setActiveTab('logs')}
    className={\`px-4 py-2 text-sm font-medium relative \${
      activeTab === 'logs' ? 'text-core_palette-primary-1' : 'text-semantic-system-5 hover:text-semantic-system-3'
    }\`}>
    Search Logs <span className="text-xs text-semantic-system-6">({count})</span>
    {activeTab === 'logs' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-core_palette-primary-2" />}
  </button>
</div>

// Key pattern: Stat cards row
<div className="grid grid-cols-4 gap-3 mb-4">
  <StatCard label="Total Searches" value={stats.total} />
  <StatCard label="Helpful" value={stats.helpful} accent="text-[#1B5E20]" />
</div>

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-core_palette-primary-5/30 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-semantic-system-6">{label}</p>
      <p className={\`text-xl font-semibold mt-0.5 \${accent || 'text-semantic-system-2'}\`}>{value}</p>
    </div>
  );
}

// Key pattern: Inline editing with save/cancel
const { mutate: updateRecord, loading: saving } = useUpdateRecord(table);

const saveEdit = async () => {
  await updateRecord({ recordId: editingId, fields: { 'Field Name': editValue } });
  showSnackbar('Updated successfully', 'success');
  setEditingId(null);
};`,
  },
  {
    id: 'usecurrentuser',
    name: 'useCurrentUser',
    file: 'hooks/useCurrentUser.tsx',
    category: 'hooks',
    categoryLabel: 'Hooks & Utilities',
    description: 'A React context + hook for managing the current user identity. Resolves the user from People records, links to Technician records, resolves role-based permissions from Roles and Role Permissions tables, and persists selection in localStorage.',
    whenToUse: 'Use in any app that needs user identity and role-based permissions. The permission resolution pattern (People → Roles → Role Permissions) is the standard for this codebase.',
    props: [
      { name: 'technicians', type: 'Technician[]', description: 'Technician list for linking' },
      { name: 'peopleRecords', type: 'AirtableRecord[]', description: 'People table records' },
      { name: 'roleRecords', type: 'AirtableRecord[]', description: 'Roles table records' },
      { name: 'rolePermissionRecords', type: 'AirtableRecord[]', description: 'Role Permissions table records' },
    ],
    usage: `// Provider wraps the app
<CurrentUserProvider
  technicians={data.technicians}
  techRecords={data.techRecords}
  peopleRecords={data.peopleRecords}
  roleRecords={data.roleRecords}
  rolePermissionRecords={data.rolePermissionRecords}
>
  <App />
</CurrentUserProvider>

// In any component
const { currentUser } = useCurrentUser();
if (currentUser) {
  console.log(currentUser.name);         // "John Smith"
  console.log(currentUser.permissions);  // ["tickets.create", "config.view"]
  console.log(currentUser.roleNames);    // ["Admin", "Technician"]
  console.log(currentUser.technicianId); // "recXXX" or null
}`,
    source: `interface CurrentUser {
  id: string;          // People record ID
  name: string;
  email: string;
  department: string;
  permissions: string[];   // Resolved from Role Permissions
  roleNames: string[];     // Resolved from Roles
  serviceNames: string[];  // From People.Team field
  technicianId: string | null;  // Linked Technician record ID
}

// Permission resolution chain:
// 1. Get Person record
// 2. Get linked Role IDs from Person.Roles
// 3. Find Role Permission records that link to those Roles
// 4. Collect the Key field from each matching Role Permission
// Result: permissions[] = ['tickets.create', 'tickets.edit', 'config.view', ...]

// localStorage persistence:
// Key: 'servicedesk_current_user'
// Value: People record ID`,
  },
  {
    id: 'useservicedeskdata',
    name: 'useServiceDeskData',
    file: 'hooks/useServiceDeskData.tsx',
    category: 'hooks',
    categoryLabel: 'Hooks & Utilities',
    description: 'The central data loading hook. Implements lazy loading — tables are only fetched when the current view needs them. Uses a viewNeeds() function to determine which tables each view requires.',
    whenToUse: 'This is the pattern for managing data across a multi-view app. Add new tables here when integrating new Airtable data. The viewNeeds pattern prevents unnecessary API calls.',
    props: [
      { name: 'tables', type: 'ServiceDeskTables', description: 'Resolved table references from resolveRequiredTables()' },
      { name: 'view', type: 'AppView', description: 'Current active view (determines which tables to load)' },
    ],
    usage: `// In your app root
const tables = resolveRequiredTables(base);
const data = useServiceDeskData(tables, currentView);

// Access records
data.ticketRecords
data.dosRecords
data.dosSearchLogRecords

// Refetch after mutations
await data.refetchTickets();`,
    source: `// Key pattern: Lazy loading with viewNeeds
function viewNeeds(view: AppView) {
  const isTicketView = view === 'kanban' || view === 'table' || view === 'timeline';
  return {
    notes: isTicketView,
    history: isTicketView,
    dos: view === 'dos' || view === 'locations' || view === 'dossearchconfig',
    dosSearchLog: view === 'dossearchconfig',
    // ... other tables
  };
}

// Key pattern: Conditional data loading
const needs = viewNeeds(view);
const { records: dosRecords } = useRecords(tables.dosTable, { enabled: needs.dos } as any);
const { records: logRecords, refetch } = useRecords(tables.logTable, { enabled: needs.dosSearchLog } as any);

// To add a new table:
// 1. Add to ServiceDeskTables interface
// 2. Add to ServiceDeskData interface (records + refetch)
// 3. Add to resolveRequiredTables()
// 4. Add to viewNeeds() — which views need it
// 5. Add useRecords() call
// 6. Add to return object`,
  },
  {
    id: 'icons',
    name: 'Icons',
    file: 'components/Icons.tsx',
    category: 'layout',
    categoryLabel: 'Layout & Navigation',
    description: 'A library of Material Design SVG icons implemented as lightweight React components. Uses a makeIcon factory that accepts SVG path data and produces consistent, sized, colored icon components.',
    whenToUse: 'Import individual icons by name. All icons accept size (number) and className (string) props. Use className for color via Tailwind (e.g., text-core_palette-primary-1).',
    props: [
      { name: 'size', type: 'number', description: 'Icon width/height in pixels (default: 24)' },
      { name: 'className', type: 'string', description: 'Tailwind classes for styling (color, etc.)' },
    ],
    usage: `import { SearchIcon, EditIcon, DeleteIcon, AddIcon, CloseIcon } from './Icons';

<SearchIcon size={18} className="text-semantic-system-6" />
<EditIcon size={14} />
<AddIcon size={16} className="text-white" />

// Available icons include:
// MenuIcon, CloseIcon, SearchIcon, AddIcon, EditIcon, DeleteIcon,
// CheckCircleIcon, CancelIcon, WarningAmberIcon, AccessTimeIcon,
// ConfirmationNumberIcon, CategoryIcon, SpeedIcon, NotificationsIcon,
// ViewColumnIcon, TableChartIcon, DescriptionIcon, ComputerIcon,
// SettingsIcon, PersonIcon, PeopleIcon, ShieldIcon, KeyIcon,
// OpenInNewIcon, LinkIcon, ArrowUpwardIcon, ArrowDownwardIcon, ...`,
    source: `// Factory pattern for consistent SVG icons
function makeIcon(paths: string[], fillRule?: string) {
  return function SvgIcon({ size = 24, className, style }: IconProps) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        width={size} height={size} fill="currentColor"
        className={className} style={style} fillRule={fillRule}>
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
  };
}

// Usage: export const SearchIcon = makeIcon(['M15.5 14h-.79l-...']);
// To add a new icon: find the SVG path data from Material Icons and call makeIcon()`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-semantic-system-5 hover:text-core_palette-primary-1 hover:bg-core_palette-primary-1/5 transition-colors"
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <CheckCircleIcon size={12} className="text-[#006400]" />
          <span className="text-[#006400]">Copied</span>
        </>
      ) : (
        'Copy'
      )}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="border border-core_palette-primary-5/30 mt-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-semantic-surface/60 border-b border-core_palette-primary-5/20">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-semantic-system-5">{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-semantic-system-3 bg-[#FAFBFB] font-mono" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ComponentDetail({ doc }: { doc: ComponentDoc }) {
  return (
    <div id={doc.id} className="scroll-mt-6">
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="text-[1.1rem] font-semibold text-core_palette-primary-3">{doc.name}</h2>
        <span className="text-[10px] font-mono text-semantic-system-6 bg-semantic-surface px-1.5 py-0.5">{doc.file}</span>
        <span className="text-[10px] font-medium text-core_palette-primary-1 bg-core_palette-primary-1/5 px-1.5 py-0.5">{doc.categoryLabel}</span>
      </div>

      <p className="text-[0.8125rem] text-semantic-system-3 leading-relaxed mb-2">{doc.description}</p>

      <div className="mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-semantic-system-5">When to use</span>
        <p className="text-xs text-semantic-system-4 mt-0.5 leading-relaxed">{doc.whenToUse}</p>
      </div>

      {doc.props.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-semantic-system-5">Props / Inputs</span>
          <div className="border border-core_palette-primary-5/30 mt-1 overflow-x-auto" tabIndex={0}>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-semantic-surface/60 text-left">
                  <th className="px-3 py-1.5 font-semibold text-semantic-system-4 w-[140px]">Prop</th>
                  <th className="px-3 py-1.5 font-semibold text-semantic-system-4 w-[200px]">Type</th>
                  <th className="px-3 py-1.5 font-semibold text-semantic-system-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {doc.props.map(p => (
                  <tr key={p.name} className="border-t border-core_palette-primary-5/15">
                    <td className="px-3 py-1.5 font-mono text-core_palette-primary-1 font-medium">{p.name}</td>
                    <td className="px-3 py-1.5 font-mono text-semantic-system-5">{p.type}</td>
                    <td className="px-3 py-1.5 text-semantic-system-3">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CodeBlock code={doc.usage} label="Usage Example" />
      <CodeBlock code={doc.source} label="Source / Key Patterns" />
    </div>
  );
}

export function DevReferencePage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [search, setSearch] = useState('');

  const filtered = COMPONENTS.filter(c => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.file.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = CATEGORIES.filter(c => c.id !== 'all').map(cat => ({
    ...cat,
    items: filtered.filter(c => c.category === cat.id),
  })).filter(g => g.items.length > 0);

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="w-[240px] flex-shrink-0 border-r border-core_palette-primary-5/20 bg-white flex flex-col overflow-hidden">
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <h1 className="text-[1rem] font-semibold text-core_palette-primary-3 tracking-tight">Developer Reference</h1>
          <p className="text-[10px] text-semantic-system-6 mt-0.5">{COMPONENTS.length} components documented</p>
        </div>

        <div className="px-3 pb-2 flex-shrink-0">
          <div className="relative">
            <SearchIcon size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-semantic-system-7" />
            <input
              type="text"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-6 pr-2 py-1 text-[11px] border border-core_palette-primary-5/30 bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
            />
          </div>
        </div>

        <div className="px-3 pb-2 flex flex-wrap gap-1 flex-shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-core_palette-primary-1 text-white'
                  : 'text-semantic-system-5 bg-semantic-surface hover:bg-core_palette-primary-5/30'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <nav className="flex-1 overflow-auto px-2 pb-3" tabIndex={0}>
          {grouped.map(group => (
            <div key={group.id} className="mb-3">
              <span className="block px-2 mb-1 text-[9px] font-semibold uppercase tracking-widest text-semantic-system-7">{group.label}</span>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    const el = document.getElementById(item.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="block w-full text-left px-2 py-1 text-[11px] text-semantic-system-4 hover:text-core_palette-primary-1 hover:bg-core_palette-primary-1/5 transition-colors truncate"
                >
                  {item.name}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-xs text-semantic-system-6 text-center">No components match your search</p>
          )}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto px-8 py-6" tabIndex={0}>
        <div className="max-w-4xl">
          <div className="mb-8">
            <p className="text-xs text-semantic-system-5 leading-relaxed max-w-2xl">
              This reference documents the reusable components, page patterns, and hooks built for this Service Desk app.
              Copy the code blocks to replicate these patterns in other projects. Each entry includes the key patterns
              extracted from the source — not just the interface, but the implementation details that make it work.
            </p>
          </div>
          <div className="flex flex-col gap-12">
            {filtered.map(doc => (
              <ComponentDetail key={doc.id} doc={doc} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
