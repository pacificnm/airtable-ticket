import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { AirtableRecord, useInspectAttrs, getLinkedRecordIds } from '../lib/airtable-hooks';
import { STATUS_COLORS, TicketStatus, ServiceLevel } from '../types';

type ZoomLevel = 'day' | 'week' | 'month';

interface GanttTimelineProps {
  tickets: AirtableRecord[];
  serviceLevels: ServiceLevel[];
  onSelectTicket: (record: AirtableRecord) => void;
}

interface TicketBar {
  record: AirtableRecord;
  title: string;
  status: TicketStatus;
  start: Date;
  end: Date;
  slName: string;
}

const ROW_HEIGHT = 32;
const LABEL_WIDTH = 240;
const DAY_MS = 86400000;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function diffDays(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / DAY_MS;
}

function formatHeaderDate(d: Date, zoom: ZoomLevel): string {
  if (zoom === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  if (zoom === 'week') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

function getColumnWidth(zoom: ZoomLevel): number {
  if (zoom === 'month') return 120;
  if (zoom === 'week') return 100;
  return 40;
}

function getStepDays(zoom: ZoomLevel): number {
  if (zoom === 'month') return 30;
  if (zoom === 'week') return 7;
  return 1;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function GanttTimeline({ tickets, serviceLevels, onSelectTicket }: GanttTimelineProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const scrollRef = useRef<any>(null);
  const headerScrollRef = useRef<any>(null);
  const labelRef = useRef<any>(null);

  const bars: TicketBar[] = useMemo(() => {
    return tickets.map(record => {
      const title = record.getCellValueAsString('Title');
      const status = (record.getCellValueAsString('Status') || 'Open') as TicketStatus;
      const createdStr = record.getCellValueAsString('Created Date');
      const dueStr = record.getCellValueAsString('Due Date');
      const slIds = getLinkedRecordIds((record as any).fields?.['Service Levels']);
      const sl = slIds.length > 0 ? serviceLevels.find(s => s.id === slIds[0]) : null;

      const start = createdStr ? startOfDay(new Date(createdStr)) : startOfDay(new Date());

      let end: Date;
      if (dueStr) {
        end = startOfDay(new Date(dueStr));
      } else if (sl) {
        end = new Date(start.getTime() + sl.resolutionHours * 3600000);
      } else {
        end = addDays(start, 7);
      }

      if (end.getTime() <= start.getTime()) {
        end = addDays(start, 1);
      }

      return { record, title, status, start, end, slName: sl?.name || '' };
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tickets, serviceLevels]);

  const { timelineStart, timelineEnd, columns } = useMemo(() => {
    if (bars.length === 0) {
      const now = startOfDay(new Date());
      return {
        timelineStart: addDays(now, -7),
        timelineEnd: addDays(now, 30),
        columns: [] as Date[],
      };
    }

    let earliest = bars[0].start;
    let latest = bars[0].end;
    for (const b of bars) {
      if (b.start < earliest) earliest = b.start;
      if (b.end > latest) latest = b.end;
    }

    const padding = zoom === 'month' ? 30 : zoom === 'week' ? 14 : 7;
    const tStart = addDays(startOfDay(earliest), -padding);
    const tEnd = addDays(startOfDay(latest), padding);

    const step = getStepDays(zoom);
    const cols: Date[] = [];
    let cursor = new Date(tStart);
    while (cursor <= tEnd) {
      cols.push(new Date(cursor));
      cursor = addDays(cursor, step);
    }

    return { timelineStart: tStart, timelineEnd: tEnd, columns: cols };
  }, [bars, zoom]);

  const colWidth = getColumnWidth(zoom);
  const totalWidth = columns.length * colWidth;
  const today = startOfDay(new Date());
  const todayOffset = diffDays(timelineStart, today) / diffDays(timelineStart, timelineEnd) * totalWidth;

  const scrollToToday = useCallback(() => {
    if (scrollRef.current) {
      const targetX = todayOffset - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollLeft = Math.max(0, targetX);
    }
  }, [todayOffset]);

  useEffect(() => {
    scrollToToday();
  }, [scrollToToday, zoom]);

  const handleBodyScroll = (e: any) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
    if (labelRef.current) {
      labelRef.current.scrollTop = e.target.scrollTop;
    }
  };

  if (bars.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <TimelineIcon size={40} className="text-[rgba(202,209,211,0.5)] mb-4" />
        <h3 className="text-[1rem] font-semibold text-semantic-text mb-1.5">No tickets to display</h3>
        <p className="text-[0.875rem] text-[#666666] max-w-[320px] leading-normal">
          Create tickets with dates to see them on the timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-[rgba(202,209,211,0.3)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
            {bars.length} tickets
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={scrollToToday}
            className="px-2 py-1 text-[0.6875rem] font-medium border border-[rgba(202,209,211,0.3)] text-semantic-text hover:bg-[#F5F7F7] transition-colors"
          >
            Today
          </button>
          <div className="flex bg-[#F2F4F8]">
            {(['day', 'week', 'month'] as ZoomLevel[]).map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2.5 py-1 text-[0.6875rem] font-medium capitalize transition-colors ${
                  zoom === z
                    ? 'bg-core_palette-primary-1 text-white'
                    : 'text-[#666666] hover:text-semantic-text'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-shrink-0" style={{ width: LABEL_WIDTH }}>
          <div className="h-[36px] border-b border-r border-[rgba(202,209,211,0.3)] bg-[#F5F7F7] flex items-center px-3">
            <span className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgba(67,82,84,0.5)]">
              Ticket
            </span>
          </div>
          <div
            ref={labelRef}
            className="flex-1 overflow-hidden border-r border-[rgba(202,209,211,0.3)] bg-white"
          >
            <div style={{ height: bars.length * ROW_HEIGHT }}>
              {bars.map((bar, i) => (
                <TicketLabel
                  key={bar.record.id}
                  bar={bar}
                  index={i}
                  onClick={() => onSelectTicket(bar.record)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div
            ref={headerScrollRef}
            className="h-[36px] overflow-hidden border-b border-[rgba(202,209,211,0.3)] bg-[#F5F7F7] flex-shrink-0"
          >
            <div className="flex h-full" style={{ width: totalWidth }}>
              {columns.map((col, i) => {
                const isToday = col.getTime() === today.getTime();
                const weekend = zoom === 'day' && isWeekend(col);
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 flex items-center justify-center border-r border-[rgba(202,209,211,0.15)] ${
                      isToday ? 'bg-[rgba(232,23,23,0.08)]' : weekend ? 'bg-[rgba(202,209,211,0.1)]' : ''
                    }`}
                    style={{ width: colWidth }}
                  >
                    <span className={`text-[0.5625rem] font-medium ${
                      isToday ? 'text-semantic-error font-semibold' : 'text-[rgba(67,82,84,0.5)]'
                    }`}>
                      {formatHeaderDate(col, zoom)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleBodyScroll}
            className="flex-1 overflow-auto"
            tabIndex={0}
          >
            <div className="relative" style={{ width: totalWidth, height: bars.length * ROW_HEIGHT }}>
              {columns.map((col, i) => {
                const weekend = zoom === 'day' && isWeekend(col);
                return (
                  <div
                    key={i}
                    className={`absolute top-0 bottom-0 border-r border-[rgba(202,209,211,0.1)] ${
                      weekend ? 'bg-[rgba(202,209,211,0.06)]' : ''
                    }`}
                    style={{ left: i * colWidth, width: colWidth }}
                  />
                );
              })}

              {todayOffset >= 0 && todayOffset <= totalWidth && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-semantic-error z-10 pointer-events-none"
                  style={{ left: todayOffset }}
                >
                  <div className="absolute -top-0.5 -left-[3px] w-2 h-2 bg-semantic-error" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                </div>
              )}

              {bars.map((bar, i) => (
                <React.Fragment key={bar.record.id}>
                  <div
                    className="absolute left-0 right-0 border-b border-[rgba(202,209,211,0.08)]"
                    style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                  />
                  <GanttBar
                    bar={bar}
                    index={i}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    totalWidth={totalWidth}
                    onClick={() => onSelectTicket(bar.record)}
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketLabel({ bar, index, onClick }: { bar: TicketBar; index: number; onClick: () => void }) {
  const attrs = useInspectAttrs(bar.record, 'Title');
  const colors = STATUS_COLORS[bar.status] || STATUS_COLORS['Open'];

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-3 border-b border-[rgba(202,209,211,0.08)] hover:bg-[#F5F7F7] transition-colors group"
      style={{ height: ROW_HEIGHT }}
    >
      <span
        className="w-1.5 h-1.5 flex-shrink-0"
        style={{ backgroundColor: colors.dot }}
      />
      <span
        {...attrs}
        className="text-[0.6875rem] text-semantic-text truncate group-hover:text-core_palette-primary-1 transition-colors"
      >
        {bar.title}
      </span>
    </button>
  );
}

function GanttBar({
  bar,
  index,
  timelineStart,
  timelineEnd,
  totalWidth,
  onClick,
}: {
  bar: TicketBar;
  index: number;
  timelineStart: Date;
  timelineEnd: Date;
  totalWidth: number;
  onClick: () => void;
}) {
  const totalDays = diffDays(timelineStart, timelineEnd);
  const startOffset = diffDays(timelineStart, bar.start);
  const duration = diffDays(bar.start, bar.end);

  const left = (startOffset / totalDays) * totalWidth;
  const width = Math.max((duration / totalDays) * totalWidth, 8);
  const top = index * ROW_HEIGHT + 6;
  const height = ROW_HEIGHT - 12;

  const colors = STATUS_COLORS[bar.status] || STATUS_COLORS['Open'];

  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="absolute z-[2] transition-shadow hover:shadow-md group cursor-pointer"
        style={{
          left,
          top,
          width,
          height,
          backgroundColor: colors.bg,
          borderLeft: `3px solid ${colors.dot}`,
        }}
        aria-label={`${bar.title} — ${bar.status}`}
      >
        {width > 60 && (
          <span
            className="block px-1.5 text-[0.5625rem] font-medium truncate leading-[20px]"
            style={{ color: colors.text }}
          >
            {bar.title}
          </span>
        )}
      </button>

      {hovered && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: left + width / 2 - 100,
            top: top + height + 4,
          }}
        >
          <div className="bg-core_palette-primary-3 text-white p-2 w-[200px] shadow-lg">
            <p className="text-[0.6875rem] font-semibold truncate">{bar.title}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="inline-block px-1 py-0.5 text-[0.5625rem] font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {bar.status}
              </span>
              {bar.slName && (
                <span className="text-[0.5625rem] text-core_palette-primary-5">
                  {bar.slName}
                </span>
              )}
            </div>
            <div className="mt-1 text-[0.5625rem] text-core_palette-primary-5">
              {bar.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' → '}
              {bar.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TimelineIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
      <path d="M2 11h5v2H2zm16 0h5v2h-5zM9 7h6v2H9zM9 15h6v2H9zM2 5h8v2H2zm14 0h7v2h-7zM2 17h7v2H2zm12 0h9v2h-9z" />
    </svg>
  );
}
