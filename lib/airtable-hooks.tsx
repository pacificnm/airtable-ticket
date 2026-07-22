/**
 * Airtable API Hooks Library
 *
 * React hooks for accessing Airtable data through the preview server proxy.
 * This library is copied into generated workspaces as lib/airtable-hooks.tsx
 *
 * IMPORTANT USAGE NOTES:
 *
 * Types to import: AirtableRecord, Table, Field, Base
 *
 * Update record format:
 * - Single select fields: pass the choice NAME as a string directly
 *   CORRECT:   { Status: 'Active' }
 *   WRONG:     { Status: { name: 'Active' } }
 *
 * - Text/number fields: pass values directly
 *   CORRECT:   { Name: 'New Name', Price: 99 }
 *
 * - Only include fields that have actually changed in the update
 *
 * - Linked record fields: pass an array of record IDs
 *   CORRECT:   { Milestone: ['recABC123'] }
 *   WRONG:     { Milestone: 'recABC123' }
 *   CLEAR:     { Milestone: [] }
 */

import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  DATA_INSPECT_ENABLED,
  airtableInspectId,
  dataInspectorRegistry,
  inspectIdAttrs,
  trackAirtableAggregate,
  trackDerivedValue,
  trackTransform,
  type AirtableDataSource,
  type AirtableAggregateDataSource,
  type AggregateFieldMetadata,
  type DataProvenance,
  type DataSource,
  type DataTransform,
  type DerivedDataSource,
  type JsonValue,
} from './data-inspector';

// Configuration injected at generation time (overridable via Vite env)
const BASE_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AIRTABLE_BASE_ID) ||
  'appT48di3I5t3JXTc';
const TABLE_IDS: Record<string, string> = {
  "roles": "tblpJfzRBkpROUxwA",
  "technicians": "tbl18RY6ZAf9LF5ju",
  "service_levels": "tblzEA7AaGs5cyiBf",
  "request_type": "tbliHWSCCWh8bX96i",
  "category": "tblSpfKbEhyEhtfqP",
  "subcategory": "tblTcc4xWMrEuE5ov",
  "tickets": "tblBBSw4OOrkafBbd",
  "notes": "tblMxTvsGNDeMQ2jo",
  "ticket_groups": "tbll5BtHtGV8XllW7",
  "external_tickets": "tblasFmqdcLzzHuwO",
  "ticket_history": "tblAVutv2YNsp1mBP",
  "notifications": "tblYevAoogM7BP5eD",
  "documents": "tbl3NIvzBu4MMdxeF",
  "default_tasks": "tbl3VbnKVuu1aQfej",
  "tasks": "tblYZiR5v9m49uGvk",
  "device_building": "tblDng2fYZoJZpSWf",
  "department": "tblYxOPblxFJS5z9x",
  "export": "tblqijbKktE00Ubvk",
  "products": "tbl0iNOf4IEKtUFUM",
  "devices": "tblEM4kJIGr4GUGUQ",
  "ip_address": "tblIFUxEUaAI9UGuE",
  "people": "tblhTWtRBDQgaUh1o",
  "team_service": "tbl7IhY2d5d4VC8tl",
  "teams": "tbl9a1KJMsOxPFZ7u",
  "role_permissions": "tblbEZl07xnJ5YCg5",
  "service_items": "tbleRfo8mBBjvJ6we",
  "description_of_services": "tbluMdQOU2qBVaufr",
  "taxonomy": "tbln5kJT0LJY8Dr8O",
  "building": "tblb1Fke4WLgl6Y43",
  "region": "tblWpw1WuyxAMSuCD",
  "software": "tblPSaHFjCAwpvoBI",
  "vendors": "tblHA7CjJk3uKZuD6",
  "service_department": "tblwZ221nxbUVd96U",
  "tableau_dashboards": "tblGitRZVRqcQ6V8K",
  "role": "tbliU0BcS8at7VRFe",
  "dos_search_log": "tbl0RVIyoFWG1sLRt",
  "review_intake": "tbl54T0UWgXVK1HeB"
};
const PROJECT_ID = 'eb6b2675-b1a8-4f3a-a0ac-e7ffb6ec3c26';

// Official Airtable REST API via Vite proxy (see vite.config.ts).
// Browser → /api/airtable/... → https://api.airtable.com/... with AIRTABLE_PAT.
const API_BASE = '/api/airtable/v0';

function airtableFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

/**
 * Build a user-facing Error from a non-OK Airtable response.
 */
async function proxyResponseError(response: Response, action: string): Promise<Error> {
  let message = '';
  try {
    const body = await response.json();
    if (body?.error?.message && typeof body.error.message === 'string') {
      message = body.error.message;
    } else if (typeof body?.error === 'string') {
      message = body.error;
    }
  } catch {
    // Non-JSON body — fall back below.
  }
  if (!message && response.status === 429) {
    message = 'The data source is busy right now. Please try again in a moment.';
  }
  if (!message && response.status === 401) {
    message = 'Airtable auth failed. Set AIRTABLE_PAT in .env and restart Vite.';
  }
  return new Error(message || `${action}: ${response.statusText || response.status}`);
}

