import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { Table, AirtableRecord, getLinkedRecordIds } from '../lib/airtable-hooks';
import { useCurrentUser } from './useCurrentUser';

const API_BASE = '/canvas/api/proxy';
const BASE_ID = 'appT48di3I5t3JXTc';
const PROJECT_ID = 'eb6b2675-b1a8-4f3a-a0ac-e7ffb6ec3c26';

// Mirror the __GENERATION_ID__ injected at build time (same as airtable-hooks)
declare const __GENERATION_ID__: string | null;
const GENERATION_ID = typeof __GENERATION_ID__ !== 'undefined' ? __GENERATION_ID__ : null;

async function createRecordWithTypecast(tableId: string, fields: Record<string, unknown>): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Project-Id': PROJECT_ID,
    };
    if (GENERATION_ID) {
      headers['X-Generation-Id'] = GENERATION_ID;
    }
    const response = await fetch(`${API_BASE}/bases/${BASE_ID}/tables/${tableId}/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('EventBus create failed:', response.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error('EventBus create error:', err);
    return false;
  }
}

// ── Payload types ────────────────────────────────────────────────────

export interface HistoryPayload {
  ticketId: string;
  summary: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export interface NotificationPayload {
  toTechId: string;
  subject: string;
  body: string;
}

// ── Context shape ────────────────────────────────────────────────────

type LogHistoryFn = (ticketId: string, summary: string, action: string, oldValue?: string, newValue?: string, details?: string) => Promise<void>;
type SendNotificationFn = (toTechId: string, subject: string, body: string) => Promise<void>;

interface ServiceBusContextValue {
  logHistory: LogHistoryFn;
  sendNotification: SendNotificationFn;
}

const ServiceBusContext = createContext<ServiceBusContextValue>({
  logHistory: async () => {},
  sendNotification: async () => {},
});

// ── Helper: resolve Technician ID → People ID ───────────────────────

function resolveTechToPersonId(techId: string, techRecords: AirtableRecord[]): string | null {
  const techRecord = techRecords.find(r => r.id === techId);
  if (!techRecord) return null;
  const peopleIds = getLinkedRecordIds(techRecord.getCellValue('People') as any);
  return peopleIds.length > 0 ? peopleIds[0] : null;
}

function resolveTechToName(techId: string, techRecords: AirtableRecord[]): string {
  const techRecord = techRecords.find(r => r.id === techId);
  return techRecord ? techRecord.getCellValueAsString('Name') : '';
}

// ── Provider ─────────────────────────────────────────────────────────

interface ServiceBusProviderProps {
  historyTable: Table;
  notificationsTable: Table;
  techRecords: AirtableRecord[];
  children: React.ReactNode;
}

export function EventBusProvider({ historyTable, notificationsTable, techRecords, children }: ServiceBusProviderProps) {
  const { currentUser } = useCurrentUser();

  const historyTableId = historyTable?.id;
  const notificationsTableId = notificationsTable?.id;

  const logHistory: LogHistoryFn = useCallback(
    async (ticketId, summary, action, oldValue, newValue, details) => {
      if (!historyTableId) return;
      const fields: Record<string, unknown> = {
        Action: action,
        Ticket: [ticketId],
      };
      if (oldValue) fields['Old Value'] = oldValue;
      if (newValue) fields['New Value'] = newValue;
      if (details) fields['Details'] = details;

      await createRecordWithTypecast(historyTableId, fields);
    },
    [historyTableId, currentUser?.name, currentUser?.technicianId],
  );

  const sendNotification: SendNotificationFn = useCallback(
    async (toTechId, subject, body) => {
      if (!notificationsTableId) return;

      // Resolve the recipient Technician ID → People ID
      const toPersonId = resolveTechToPersonId(toTechId, techRecords);
      const toName = resolveTechToName(toTechId, techRecords);

      const fields: Record<string, unknown> = {
        Subject: subject,
        Body: body,
        'From Name': currentUser?.name || 'Service Desk',
        'To Name': toName || toTechId,
        'Date Sent': new Date().toISOString(),
        Read: false,
      };

      await createRecordWithTypecast(notificationsTableId, fields);
    },
    [notificationsTableId, techRecords, currentUser?.name, currentUser?.id, currentUser?.technicianId],
  );

  const value = useMemo(
    () => ({ logHistory, sendNotification }),
    [logHistory, sendNotification],
  );

  return (
    <ServiceBusContext.Provider value={value}>
      {children}
    </ServiceBusContext.Provider>
  );
}

// ── Consumer hooks ───────────────────────────────────────────────────

export function useLogHistory(): LogHistoryFn {
  return useContext(ServiceBusContext).logHistory;
}

export function useSendNotification(): SendNotificationFn {
  return useContext(ServiceBusContext).sendNotification;
}
