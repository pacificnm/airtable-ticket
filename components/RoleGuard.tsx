import React from 'react';
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
}
