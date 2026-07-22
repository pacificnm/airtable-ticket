export interface ServiceLevel {
    id: string;
    name: string;
    responseHours: number;
    resolutionHours: number;
    priorityOrder: number;
  }
  
  export interface Technician {
    id: string;
    name: string;
    active: boolean;
  }
  
  export interface Category {
    id: string;
    name: string;
    description: string;
  }
  
  export type TicketStatus = 'Open' | 'In Progress' | 'On Hold' | 'Resolved' | 'Closed';
  export type TicketType = 'Incident' | 'Request' | 'Problem' | 'Change';
  export type NoteSource = 'Email' | 'Slack' | 'Meeting' | 'In App';
  
  export const STATUS_ORDER: TicketStatus[] = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
  
  export const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
    'Open': { bg: '#EBF5FF', text: '#0D52AC', dot: '#166EE1' },
    'In Progress': { bg: '#FFF8E1', text: '#AF6002', dot: '#FFBA05' },
    'On Hold': { bg: '#F3E8FF', text: '#6231AE', dot: '#7C37EF' },
    'Resolved': { bg: '#E6FCE8', text: '#006400', dot: '#048A0E' },
    'Closed': { bg: '#F2F4F8', text: '#41454D', dot: '#616670' },
  };
  
  export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    'Critical': { bg: '#FFE0CC', text: '#AA2D00' },
    'High': { bg: '#FFD4E0', text: '#B10F41' },
    'Medium': { bg: '#FFEAB6', text: '#AF6002' },
    'Low': { bg: '#D1E2FF', text: '#0D52AC' },
  };
  
  export const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    'Incident': { bg: '#FFD4E0', text: '#B10F41' },
    'Request': { bg: '#D1E2FF', text: '#0D52AC' },
    'Problem': { bg: '#FFEAB6', text: '#AF6002' },
    'Change': { bg: '#C1F5F0', text: '#17726E' },
  };
  
  export const DOC_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    'Draft': { bg: '#FDE8E8', text: '#B10F41' },
    'In Review': { bg: '#FFF8E1', text: '#AF6002' },
    'Published': { bg: '#E6FCE8', text: '#006400' },
    'Archived': { bg: '#F2F4F8', text: '#616670' },
  };
  
  export const SOURCE_CONFIG: Record<NoteSource, { icon: string; color: string }> = {
    'Email': { icon: '✉', color: '#166EE1' },
    'Slack': { icon: '#', color: '#7C37EF' },
    'Meeting': { icon: '◉', color: '#048A0E' },
    'In App': { icon: '⊙', color: '#AF6002' },
  };
  