import { ServiceLevel } from './types';

export interface SLAStatus {
  label: string;
  hoursRemaining: number;
  percentUsed: number;
  isOverdue: boolean;
  isBreach: boolean;
}

export function calculateSLA(
  createdDate: string | null,
  serviceLevel: ServiceLevel | null,
  status: string
): SLAStatus | null {
  if (!createdDate || !serviceLevel) return null;
  if (status === 'Closed' || status === 'Resolved') {
    return { label: 'Completed', hoursRemaining: 0, percentUsed: 0, isOverdue: false, isBreach: false };
  }

  const created = new Date(createdDate);
  const now = new Date();
  const elapsedMs = now.getTime() - created.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const totalHours = serviceLevel.resolutionHours;
  const remaining = totalHours - elapsedHours;
  const percentUsed = Math.min((elapsedHours / totalHours) * 100, 100);

  return {
    label: remaining > 0 ? formatTimeRemaining(remaining) : formatTimeOverdue(Math.abs(remaining)),
    hoursRemaining: remaining,
    percentUsed,
    isOverdue: remaining <= 0,
    isBreach: remaining < -(totalHours * 0.25),
  };
}

function formatTimeRemaining(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m left`;
  if (hours < 24) return `${Math.round(hours)}h left`;
  const days = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return `${days}d ${h}h left`;
}

function formatTimeOverdue(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m overdue`;
  if (hours < 24) return `${Math.round(hours)}h overdue`;
  const days = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return `${days}d ${h}h overdue`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
