import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  AirtableRecord,
  Table,
  getLinkedRecordIds,
  useCurrentUser as useViewerIdentity,
  findCurrentUserRecord,
  CollaboratorValue,
} from '../lib/airtable-hooks';

const IMPERSONATE_STORAGE_KEY = 'servicedesk_impersonate_user';

// Only true administrators (those who manage roles) may view the app as another
// person. This keeps impersonation an admin-only support/testing capability.
const IMPERSONATE_PERMISSION = 'config.roles.manage';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  department: string;
  permissions: string[];
  roleNames: string[];
  serviceNames: string[];
  technicianId: string | null;
  airtableUserId: string | null;
}

interface CurrentUserContextValue {
  currentUser: CurrentUser | null;
  realUser: CurrentUser | null;
  setCurrentUserId: (personId: string) => void;
  clearImpersonation: () => void;
  isImpersonating: boolean;
  canImpersonate: boolean;
  identityLoading: boolean;
  identityResolved: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue>({
  currentUser: null,
  realUser: null,
  setCurrentUserId: () => {},
  clearImpersonation: () => {},
  isImpersonating: false,
  canImpersonate: false,
  identityLoading: true,
  identityResolved: false,
});

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}

export function CurrentUserProvider({
  techRecords,
  peopleRecords,
  peopleTable,
  roleRecords,
  rolePermissionRecords,
  children,
}: {
  techRecords?: AirtableRecord[];
  peopleRecords?: AirtableRecord[];
  peopleTable?: Table | null;
  roleRecords?: AirtableRecord[];
  rolePermissionRecords?: AirtableRecord[];
  children: React.ReactNode;
}) {
  const { currentUser: viewer, loading: viewerLoading } = useViewerIdentity();

  // Still resolving while the viewer identity is loading, or while we have a
  // viewer but the People directory hasn't arrived yet to match against.
  const peopleReady = !!peopleRecords && peopleRecords.length > 0;
  const identityLoading = viewerLoading || (!!viewer && !peopleReady);

  const [impersonatedId, setImpersonatedId] = useState<string | null>(() =>
    localStorage.getItem(IMPERSONATE_STORAGE_KEY)
  );

  const setCurrentUserId = useCallback((personId: string) => {
    setImpersonatedId(personId);
    localStorage.setItem(IMPERSONATE_STORAGE_KEY, personId);
  }, []);

  const clearImpersonation = useCallback(() => {
    setImpersonatedId(null);
    localStorage.removeItem(IMPERSONATE_STORAGE_KEY);
  }, []);

  // Match the real signed-in viewer to their People record.
  // Standalone: VITE_DEV_USER_ID may be a People record id (rec...), or we
  // match Work Email fields (often singleLineText, not Airtable "email" type).
  const realPerson = useMemo(() => {
    if (!peopleRecords || peopleRecords.length === 0 || !viewer) return null;

    if (viewer.id?.startsWith('rec')) {
      const byRecordId = peopleRecords.find(r => r.id === viewer.id);
      if (byRecordId) return byRecordId;
    }

    if (peopleTable) {
      const viaHelper = findCurrentUserRecord(peopleRecords, peopleTable, viewer);
      if (viaHelper) return viaHelper;
    }

    const emailLower = viewer.email?.toLowerCase();
    if (emailLower) {
      const byWorkEmail = peopleRecords.find(r => {
        const nike = r.getCellValueAsString('Work Email (Nike)').toLowerCase();
        const cbre = r.getCellValueAsString('Work Email (CBRE)').toLowerCase();
        return nike === emailLower || cbre === emailLower;
      });
      if (byWorkEmail) return byWorkEmail;
    }

    return null;
  }, [peopleRecords, peopleTable, viewer]);

  const realUser = useMemo(
    () => (realPerson ? resolveUserFromPerson(realPerson, techRecords, roleRecords, rolePermissionRecords) : null),
    [realPerson, techRecords, roleRecords, rolePermissionRecords]
  );

  const canImpersonate = !!realUser?.permissions.includes(IMPERSONATE_PERMISSION);

  const effectivePerson = useMemo(() => {
    if (canImpersonate && impersonatedId && peopleRecords) {
      const impersonated = peopleRecords.find(r => r.id === impersonatedId);
      if (impersonated) return impersonated;
    }
    return realPerson;
  }, [canImpersonate, impersonatedId, peopleRecords, realPerson]);

  const currentUser = useMemo(
    () => (effectivePerson ? resolveUserFromPerson(effectivePerson, techRecords, roleRecords, rolePermissionRecords) : null),
    [effectivePerson, techRecords, roleRecords, rolePermissionRecords]
  );

  const isImpersonating = canImpersonate && !!effectivePerson && !!realPerson && effectivePerson.id !== realPerson.id;

  const value: CurrentUserContextValue = {
    currentUser,
    realUser,
    setCurrentUserId,
    clearImpersonation,
    isImpersonating,
    canImpersonate,
    identityLoading,
    identityResolved: !!realPerson,
  };

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

function resolveUserFromPerson(
  person: AirtableRecord,
  techRecords?: AirtableRecord[],
  roleRecords?: AirtableRecord[],
  rolePermissionRecords?: AirtableRecord[],
): CurrentUser {
  let permissions: string[] = [];
  let roleNames: string[] = [];
  let serviceNames: string[] = [];
  let technicianId: string | null = null;

  const name = person.getCellValueAsString('Name');
  const nikeEmail = person.getCellValueAsString('Work Email (Nike)');
  const cbreEmail = person.getCellValueAsString('Work Email (CBRE)');
  const email = nikeEmail || cbreEmail || '';

  const airtableUser = person.getCellValue('Airtable User') as CollaboratorValue | null;
  const airtableUserId = airtableUser && typeof airtableUser === 'object' ? (airtableUser as any).id || null : null;

  if (techRecords) {
    const techIds = getLinkedRecordIds(person.getCellValue('Technicians') as any);
    if (techIds.length > 0) {
      technicianId = techIds[0];
    }
  }

  if (roleRecords && rolePermissionRecords) {
    const personRoleIds = new Set<string>();
    const rids = getLinkedRecordIds(person.getCellValue('Roles') as any);
    rids.forEach(rid => personRoleIds.add(rid));

    const teamField = person.getCellValueAsString('Team');
    if (teamField) {
      serviceNames = [teamField];
    }

    roleNames = roleRecords
      .filter(r => personRoleIds.has(r.id))
      .map(r => r.getCellValueAsString('Name'));

    const permSet = new Set<string>();
    for (const perm of rolePermissionRecords) {
      const permRoleIds = getLinkedRecordIds((perm as any).fields?.['Role']);
      const hasMatch = permRoleIds.some(rid => personRoleIds.has(rid));
      if (hasMatch) {
        const key = perm.getCellValueAsString('Key');
        if (key) permSet.add(key);
      }
    }
    permissions = Array.from(permSet);
  }

  return {
    id: person.id,
    name,
    email,
    department: person.getCellValueAsString('Department') || '',
    permissions,
    roleNames,
    serviceNames,
    technicianId,
    airtableUserId,
  };
}
