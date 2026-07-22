import React, { useMemo } from 'react';
import { AirtableRecord } from '../lib/airtable-hooks';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Avatar } from './Avatar';
import { SoftwareApp, SoftwareRow } from './SoftwareRow';

interface AppBarAvatarProps {
  userName: string;
  softwareRecords: AirtableRecord[];
}

export function AppBarAvatar({ userName, softwareRecords }: AppBarAvatarProps) {
  const { currentUser } = useCurrentUser();

  const userServices = currentUser?.serviceNames || [];
  const userRoles = currentUser?.roleNames || [];

  const matchingSoftware: SoftwareApp[] = useMemo(() => {
    if (!userServices.length || !softwareRecords.length) return [];

    const serviceNamesLower = new Set(userServices.map(s => s.toLowerCase()));

    return softwareRecords
      .filter(r => {
        const svcField = (r as any).fields?.['Services'];
        if (!svcField) return false;

        if (Array.isArray(svcField)) {
          return svcField.some((s: any) => {
            const name = typeof s === 'string' ? s : s?.name;
            return name && serviceNamesLower.has(name.toLowerCase());
          });
        }
        if (typeof svcField === 'string') {
          return serviceNamesLower.has(svcField.toLowerCase());
        }
        return false;
      })
      .map(r => ({
        id: r.id,
        name: r.getCellValueAsString('Name'),
        url: r.getCellValueAsString('URL') || r.getCellValueAsString('Website') || '',
      }))
      .filter(a => a.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [softwareRecords, userServices]);

  return (
    <Avatar userName={userName} serviceNames={userServices} roleNames={userRoles}>
      <div className="px-4 py-2 border-b border-[rgba(202,209,211,0.15)] bg-[#FAFBFB] sticky top-0 z-10">
        <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-[rgba(67,82,84,0.4)]">
          Applications
          <span className="ml-1 normal-case tracking-normal font-normal text-[rgba(67,82,84,0.3)]">
            ({matchingSoftware.length})
          </span>
        </span>
      </div>

      {matchingSoftware.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-[0.8125rem] text-[#999999]">No applications for your services</p>
        </div>
      ) : (
        <div className="py-1">
          {matchingSoftware.map(app => (
            <SoftwareRow key={app.id} app={app} />
          ))}
        </div>
      )}
    </Avatar>
  );
}
