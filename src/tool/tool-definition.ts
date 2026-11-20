import type { Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  CRON_FIELDS,
  FIELD_RANGES,
  initialState,
  type CronFieldName,
  type CronState,
  type ValidationIssue,
} from './types';

type DeserializeResult<T> = { success: true; data: T } | { success: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asField(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.slice(0, 200);
}
/**
 * Validate a single cron field value: '*', steps, ranges, lists, and numbers.
 * Returns an issue when the value can never match.
 */
export function validateField(name: CronFieldName, raw: string): ValidationIssue | null {
  const { min, max } = FIELD_RANGES[name];
  const value = raw.trim();
  if (value === '') {
    return { field: name, message: 'Field must not be empty' };
  }
  const parts = value.split(',');
  for (const part of parts) {
    let body = part.trim();
    let step = 1;
    if (body.includes('/')) {
      const split = body.split('/');
      const range = split[0] ?? body;
      const stepRaw = split[1] ?? '1';
      body = range;
      step = Number(stepRaw);
      if (!Number.isInteger(step) || step < 1) {
        return { field: name, message: `Invalid step "${stepRaw}" in field ${name}` };
      }
    }
    if (body === '*') {
      continue;
    }
    let startStr = body;
    let endStr = body;
    if (body.includes('-')) {
      const dash = body.split('-');
      startStr = dash[0] ?? body;
      endStr = dash[1] ?? body;
    } else if (body.startsWith('*/') || body === '') {
      return { field: name, message: `Invalid value "${part}" in field ${name}` };
    }
    const start = Number(startStr);
    const end = Number(endStr);
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      return { field: name, message: `Invalid number in "${part}" for field ${name}` };
    }
    if (name === 'dayOfWeek' && (start === 7 || end === 7)) {
      // 7 is an alias for Sunday (0); accept it.
      if (start < 0 || start > 7 || end < 0 || end > 7 || end < start) {
        return { field: name, message: `Value out of range 0-7 in "${part}" for field ${name}` };
      }
      continue;
    }
    if (start < min || start > max || end < min || end > max) {
      return {
        field: name,
        message: `Value out of range ${min}-${max} in "${part}" for field ${name}`,
      };
    }
    if (end < start) {
      return { field: name, message: `Range start after end in "${part}" for field ${name}` };
    }
  }
  return null;
}

/** Calendar-aware validation: catches impossible dates such as Feb 30. */
export function validateCalendar(state: CronState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const usesExplicitDays =
    state.dayOfMonth.trim() !== '*' && state.dayOfWeek.trim() !== '*';

  if (state.dayOfMonth.trim() !== '*') {
    // Probe every enabled month: the max requested day must exist in at least one,
    // except February where day 29 also implies leap-year-only scheduling.
    const maxDay = parseMaxValue(state.dayOfMonth);
    const enabledMonths: number[] = [];
    for (let month = 1; month <= 12; month += 1) {
      if (expandField(state.month, 1, 12).includes(month)) enabledMonths.push(month);
    }
    if (maxDay !== null) {
      const impossible = enabledMonths.filter(
        (month) => maxDay > new Date(2021, month, 0).getDate(),
      );
      // Feb 29 is valid cron (leap-year-only schedule); do not flag it.
      const februaryOnly29 =
        maxDay === 29 && impossible.length === 1 && impossible[0] === 2;
      if (impossible.length > 0 && !februaryOnly29) {
        const month = impossible[0] ?? 1;
        const daysInMonth = new Date(2021, month, 0).getDate();
        issues.push({
          field: 'dayOfMonth',
          message: `Day ${maxDay} does not exist in ${monthName(month)} (max ${daysInMonth})`,
        });
      }
    }
  }

  if (usesExplicitDays) {
    issues.push({
      field: 'expression',
      message:
        'Both day-of-month and day-of-week are restricted; most cron daemons run when EITHER matches',
    });
  }
  return issues;
}

function parseMaxValue(field: string): number | null {
  let max: number | null = null;
  for (const part of field.split(',')) {
    const body = part.includes('/') ? (part.split('/')[0] ?? part) : part;
    const range = body === '*' ? null : body.includes('-') ? body.split('-') : [body, body];
    if (!range) continue;
    for (const text of range) {
      const n = Number(text);
      if (!Number.isInteger(n)) continue;
      max = max === null ? n : Math.max(max, n);
    }
  }
  return max;
}

function monthName(month: number): string {
  return new Date(2021, month - 1, 1).toLocaleString('en-US', { month: 'long' });
}

export function validateState(state: CronState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of CRON_FIELDS) {
    if (field === 'seconds' && !state.useSeconds) continue;
    const issue = validateField(field, state[field as keyof CronState] as string);
    if (issue) issues.push(issue);
  }
  if (state.useSeconds) {
    const sec = validateField('seconds', state.seconds);
    if (sec) issues.push(sec);
  }
  issues.push(...validateCalendar(state));
  return issues;
}

