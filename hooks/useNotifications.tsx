import { useMemo } from 'react';
import { AirtableRecord, getLinkedRecordIds } from '../lib/airtable-hooks';
import { Technician } from '../types';
import { useCurrentUser } from './useCurrentUser';

export function useUnreadNotificationCount(
  notificationRecords: AirtableRecord[],
  technicians: Technician[],
): number {
  const { currentUser } = useCurrentUser();

  return useMemo(() => {
    if (!currentUser) return 0;
    const personId = currentUser.id;
    const techId = currentUser.technicianId;
    const userName = currentUser.name;

    return notificationRecords.filter(n => {
      if (n.getCellValue('Read')) return false;

      const toName = n.getCellValueAsString('To Name');
      const toEmail = n.getCellValueAsString('To Email');
      return toName === userName || (currentUser.email && toEmail === currentUser.email);
    }).length;
  }, [notificationRecords, currentUser]);
}
