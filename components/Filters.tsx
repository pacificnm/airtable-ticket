import React from 'react';
import { STATUS_ORDER } from '../types';
import { ServiceLevel, Technician } from '../types';
import { SearchIcon, CloseIcon } from './Icons';
import { RoleGuard, useHasPermission } from './RoleGuard';

export interface FilterState {
  status: string;
  type: string;
  priority: string;
  assignee: string;
  search: string;
}

interface FiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  technicians: Technician[];
  serviceLevels: ServiceLevel[];
}

export function Filters({ filters, onChange, technicians, serviceLevels }: FiltersProps) {
  const canViewOthers = useHasPermission('tickets.view.others');

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearableCount = [filters.status, filters.type, filters.priority, ...(canViewOthers ? [filters.assignee] : [])].filter(Boolean).length;

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-[rgba(202,209,211,0.3)]">
      <div className="relative flex-1">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]">
          <SearchIcon size={18} />
        </span>
        <input
          type="text"
          placeholder="Search tickets..."
          value={filters.search}
          onChange={(e: any) => update('search', e.target.value)}
          aria-label="Search tickets"
          className="w-full pl-9 pr-3 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1 transition-colors"
        />
      </div>

      <select
        value={filters.status}
        onChange={(e: any) => update('status', e.target.value)}
        aria-label="Filter by status"
        className="min-w-[130px] px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1"
      >
        <option value="">All Statuses</option>
        {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select
        value={filters.type}
        onChange={(e: any) => update('type', e.target.value)}
        aria-label="Filter by type"
        className="min-w-[130px] px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1"
      >
        <option value="">All Types</option>
        <option value="Incident">Incident</option>
        <option value="Request">Request</option>
        <option value="Problem">Problem</option>
        <option value="Change">Change</option>
      </select>

      <select
        value={filters.priority}
        onChange={(e: any) => update('priority', e.target.value)}
        aria-label="Filter by priority"
        className="min-w-[130px] px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1"
      >
        <option value="">All Priorities</option>
        {serviceLevels.sort((a, b) => a.priorityOrder - b.priorityOrder).map(sl => (
          <option key={sl.id} value={sl.name}>{sl.name}</option>
        ))}
      </select>

      <RoleGuard permission="tickets.view.others">
        <select
          value={filters.assignee}
          onChange={(e: any) => update('assignee', e.target.value)}
          aria-label="Filter by assignee"
          className="min-w-[130px] px-2 py-1.5 text-[0.8125rem] border border-[rgba(202,209,211,0.3)] bg-white focus:outline-none focus:border-core_palette-primary-1"
        >
          <option value="">All Assignees</option>
          {technicians.filter(t => t.active).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </RoleGuard>

      {clearableCount > 0 && (
        <button
          onClick={() => onChange({ status: '', type: '', priority: '', assignee: canViewOthers ? '' : filters.assignee, search: filters.search })}
          className="flex items-center gap-1 text-core_palette-primary-1 text-[0.75rem] font-medium whitespace-nowrap hover:opacity-80 transition-opacity"
        >
          <CloseIcon size={14} />
          Clear ({clearableCount})
        </button>
      )}
    </div>
  );
}
