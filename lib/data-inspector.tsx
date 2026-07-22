/**
 * Data inspector registry and provenance helpers.
 *
 * This file is copied into generated workspaces as lib/data-inspector.tsx.
 * It intentionally has no React dependency so components/hooks can opt into
 * registration without coupling the registry to React lifecycle semantics.
 */

declare const __DATA_INSPECT_ENABLED__: boolean;

export const DATA_INSPECT_ENABLED =
    typeof __DATA_INSPECT_ENABLED__ !== 'undefined' ? __DATA_INSPECT_ENABLED__ : false;

export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | {
          [key: string]: JsonValue;
      };

export interface DataSource {
    type: string;
    [key: string]: unknown;
}

export interface AirtableDataSource extends DataSource {
    type: 'airtable';
    baseId: string;
    baseName?: string;
    tableId: string;
    tableName: string;
    recordId: string;
    fieldId?: string;
    fieldName?: string;
    fieldType?: string;
}

/**
 * Normalized, serializable field metadata stored on aggregate provenance.
 * This is the payload shape consumed by the parent inspector.
 */
export interface AggregateFieldMetadata {
    fieldId?: string;
    fieldName?: string;
    fieldType?: string;
}

export interface DerivedDataSource extends DataSource {
    type: 'derived';
    label?: string;
    inputs: DataProvenance[];
}

export interface AirtableAggregateDataSource extends DataSource {
    type: 'airtableAggregate';
    baseId?: string;
    tableId: string;
    tableName: string;
    fields: AggregateFieldMetadata[];
    recordCount: number;
    label?: string;
    filterDescription?: string;
}

export interface DataTransform {
    type: string;
    description: string;
    expression?: string;
}

export interface DataProvenance {
    id: string;
    source: DataSource;
    rawValue: JsonValue;
    displayValue?: JsonValue;
    transforms: DataTransform[];
}

interface RegistryEntry {
    provenance: DataProvenance;
    refCount: number;
}

export interface DataInspectorRegistry {
    mount(provenance: DataProvenance): void;
    unmount(id: string): void;
    get(id: string): DataProvenance | null;
    getAll(): DataProvenance[];
    clear(): void;
    readonly size: number;
}

type InspectGlobal = typeof globalThis & {
    __DATA_INSPECTOR__?: DataInspectorRegistry;
};

function createRegistry(): DataInspectorRegistry {
    const entries = new Map<string, RegistryEntry>();

    return {
        // Ref-counted: the same deterministic ID can be mounted by multiple components
        // (e.g., a field shown in both a summary card and a detail view).
        mount(provenance: DataProvenance): void {
            if (!DATA_INSPECT_ENABLED) return;
            const existing = entries.get(provenance.id);
            if (existing) {
                existing.provenance = provenance;
                existing.refCount += 1;
                return;
            }
            entries.set(provenance.id, {provenance, refCount: 1});
        },
        unmount(id: string): void {
            if (!DATA_INSPECT_ENABLED) return;
            const existing = entries.get(id);
            if (!existing) return;
            if (existing.refCount <= 1) {
                entries.delete(id);
                return;
            }
            existing.refCount -= 1;
        },
        get(id: string): DataProvenance | null {
            return entries.get(id)?.provenance ?? null;
        },
        getAll(): DataProvenance[] {
            return Array.from(entries.values(), (entry) => entry.provenance);
        },
        clear(): void {
            entries.clear();
        },
        get size(): number {
            return entries.size;
        },
    };
}

const inspectGlobal = globalThis as InspectGlobal;

export const dataInspectorRegistry =
    inspectGlobal.__DATA_INSPECTOR__ ?? (inspectGlobal.__DATA_INSPECTOR__ = createRegistry());

export function airtableInspectId(
    baseId: string,
    tableId: string,
    recordId: string,
    fieldId?: string,
    fieldName?: string,
): string {
    return `airtable:${baseId}:${tableId}:${recordId}:${fieldId ?? fieldName ?? 'value'}`;
}

export function inspectIdAttrs(
    id: string,
): Record<'data-inspect-id', string> | Record<string, never> {
    if (!DATA_INSPECT_ENABLED || !id) return {};
    return {'data-inspect-id': id};
}

function stableSerializeJsonValue(value: JsonValue | undefined): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerializeJsonValue(item)).join(',')}]`;
    }

    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
        .map(([key, item]) => `${JSON.stringify(key)}:${stableSerializeJsonValue(item)}`)
        .join(',')}}`;
}

function stableSerializeTransforms(transforms: DataTransform[]): string {
    return `[${transforms
        .map((transform) =>
            stableSerializeJsonValue({
                type: transform.type,
                description: transform.description,
                ...(transform.expression !== undefined ? {expression: transform.expression} : {}),
            }),
        )
        .join(',')}]`;
}