/** Build the canonical cron expression (5 or 6 fields) from state. */
export function buildExpression(state: CronState): string {
  const fields = [
    state.useSeconds ? state.seconds.trim() || '0' : null,
    state.minute.trim() || '*',
    state.hour.trim() || '*',
    state.dayOfMonth.trim() || '*',
    state.month.trim() || '*',
    state.dayOfWeek.trim() || '*',
  ].filter((f): f is string => f !== null);
  return fields.join(' ');
}

/** Compute the next `count` run times strictly after `after`, locally. */
export function nextRuns(state: CronState, count: number, after: Date = new Date()): Date[] {
  if (state.useSeconds && validateField('seconds', state.seconds)) return [];
  const matcher = new CronMatcher(buildExpression(state), state.useSeconds);
  const runs: Date[] = [];
  const cursor = new Date(after.getTime());
  const hardStop = after.getTime() + 1000 * 60 * 60 * 24 * 366;
  while (runs.length < count) {
    const next = matcher.nextAfter(cursor);
    if (!next || next.getTime() > hardStop) break;
    runs.push(next);
    cursor.setTime(next.getTime());
  }
  return runs;
}

const STEP = 60 * 1000; // one minute; seconds handled via second scan

class CronMatcher {
  private minutes: number[];
  private hours: number[];
  private daysOfMonth: number[] | null; // null = '*'
  private months: number[];
  private daysOfWeek: number[] | null; // null = '*'
  private seconds: number[];

  constructor(expression: string, useSeconds: boolean) {
    const parts = expression.split(' ');
    // 6-field: seconds minute hour dom month dow; 5-field: minute hour dom month dow
    let sec: string | undefined;
    let minute: string;
    let hour: string;
    let dom: string;
    let month: string;
    let dow: string;
    if (parts.length === 6) {
      [sec, minute, hour, dom, month, dow] = parts as [string, string, string, string, string, string];
    } else {
      [minute, hour, dom, month, dow] = parts as [string, string, string, string, string];
    }
    const domRestricted = dom !== '*';
    const dowRestricted = dow !== '*';
    this.minutes = expandField(minute, 0, 59);
    this.hours = expandField(hour, 0, 23);
    this.months = expandField(month, 1, 12);
    this.seconds = useSeconds && sec !== undefined ? expandField(sec, 0, 59) : [0];
    // Standard cron semantics: DOM and DOW restrict independently; if both are
    // restricted, match when either matches (Vixie cron behavior).
    this.daysOfMonth = domRestricted ? expandField(dom, 1, 31) : null;
    this.daysOfWeek = dowRestricted ? expandField(dow, 0, 6) : null;
  }

  matches(d: Date): boolean {
    if (!this.months.includes(d.getMonth() + 1)) return false;
    if (!this.hours.includes(d.getHours())) return false;
    if (!this.minutes.includes(d.getMinutes())) return false;
    if (!this.seconds.includes(d.getSeconds())) return false;
    return this.dayMatches(d);
  }

  nextAfter(cursor: Date): Date | null {
    // Start at the beginning of the minute following the cursor.
    const d = new Date(cursor.getTime());
    d.setSeconds(0, 0); // begin at the cursor's own minute
    const limit = 525600; // scan at most one year of minutes
    for (let guard = 0; guard < limit; guard += 1) {
      if (this.dayMatches(d)) {
        for (const s of this.seconds) {
          const cand = new Date(d.getTime() + s * 1000);
          if (cand.getTime() > cursor.getTime()) return cand;
        }
      }
      d.setTime(d.getTime() + STEP);
    }
    return null;
  }

  /** Day-level gate shared by match and search loops. */
  private dayMatches(d: Date): boolean {
    if (!this.months.includes(d.getMonth() + 1)) return false;
    if (!this.hours.includes(d.getHours())) return false;
    if (!this.minutes.includes(d.getMinutes())) return false;
    const domOk = this.daysOfMonth === null || this.daysOfMonth.includes(d.getDate());
    const dowOk = this.daysOfWeek === null || this.daysOfWeek.includes(d.getDay());
    if (this.daysOfMonth !== null && this.daysOfWeek !== null) return domOk || dowOk;
    return domOk && dowOk;
  }
}

/** Expand a single cron field into the set of matching integers. */
export function expandField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();
  for (const part of field.split(',')) {
    let body = part.trim();
    let step = 1;
    if (body.includes('/')) {
      const split = body.split('/');
      body = split[0] ?? body;
      step = Math.max(1, Number(split[1] ?? '1') || 1);
    }
    let start = min;
    let end = max;
    if (body !== '*') {
      if (body.includes('-')) {
        const dash = body.split('-');
        start = Number(dash[0]);
        end = Number(dash[1]);
      } else {
        start = Number(body);
        end = start;
      }
    }
    const sundayAlias = min === 0 && max === 7;
    for (let v = start; v <= end; v += step) {
      values.add(sundayAlias ? v % 7 : v);
    }
  }
  return [...values].sort((a, b) => a - b);
}
