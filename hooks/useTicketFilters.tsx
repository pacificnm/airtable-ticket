import { useState, useMemo } from 'react';
import { AirtableRecord, getLinkedRecordIds } from '../lib/airtable-hooks';
import { Technician } from '../types';
import { FilterState } from '../components/Filters';

export function useTicketFilters(
  ticketRecords: AirtableRecord[],
  _technicians: Technician[],
) {
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    type: '',
    priority: '',
    assignee: '',
    search: '',
  });

  const filteredTickets = useMemo(() => {
    return ticketRecords.filter(t => {
      if (filters.status && t.getCellValueAsString('Status') !== filters.status) return false;
      if (filters.type && t.getCellValueAsString('Request Type (from Subcategory)') !== filters.type) return false;
      if (filters.priority && t.getCellValueAsString('Service Levels') !== filters.priority) return false;

      if (filters.assignee) {
        const assignedTechIds = getLinkedRecordIds((t as any).fields?.['Assigned Technician']);
        if (!assignedTechIds.includes(filters.assignee)) return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = [
          t.getCellValueAsString('Title'),
          t.getCellValueAsString('Description'),
          t.getCellValueAsString('Requester Name'),
          t.getCellValueAsString('Assigned Technician'),
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [ticketRecords, filters]);

  return { filters, setFilters, filteredTickets };
}
