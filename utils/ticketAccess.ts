import { AirtableRecord, getLinkedRecordIds } from '../lib/airtable-hooks';

export interface TicketViewer {
  name: string;
  email: string;
  technicianId: string | null;
  airtableUserId: string | null;
}

export function assignedToMe(ticket: AirtableRecord, user: TicketViewer | null): boolean {
  if (!user || !user.technicianId) return false;
  const assignedTechIds = getLinkedRecordIds((ticket as any).fields?.['Assigned Technician']);
  return assignedTechIds.includes(user.technicianId);
}

export function raisedByMe(ticket: AirtableRecord, user: TicketViewer | null): boolean {
  if (!user) return false;
  const emailLower = user.email ? user.email.toLowerCase() : '';
  const nameLower = user.name ? user.name.toLowerCase() : '';

  for (const field of ['Requester Name', 'Requested For']) {
    const collab = ticket.getCellValue(field) as any;
    if (collab && typeof collab === 'object') {
      if (user.airtableUserId && collab.id === user.airtableUserId) return true;
      if (collab.email && emailLower && collab.email.toLowerCase() === emailLower) return true;
      if (collab.name && nameLower && collab.name.toLowerCase() === nameLower) return true;
    }
  }

  const requesterEmail = ticket.getCellValueAsString('Requester Email');
  if (emailLower && requesterEmail && requesterEmail.toLowerCase() === emailLower) return true;

  const requesterName = ticket.getCellValueAsString('Requester Name');
  if (nameLower && requesterName && requesterName.toLowerCase() === nameLower) return true;

  return false;
}

export function isTicketMine(ticket: AirtableRecord, user: TicketViewer | null): boolean {
  return assignedToMe(ticket, user) || raisedByMe(ticket, user);
}