function stableSerializeUnknown(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerializeUnknown(item)).join(',')}]`;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
            a.localeCompare(b),
        );
        return `{${entries
            .map(([key, item]) => `${JSON.stringify(key)}:${stableSerializeUnknown(item)}`)
            .join(',')}}`;
    }
    return String(value);
}

function hashString(value: string): string {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

/**
 * Flexible field references accepted by aggregate helpers.
 * Generated code commonly passes a field name string, while table metadata can
 * return either Airtable-like Field objects ({id, name, type}) or normalized
 * aggregate metadata ({fieldId, fieldName, fieldType}).
 */
type AggregateFieldInput =
    | string
    | (AggregateFieldMetadata & {id?: string; name?: string; type?: string});

type ProvenanceRecord = {
    id: string;
    getProvenance(field: string): DataProvenance;
};

type ProvenanceTable = {
    id: string;
    name: string;
    getFieldIfExists?: (fieldIdOrName: string) => AggregateFieldInput | null;
};

function sourceHasAirtableShape(source: DataSource): source is AirtableDataSource {
    return source.type === 'airtable';
}

function fieldFromProvenance(provenance: DataProvenance): AggregateFieldMetadata | null {
    if (!sourceHasAirtableShape(provenance.source)) return null;
    const {fieldId, fieldName, fieldType} = provenance.source;
    if (!fieldId && !fieldName) return null;
    return {
        ...(fieldId ? {fieldId} : {}),
        ...(fieldName ? {fieldName} : {}),
        ...(fieldType ? {fieldType} : {}),
    };
}

function fieldFromTable(table: ProvenanceTable, field: AggregateFieldInput): AggregateFieldMetadata {
    if (typeof field !== 'string') {
        return {
            ...(field.fieldId || field.id ? {fieldId: field.fieldId ?? field.id} : {}),
            ...(field.fieldName || field.name ? {fieldName: field.fieldName ?? field.name} : {}),
            ...(field.fieldType || field.type ? {fieldType: field.fieldType ?? field.type} : {}),
        };
    }

    const resolved = table.getFieldIfExists?.(field);
    if (resolved && typeof resolved !== 'string') {
        return fieldFromTable(table, resolved);
    }
    return {fieldName: typeof resolved === 'string' ? resolved : field};
}

function fieldKeyForRecord(field: AggregateFieldInput): string | null {
    if (typeof field === 'string') return field;
    return field.fieldName ?? field.fieldId ?? field.name ?? field.id ?? null;
}

function provenanceForRecordField(record: ProvenanceRecord, field: AggregateFieldInput): DataProvenance | null {
    const key = fieldKeyForRecord(field);
    return key ? record.getProvenance(key) : null;
}

function uniqueFields(fields: AggregateFieldMetadata[]): AggregateFieldMetadata[] {
    const seen = new Set<string>();
    const result: AggregateFieldMetadata[] = [];
    for (const field of fields) {
        const key = `${field.fieldId ?? ''}:${field.fieldName ?? ''}:${field.fieldType ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(field);
    }
    return result;
}

function findFirstAirtableSource(
    records: ProvenanceRecord[],
    fields: AggregateFieldInput[],
): AirtableDataSource | null {
    for (const record of records) {
        for (const field of fields) {
            const source = provenanceForRecordField(record, field)?.source;
            if (source && sourceHasAirtableShape(source)) return source;
        }
    }
    return null;
}

export function trackTransform(
    displayValue: JsonValue,
    provenance: DataProvenance,
    transform: DataTransform,
): DataProvenance {
    const nextTransforms = [...provenance.transforms, transform];
    const fingerprint = hashString(
        `${stableSerializeJsonValue(displayValue)}|${stableSerializeTransforms(nextTransforms)}`,
    );
    return {
        ...provenance,
        id: `${provenance.id}:t${provenance.transforms.length}:${fingerprint}`,
        displayValue,
        transforms: nextTransforms,
    };
}

export function trackDerivedValue(
    displayValue: JsonValue,
    inputs: DataProvenance[],
    transform: DataTransform,
    options?: {label?: string; rawValue?: JsonValue},
): DataProvenance {
    const fingerprint = hashString(
        stableSerializeUnknown({
            displayValue,
            inputIds: inputs.map((input) => input.id),
            label: options?.label,
            transform,
        }),
    );
    return {
        id: `derived:${fingerprint}`,
        source: {
            type: 'derived',
            ...(options?.label ? {label: options.label} : {}),
            inputs,
        } satisfies DerivedDataSource,
        rawValue: options?.rawValue !== undefined ? options.rawValue : displayValue,
        displayValue,
        transforms: [transform],
    };
}

export function trackAirtableAggregate({
    value,
    records,
    table,
    fields,
    transform,
    label,
    filterDescription,
    displayValue,
    baseId,
}: {
    value: JsonValue;
    records: ProvenanceRecord[];
    table: ProvenanceTable;
    fields: AggregateFieldInput[];
    transform: DataTransform;
    label?: string;
    filterDescription?: string;
    displayValue?: JsonValue;
    baseId?: string;
}): DataProvenance {
    const fieldMetadata = uniqueFields(
        fields.map((field) => {
            const provenance = records[0] ? provenanceForRecordField(records[0], field) : null;
            const fromRecord = provenance ? fieldFromProvenance(provenance) : null;
            return fromRecord ?? fieldFromTable(table, field);
        }),
    );
    const firstAirtableSource = findFirstAirtableSource(records, fields);
    const source: AirtableAggregateDataSource = {
        type: 'airtableAggregate',
        ...(baseId || firstAirtableSource?.baseId
            ? {baseId: baseId ?? firstAirtableSource?.baseId}
            : {}),
        tableId: table.id,
        tableName: table.name,
        fields: fieldMetadata,
        recordCount: records.length,
        ...(label ? {label} : {}),
        ...(filterDescription ? {filterDescription} : {}),
    };
    const fingerprint = hashString(
        stableSerializeUnknown({
            value,
            displayValue,
            tableId: table.id,
            fields: fieldMetadata,
            recordIds: records.map((record) => record.id),
            transform,
            label,
            filterDescription,
        }),
    );
    return {
        id: `airtableAggregate:${table.id}:${fingerprint}`,
        source,
        rawValue: value,
        ...(displayValue !== undefined ? {displayValue} : {}),
        transforms: [transform],
    };
}