async function fetchAllRecords(
  baseId: string,
  tableId: string,
  fields?: string[]
): Promise<any[]> {
  const records: any[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (fields?.length) {
      for (const field of fields) params.append('fields[]', field);
    }
    if (offset) params.set('offset', offset);
    const qs = params.toString();
    const url = `${API_BASE}/${baseId}/${encodeURIComponent(tableId)}${qs ? `?${qs}` : ''}`;
    const response = await airtableFetch(url);
    if (!response.ok) {
      throw await proxyResponseError(response, 'Failed to fetch records');
    }
    const data = await response.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
}

// ============================================================================
// Types
// ============================================================================

export interface Field {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: {
    choices?: Array<{ id: string; name: string; color?: string }>;
    linkedTableId?: string;
    precision?: number;
    symbol?: string;
  };
}

export interface Table {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Field[];
  getFieldById(fieldId: string): Field | null;
  getFieldByName(fieldName: string): Field | null;
  getFieldIfExists(fieldIdOrName: string): Field | null;
}

export interface Base {
  id: string;
  name: string;
  tables: Table[];
  getTableById(tableId: string): Table | null;
  getTableByName(tableName: string): Table | null;
  getTableIfExists(tableIdOrName: string): Table | null;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: { [fieldNameOrId: string]: unknown };
  getCellValue(field: Field | string): unknown;
  getCellValueAsString(field: Field | string): string;
  getProvenance(field: Field | string): DataProvenance;
}

export interface UseBaseResult {
  base: Base | null;
  loading: boolean;
  error: Error | null;
}


export interface UseRecordsResult {
  records: AirtableRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface MutationResult<T> {
  mutate: (data: T) => Promise<AirtableRecord | null>;
  loading: boolean;
  error: Error | null;
}

/** Single/multi select choice value */
export type SelectChoice = { id: string; name: string; color?: string };

/** Collaborator value */
export type CollaboratorValue = { id: string; email: string; name?: string };

/** Airtable attachment value */
export interface AttachmentValue {
  id: string;
  url?: string;
  filename?: string;
  type?: string;
  size?: number;
  thumbnails?: Record<string, unknown>;
}

export interface AttachmentProxyOptions {
  baseId?: string;
  tableIdOrName: Table | string;
  recordId: string;
  fieldIdOrName: Field | string;
  attachmentId?: string;
}

export interface UseAttachmentObjectUrlResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
}

export interface UseAttachmentTextResult {
  text: string | null;
  loading: boolean;
  error: Error | null;
}

export type DelimitedTextRow = Record<string, string>;
export type CsvRow = DelimitedTextRow;

interface AirtableSourceContext {
  baseId: string;
  tableId: string;
  tableName: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function enhanceTable(tableData: any): Table {
  const table: Table = {
    ...tableData,
    fields: tableData.fields || [],
    getFieldById(fieldId: string): Field | null {
      return this.fields.find((f: Field) => f.id === fieldId) || null;
    },
    getFieldByName(fieldName: string): Field | null {
      return this.fields.find((f: Field) => f.name === fieldName) || null;
    },
    getFieldIfExists(fieldIdOrName: string): Field | null {
      return this.fields.find((f: Field) => f.id === fieldIdOrName || f.name === fieldIdOrName) || null;
    },
  };
  return table;
}

function enhanceBase(baseData: any): Base {
  const tables = (baseData.tables || []).map(enhanceTable);
  const base: Base = {
    id: baseData.id,
    name: baseData.name,
    tables,
    getTableById(tableId: string): Table | null {
      return this.tables.find((t: Table) => t.id === tableId) || null;
    },
    getTableByName(tableName: string): Table | null {
      return this.tables.find((t: Table) => t.name === tableName) || null;
    },
    getTableIfExists(tableIdOrName: string): Table | null {
      return this.tables.find((t: Table) => t.id === tableIdOrName || t.name === tableIdOrName) || null;
    },
  };
  return base;
}

function buildSourceContext(
  baseId: string,
  tableId: string | undefined,
  table: Table | null
): AirtableSourceContext {
  return {
    baseId,
    tableId: tableId || table?.id || '',
    tableName: table?.name || '',
  };
}

function resolveFieldMetadata(
  table: Table | undefined,
  field: Field | string
): { fieldId?: string; fieldName?: string; fieldType?: string } {
  if (typeof field === 'string') {
    const resolved = table?.getFieldIfExists(field);
    if (resolved) {
      return { fieldId: resolved.id, fieldName: resolved.name, fieldType: resolved.type };
    }
    return { fieldName: field };
  }
  return { fieldId: field.id, fieldName: field.name, fieldType: field.type };
}

/**
 * Extract the text value from an Airtable AI field value (aiText, etc.).
 * Returns undefined if the value is not an AI field, null if it is but has no text
 * (empty/loading/error state), or the generated string if available.
 */
export function getAiFieldValue(value: unknown): string | null | undefined {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  const state = obj['state'] ?? obj['stage'];
  if (state === undefined) return undefined;
  if (state === 'generated' && obj['value'] != null) return String(obj['value']);
  return null;
}

function parseDelimitedTextRecords(text: string, delimiter: string): string[][] {
  if (delimiter.length !== 1) {
    throw new Error('Delimited text parser requires a single-character delimiter');
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += char;
        i += 1;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
      i += 1;
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
    } else if (char === '\r') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += char;
      i += 1;
    }
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field in delimited attachment');
  }

  if (field.length > 0 || row.length > 0 || text.endsWith(delimiter)) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Parse delimited attachment text into rows without using eval/new Function.
 *
 * Some popular parsers generate JavaScript at runtime for speed. The preview
 * iframe CSP disallows unsafe-eval, so generated code should use this helper for
 * attachment-backed delimited data.
 */
export function parseDelimitedText(
  text: string,
  options: { delimiter?: string } = {}
): DelimitedTextRow[] {
  const delimiter = options.delimiter ?? ',';
  const records = parseDelimitedTextRecords(text.replace(/^\uFEFF/, ''), delimiter);
  if (records.length === 0) return [];

  const headers = records[0].map((header, index) => header.trim() || `column_${index + 1}`);
  return records.slice(1)
    .filter((record) => record.some((value) => value.trim() !== ''))
    .map((record) => {
      const row: DelimitedTextRow = {};
      const columnCount = Math.max(headers.length, record.length);
      for (let index = 0; index < columnCount; index += 1) {
        const header = headers[index] || `column_${index + 1}`;
        row[header] = record[index] ?? '';
      }
      return row;
    });
}

export function parseCsvText(text: string): CsvRow[] {
  return parseDelimitedText(text, { delimiter: ',' });
}

export function parseTsvText(text: string): DelimitedTextRow[] {
  return parseDelimitedText(text, { delimiter: '\t' });
}

function enhanceRecord(
  recordData: any,
  table?: Table,
  sourceContext: AirtableSourceContext = buildSourceContext(BASE_ID, table?.id, table || null)
): AirtableRecord {
  const record: AirtableRecord = {
    id: recordData.id,
    createdTime: recordData.createdTime,
    fields: recordData.fields || {},
    getCellValue(field: Field | string): unknown {
      if (typeof field === 'string') {
        // Try field name first, then field ID
        return this.fields[field] ?? null;
      }
      // For Field object, try both name and ID
      return this.fields[field.name] ?? this.fields[field.id] ?? null;
    },
    getCellValueAsString(field: Field | string): string {
      const value = this.getCellValue(field);
      if (value == null) return '';
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          return value.map((v: any) => v?.name || String(v)).join(', ');
        }
        const aiText = getAiFieldValue(value);
        if (aiText !== undefined) return aiText ?? '';
        if ('name' in (value as any)) {
          return (value as any).name;
        }
        return JSON.stringify(value);
      }
      return String(value);
    },
    getProvenance(field: Field | string): DataProvenance {
      const rawValue = this.getCellValue(field) as JsonValue;
      const { fieldId, fieldName, fieldType } = resolveFieldMetadata(table, field);
      const source: AirtableDataSource = {
        type: 'airtable',
        baseId: sourceContext.baseId || BASE_ID,
        tableId: sourceContext.tableId,
        tableName: sourceContext.tableName,
        recordId: this.id,
        ...(fieldId ? { fieldId } : {}),
        ...(fieldName ? { fieldName } : {}),
        ...(fieldType ? { fieldType } : {}),
      };

      return {
        id: airtableInspectId(source.baseId, source.tableId, this.id, fieldId, fieldName),
        source,
        rawValue,
        transforms: [],
      };
    },
  };
  return record;
}

// Registers provenance only for committed renders. The caller memoizes provenance,
// so re-running this effect when provenance changes keeps registry content fresh
// while still cleaning up the previously mounted ID correctly.
function useInspectRegistration(provenance: DataProvenance | null): void {
  useLayoutEffect(() => {
    if (!provenance) return;
    dataInspectorRegistry.mount(provenance);
    return () => dataInspectorRegistry.unmount(provenance.id);
  }, [provenance]);
}

export function useInspectAttrs(
  record: AirtableRecord,
  field: Field | string
): Record<'data-inspect-id', string> | Record<string, never> {
  const provenance = useMemo(
    () => (DATA_INSPECT_ENABLED ? record.getProvenance(field) : null),
    [record, field]
  );
  useInspectRegistration(provenance);
  return useMemo(() => (provenance ? inspectIdAttrs(provenance.id) : {}), [provenance]);
}

function resolveTableIdOrName(tableIdOrName: Table | string): string {
  return typeof tableIdOrName === 'string' ? tableIdOrName : tableIdOrName.id;
}

function resolveFieldIdOrName(fieldIdOrName: Field | string): string {
  return typeof fieldIdOrName === 'string' ? fieldIdOrName : fieldIdOrName.id;
}

function getAttachmentId(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): string {
  return options.attachmentId || attachment?.id || '';
}

/**
 * Prefer the signed URL Airtable already returns on the attachment object.
 * The Canvas Labs download proxy is not available outside their runtime.
 */
export function getAttachmentDownloadUrl(
  attachment: AttachmentValue | null | undefined,
  _options: AttachmentProxyOptions
): string {
  if (attachment?.url) return attachment.url;
  throw new Error('Attachment has no download URL. Re-fetch the parent record from Airtable.');
}

export async function fetchAttachmentBlobAsync(
  attachment: AttachmentValue,
  options: AttachmentProxyOptions
): Promise<Blob> {
  const response = await fetch(getAttachmentDownloadUrl(attachment, options));
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const status = `${response.status} ${response.statusText}`.trim();
    throw new Error(`Failed to fetch attachment: ${status}${detail ? ` - ${detail}` : ''}`);
  }
  return response.blob();
}

export async function fetchAttachmentTextAsync(
  attachment: AttachmentValue,
  options: AttachmentProxyOptions
): Promise<string> {
  const blob = await fetchAttachmentBlobAsync(attachment, options);
  return blob.text();
}

export async function createAttachmentObjectUrlAsync(
  attachment: AttachmentValue,
  options: AttachmentProxyOptions
): Promise<string> {
  const blob = await fetchAttachmentBlobAsync(attachment, options);
  return URL.createObjectURL(blob);
}

export function useAttachmentText(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): UseAttachmentTextResult {
  const baseId = options.baseId || BASE_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const fieldIdOrName = resolveFieldIdOrName(options.fieldIdOrName);
  const attachmentId = getAttachmentId(attachment, options);
  const attachmentTextKey = [baseId, tableIdOrName, options.recordId, fieldIdOrName, attachmentId].join('\n');

  const [textState, setTextState] = useState<{ key: string; text: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(attachmentId));
  const [error, setError] = useState<Error | null>(null);

  const text = textState?.key === attachmentTextKey ? textState.text : null;

  useEffect(() => {
    if (!attachmentId) {
      setTextState(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadAttachmentTextAsync() {
      setLoading(true);
      setError(null);

      try {
        const loadedText = await fetchAttachmentTextAsync({ id: attachmentId }, {
          ...options,
          baseId,
          tableIdOrName,
          fieldIdOrName,
          attachmentId,
        });
        if (cancelled) return;
        setTextState({ key: attachmentTextKey, text: loadedText });
      } catch (err) {
        if (cancelled) return;
        setTextState(null);
        setError(err instanceof Error ? err : new Error('Failed to fetch attachment text'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttachmentTextAsync();

    return () => {
      cancelled = true;
    };
  }, [attachmentId, attachmentTextKey, baseId, fieldIdOrName, options.recordId, tableIdOrName]);

  return { text, loading, error };
}

export function useAttachmentObjectUrl(
  attachment: AttachmentValue | null | undefined,
  options: AttachmentProxyOptions
): UseAttachmentObjectUrlResult {
  const baseId = options.baseId || BASE_ID;
  const tableIdOrName = resolveTableIdOrName(options.tableIdOrName);
  const fieldIdOrName = resolveFieldIdOrName(options.fieldIdOrName);
  const attachmentId = getAttachmentId(attachment, options);
  const attachmentUrlKey = [baseId, tableIdOrName, options.recordId, fieldIdOrName, attachmentId].join('\n');

  const [urlState, setUrlState] = useState<{ key: string; url: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(attachmentId));
  const [error, setError] = useState<Error | null>(null);

  const url = urlState?.key === attachmentUrlKey ? urlState.url : null;

  useEffect(() => {
    if (!attachmentId) {
      setUrlState(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadAttachmentAsync() {
      setLoading(true);
      setError(null);

      try {
        // The helper chain only reads `attachment.id`, which is `attachmentId`
        // here. Passing a minimal value keeps the effect from depending on the
        // attachment object identity, so a record refetch with the same content
        // does not trigger a re-fetch and visible flicker.
        const createdUrl = await createAttachmentObjectUrlAsync({ id: attachmentId }, {
          baseId,
          tableIdOrName,
          recordId: options.recordId,
          fieldIdOrName,
          attachmentId,
        });
        if (cancelled) {
          // Cleanup ran before the fetch resolved, so the cleanup branch
          // captured a null objectUrl and will not revoke. Revoke inline.
          URL.revokeObjectURL(createdUrl);
          return;
        }
        objectUrl = createdUrl;
        setUrlState({ key: attachmentUrlKey, url: createdUrl });
      } catch (err) {
        if (!cancelled) {
          setUrlState(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttachmentAsync();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setUrlState((current) => (current?.url === objectUrl ? null : current));
      }
    };
  }, [attachmentId, attachmentUrlKey, baseId, fieldIdOrName, options.recordId, tableIdOrName]);

  return { url, loading, error };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to load the base schema including all tables and fields
 */
export function useBase(baseId: string = BASE_ID): UseBaseResult {
  const [base, setBase] = useState<Base | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!baseId) {
      setLoading(false);
      setError(new Error('No base ID configured'));
      return;
    }

    let cancelled = false;

    async function fetchBase() {
      setLoading(true);
      setError(null);

      try {
        const response = await airtableFetch(`${API_BASE}/meta/bases/${baseId}/tables`);
        if (!response.ok) {
          throw await proxyResponseError(response, 'Failed to fetch base schema');
        }
        const data = await response.json();
        if (!cancelled) {
          setBase(enhanceBase({ id: baseId, name: data.name || baseId, tables: data.tables }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBase();

    return () => {
      cancelled = true;
    };
  }, [baseId]);

  return { base, loading, error };
}

/**
 * Hook to load records from a table
 */
export function useRecords(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string; fields?: string[] }
): UseRecordsResult {
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const fetchRecords = useCallback(async () => {
    if (!baseId || !tableId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rawRecords = await fetchAllRecords(baseId, tableId, options?.fields);
      const sourceContext = buildSourceContext(baseId, tableId, table);
      const enhancedRecords = rawRecords.map((r: any) =>
        enhanceRecord(r, table || undefined, sourceContext)
      );
      setRecords(enhancedRecords);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [baseId, tableId, options?.fields?.join(','), table]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}

/**
 * Hook to create a new record
 */
export function useCreateRecord(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<{ [fieldIdOrName: string]: unknown }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const mutate = useCallback(
    async (fields: { [fieldIdOrName: string]: unknown }): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await airtableFetch(`${API_BASE}/${baseId}/${encodeURIComponent(tableId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });

        if (!response.ok) {
          throw await proxyResponseError(response, 'Failed to create record');
        }

        const data = await response.json();
        return enhanceRecord(data, table || undefined, buildSourceContext(baseId, tableId, table));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, table, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Hook to update an existing record
 */
export function useUpdateRecord(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<{ recordId: string; fields: { [fieldIdOrName: string]: unknown } }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const mutate = useCallback(
    async (data: { recordId: string; fields: { [fieldIdOrName: string]: unknown } }): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await airtableFetch(
          `${API_BASE}/${baseId}/${encodeURIComponent(tableId)}/${data.recordId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: data.fields }),
          }
        );

        if (!response.ok) {
          console.error(response);
          throw await proxyResponseError(response, 'Failed to update record');
        }

        const result = await response.json();
        return enhanceRecord(
          result,
          table || undefined,
          buildSourceContext(baseId, tableId, table)
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, table, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Hook to delete a record
 */
export function useDeleteRecord(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<string> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;

  const mutate = useCallback(
    async (recordId: string): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await airtableFetch(
          `${API_BASE}/${baseId}/${encodeURIComponent(tableId)}/${recordId}`,
          { method: 'DELETE' }
        );

        if (!response.ok) {
          throw await proxyResponseError(response, 'Failed to delete record');
        }

        const data = await response.json();
        return data.deleted ? { id: recordId, deleted: true } as any : null;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, tableId]
  );

  return { mutate, loading, error };
}

/**
 * Hook to upload an attachment to a record's attachment field
 */
export function useUploadAttachment(
  tableOrId: Table | string | null | undefined,
  options?: { baseId?: string }
): MutationResult<{ recordId: string; fieldIdOrName: string; file: File }> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const baseId = options?.baseId || BASE_ID;
  const tableId = typeof tableOrId === 'string' ? tableOrId : tableOrId?.id;
  const table = typeof tableOrId === 'object' ? tableOrId : null;

  const mutate = useCallback(
    async (data: { recordId: string; fieldIdOrName: string; file: File }): Promise<AirtableRecord | null> => {
      if (!baseId || !tableId) {
        setError(new Error('Table not configured'));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Canvas Labs used a custom upload proxy. Standalone: use Airtable Content API
        // via the Vite /api/airtable-content proxy (see vite.config.ts).
        const arrayBuffer = await data.file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const response = await airtableFetch(
          `/api/airtable-content/v0/${baseId}/${data.recordId}/${encodeURIComponent(data.fieldIdOrName)}/uploadAttachment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType: data.file.type || 'application/octet-stream',
              file: base64,
              filename: data.file.name,
            }),
          }
        );

        if (!response.ok) {
          throw await proxyResponseError(response, 'Failed to upload attachment');
        }

        const result = await response.json();
        return enhanceRecord(
          result,
          table || undefined,
          buildSourceContext(baseId, tableId, table)
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [baseId, table, tableId]
  );

  return { mutate, loading, error };
}

// ============================================================================
// Select Field Colors
// ============================================================================

const AIRTABLE_COLOR_MAP: Record<string, {text: string; bg: string}> = {
  blue: {text: '#fff', bg: '#166EE1'},
  blueLight: {text: '#111827', bg: '#A0C6FF'},
  blueLight1: {text: '#111827', bg: '#A0C6FF'},
  blueLight2: {text: '#111827', bg: '#D1E2FF'},
  blueLight3: {text: '#111827', bg: '#F1F5FF'},
  blueDark: {text: '#fff', bg: '#0D52AC'},
  blueDark1: {text: '#fff', bg: '#0D52AC'},
  blueDusty: {text: '#fff', bg: '#0D52AC'},
  cyan: {text: '#111827', bg: '#39CAFF'},
  cyanLight: {text: '#111827', bg: '#88DBFF'},
  cyanLight1: {text: '#111827', bg: '#88DBFF'},
  cyanLight2: {text: '#111827', bg: '#C4ECFF'},
  cyanLight3: {text: '#111827', bg: '#E3FAFD'},
  cyanDark: {text: '#fff', bg: '#0F68A2'},
  cyanDark1: {text: '#fff', bg: '#0F68A2'},
  cyanDusty: {text: '#fff', bg: '#0F68A2'},
  teal: {text: '#111827', bg: '#01DDD5'},
  tealLight: {text: '#111827', bg: '#74EBE1'},
  tealLight1: {text: '#111827', bg: '#74EBE1'},
  tealLight2: {text: '#111827', bg: '#C1F5F0'},
  tealLight3: {text: '#111827', bg: '#E4FBFB'},
  tealDark: {text: '#fff', bg: '#17726E'},
  tealDark1: {text: '#fff', bg: '#17726E'},
  tealDusty: {text: '#fff', bg: '#17726E'},
  green: {text: '#fff', bg: '#048A0E'},
  greenLight: {text: '#111827', bg: '#9AE095'},
  greenLight1: {text: '#111827', bg: '#9AE095'},
  greenLight2: {text: '#111827', bg: '#CFF5D1'},
  greenLight3: {text: '#111827', bg: '#E6FCE8'},
  greenDark: {text: '#fff', bg: '#006400'},
  greenDark1: {text: '#fff', bg: '#006400'},
  greenDusty: {text: '#fff', bg: '#006400'},
  yellow: {text: '#111827', bg: '#FFBA05'},
  yellowLight: {text: '#111827', bg: '#FFD66B'},
  yellowLight1: {text: '#111827', bg: '#FFD66B'},
  yellowLight2: {text: '#111827', bg: '#FFEAB6'},
  yellowLight3: {text: '#111827', bg: '#FFF6DD'},
  yellowDark: {text: '#fff', bg: '#AF6002'},
  yellowDark1: {text: '#fff', bg: '#AF6002'},
  yellowDusty: {text: '#fff', bg: '#AF6002'},
  orange: {text: '#fff', bg: '#D54401'},
  orangeLight: {text: '#111827', bg: '#FFB68E'},
  orangeLight1: {text: '#111827', bg: '#FFB68E'},
  orangeLight2: {text: '#111827', bg: '#FFE0CC'},
  orangeLight3: {text: '#111827', bg: '#FFECE3'},
  orangeDark: {text: '#fff', bg: '#AA2D00'},
  orangeDark1: {text: '#fff', bg: '#AA2D00'},
  orangeDusty: {text: '#fff', bg: '#AA2D00'},
  red: {text: '#fff', bg: '#DC043B'},
  redLight: {text: '#111827', bg: '#FFA6C1'},
  redLight1: {text: '#111827', bg: '#FFA6C1'},
  redLight2: {text: '#111827', bg: '#FFD4E0'},
  redLight3: {text: '#111827', bg: '#FFF2FA'},
  redDark: {text: '#fff', bg: '#B10F41'},
  redDark1: {text: '#fff', bg: '#B10F41'},
  redDusty: {text: '#fff', bg: '#B10F41'},
  pink: {text: '#fff', bg: '#DD04A8'},
  pinkLight: {text: '#111827', bg: '#F797EF'},
  pinkLight1: {text: '#111827', bg: '#F797EF'},
  pinkLight2: {text: '#111827', bg: '#FAD2FC'},
  pinkLight3: {text: '#111827', bg: '#FFF1FF'},
  pinkDark: {text: '#fff', bg: '#AB0A83'},
  pinkDark1: {text: '#fff', bg: '#AB0A83'},
  pinkDusty: {text: '#fff', bg: '#AB0A83'},
  purple: {text: '#fff', bg: '#7C37EF'},
  purpleLight: {text: '#111827', bg: '#BFAEFC'},
  purpleLight1: {text: '#111827', bg: '#BFAEFC'},
  purpleLight2: {text: '#111827', bg: '#E0DAFD'},
  purpleLight3: {text: '#111827', bg: '#FCF3FF'},
  purpleDark: {text: '#fff', bg: '#6231AE'},
  purpleDark1: {text: '#fff', bg: '#6231AE'},
  purpleDusty: {text: '#fff', bg: '#6231AE'},
  gray: {text: '#fff', bg: '#616670'},
  grayLight: {text: '#111827', bg: '#C4C7CD'},
  grayLight1: {text: '#111827', bg: '#C4C7CD'},
  grayLight2: {text: '#111827', bg: '#E5E9F0'},
  grayLight3: {text: '#111827', bg: '#F2F4F8'},
  grayDark: {text: '#fff', bg: '#41454D'},
  grayDark1: {text: '#fff', bg: '#41454D'},
  grayDusty: {text: '#fff', bg: '#41454D'},
};

/**
 * Maps an Airtable named color string to inline style values for a chip/pill.
 * Use this when rendering single-select or multi-select options.
 */
export function airtableSelectStyle(color: string | undefined): {color: string; backgroundColor: string} {
  const entry = color ? (AIRTABLE_COLOR_MAP[color] ?? null) : null;
  return entry
    ? {color: entry.text, backgroundColor: entry.bg}
    : {color: '#111827', backgroundColor: '#e5e7eb'};
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Simple cell renderer for common field types
 */
export function CellRenderer({ record, field }: { record: AirtableRecord; field: Field | string }): React.JSX.Element {
  const value = record.getCellValue(field);
  const fieldObj = typeof field === 'object' ? field : null;
  const fieldType = fieldObj?.type || 'unknown';
  const provenance = useMemo(
    () => (DATA_INSPECT_ENABLED ? record.getProvenance(field) : null),
    [record, field]
  );
  useInspectRegistration(provenance);
  const attrs = provenance ? inspectIdAttrs(provenance.id) : {};

  if (value == null) {
    return <span {...attrs} className="text-gray-400">-</span> as React.JSX.Element;
  }

  // Rich text fields — value is a markdown string
  if (fieldType === 'richText' && typeof value === 'string') {
    return <div {...attrs} className="prose prose-sm max-w-none"><ReactMarkdown>{value}</ReactMarkdown></div> as React.JSX.Element;
  }

  // AI text fields — value is { state, value, isStale? }; content may be markdown
  if (fieldType === 'aiText') {
    const aiText = getAiFieldValue(value);
    if (typeof aiText === 'string') {
      return <div {...attrs} className="prose prose-sm max-w-none"><ReactMarkdown>{aiText}</ReactMarkdown></div> as React.JSX.Element;
    }
    return <span {...attrs} className="text-gray-400">-</span> as React.JSX.Element;
  }

  // Linked records - render resolved names as pills
  if (fieldType === 'multipleRecordLinks' && Array.isArray(value)) {
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {(value as any[]).map((item, i) => {
          const displayName = typeof item === 'string' ? item : (item?.name || item?.id || String(item));
          return (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {displayName}
            </span>
          );
        })}
      </div>
    ) as React.JSX.Element;
  }

  // Single select - value is a string (choice name); look up color from field schema
  if (fieldType === 'singleSelect' && typeof value === 'string') {
    const choice = fieldObj?.options?.choices?.find(c => c.name === value);
    return (
      <span
        {...attrs}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
        style={airtableSelectStyle(choice?.color)}
      >
        {value}
      </span>
    ) as React.JSX.Element;
  }

  // Multiple selects - value is string[] (choice names); look up colors from field schema
  if (fieldType === 'multipleSelects' && Array.isArray(value)) {
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {(value as string[]).map((name, i) => {
          const choice = fieldObj?.options?.choices?.find(c => c.name === name);
          return (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={airtableSelectStyle(choice?.color)}
            >
              {name}
            </span>
          );
        })}
      </div>
    ) as React.JSX.Element;
  }

  // Collaborator
  if ((fieldType === 'singleCollaborator' || fieldType === 'multipleCollaborators') && value) {
    const collaborators = Array.isArray(value) ? value : [value];
    return (
      <div {...attrs} className="flex flex-wrap gap-1">
        {collaborators.map((c: any, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {c.name || c.email || 'User'}
          </span>
        ))}
      </div>
    ) as React.JSX.Element;
  }

  // Checkbox
  if (fieldType === 'checkbox') {
    return <span {...attrs}>{value ? '✓' : ''}</span> as React.JSX.Element;
  }

  // URL
  if (fieldType === 'url' && typeof value === 'string') {
    return (
      <a {...attrs} href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {value}
      </a>
    ) as React.JSX.Element;
  }

  // Email
  if (fieldType === 'email' && typeof value === 'string') {
    return (
      <a {...attrs} href={`mailto:${value}`} className="text-blue-600 hover:underline">
        {value}
      </a>
    ) as React.JSX.Element;
  }

  // Default: render as string
  return <span {...attrs}>{record.getCellValueAsString(field)}</span> as React.JSX.Element;
}

export function DataValue({
  provenance,
  children,
  className,
  as: Component = 'span',
}: {
  provenance: DataProvenance;
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}): React.JSX.Element {
  useInspectRegistration(DATA_INSPECT_ENABLED ? provenance : null);
  return React.createElement(
    Component,
    {...(DATA_INSPECT_ENABLED ? inspectIdAttrs(provenance.id) : {}), className},
    children
  );
}

// ============================================================================
// Safe Field Access Helpers
// ============================================================================

/**
 * Safely get choices from a select field
 */
export function getFieldChoices(field: Field | null | undefined): SelectChoice[] {
  return (field?.options?.choices as SelectChoice[]) || [];
}

/**
 * Get a linked record's IDs from a cell value
 */
export function getLinkedRecordIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v: any) => (typeof v === 'string' ? v : v?.id))
    .filter((id): id is string => typeof id === 'string');
}

/**
 * Get select field value as string (handles both string and object formats)
 */
export function getSelectValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value) {
    return (value as SelectChoice).name;
  }
  return null;
}

// ============================================================================
// Current User
// ============================================================================

/** Identity of the signed-in viewer. The `id` is the Airtable user ID
 *  (matches CollaboratorValue.id) so apps can compare against collaborator
 *  field values directly. */
export interface CurrentUser {
  id: string | null;
  email: string;
  name: string | null;
}

export interface UseCurrentUserResult {
  currentUser: CurrentUser | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Returns the identity of the person viewing the app (email, name, Airtable user ID).
 * Use this to filter records by viewer, show/hide UI based on roles looked up
 * from an Airtable table, or personalise content per viewer.
 *
 * Returns `{ currentUser: null }` for viewers whose identity isn't available —
 * unauthenticated viewers and public reports (which never expose identity).
 */
export function useCurrentUser(): UseCurrentUserResult {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Canvas Labs used /canvas/api/preview/whoami. Standalone uses Vite env.
      const email = import.meta.env.VITE_DEV_USER_EMAIL as string | undefined;
      if (!email) {
        setCurrentUser(null);
        return;
      }
      setCurrentUser({
        id: (import.meta.env.VITE_DEV_USER_ID as string | undefined) || null,
        email,
        name: (import.meta.env.VITE_DEV_USER_NAME as string | undefined) || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return { currentUser, loading, error, refetch: fetchCurrentUser };
}

// Fields whose value designates *who a record is about* — the viewer can
// legitimately appear in these. Audit fields (createdBy/lastModifiedBy) are
// deliberately excluded: they record who last touched a row, so matching on
// them would mis-identify the viewer as the owner of any row they edited.
const IDENTITY_FIELD_TYPES = new Set([
  'singleCollaborator', 'multipleCollaborators',
]);

/**
 * Find the record in a table that represents the current viewer.
 *
 * Checks every field on each record:
 * - Collaborator fields (assigned/owner, not audit): matches by Airtable user
 *   ID (primary) or email (fallback)
 * - Email fields: matches by email (case-insensitive)
 *
 * Returns the first matching record, or null.
 *
 * Collaborator fields are the reliable identity signal, so ALL records are
 * checked for a collaborator match before any email-field match is considered —
 * otherwise an earlier record whose incidental email column (e.g. "Referred by
 * email") happens to equal the viewer would win over a later record with the
 * real collaborator match. Any `email`-type field is treated as identity-bearing,
 * so a non-identity email column can still produce a false match when no
 * collaborator field matches.
 */
export function findCurrentUserRecord(
  records: AirtableRecord[],
  table: Table,
  currentUser: CurrentUser | null,
): AirtableRecord | null {
  if (!currentUser) return null;
  const emailLower = currentUser.email.toLowerCase();

  const collaboratorFields = table.fields.filter((f) => IDENTITY_FIELD_TYPES.has(f.type));
  const emailFields = table.fields.filter((f) => f.type === 'email');

  // Pass 1: collaborator fields (id, then email) across every record.
  for (const record of records) {
    for (const field of collaboratorFields) {
      const value = record.getCellValue(field);
      if (value == null) continue;
      const collabs = Array.isArray(value) ? value : [value];
      for (const c of collabs) {
        if (c && typeof c === 'object') {
          const cv = c as CollaboratorValue;
          if (
            (currentUser.id && cv.id === currentUser.id) ||
            (cv.email && cv.email.toLowerCase() === emailLower)
          ) {
            return record;
          }
        }
      }
    }
  }

  // Pass 2: fall back to email-type fields only if no collaborator matched.
  for (const record of records) {
    for (const field of emailFields) {
      const str = record.getCellValueAsString(field);
      if (str && str.toLowerCase() === emailLower) return record;
    }
  }

  return null;
}

// ============================================================================
// Exports for backward compatibility
// ============================================================================

export {
  BASE_ID,
  TABLE_IDS,
  PROJECT_ID,
  airtableInspectId,
  dataInspectorRegistry,
  inspectIdAttrs,
  trackAirtableAggregate,
  trackDerivedValue,
  trackTransform,
  type AirtableAggregateDataSource,
  type AirtableDataSource,
  type AggregateFieldMetadata,
  type DataProvenance,
  type DataSource,
  type DataTransform,
  type DerivedDataSource,
};
