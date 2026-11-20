import { describe, it, expect } from 'vitest';
import {
  buildExpression,
  expandField,
  nextRuns,
  validateField,
  validateState,
} from '@/tool/tool-definition';
import { describeSchedule } from '@/tool/lib/describe';
import { encodeState, decodeState } from '@/tool/lib/permalink';
import { initialState, PRESETS, type CronState } from '@/tool/types';

describe('buildExpression', () => {
  it('produces a 5-field expression by default', () => {
    expect(buildExpression(initialState)).toBe('*/5 * * * *');
  });

  it('produces a 6-field expression when seconds are enabled', () => {
    const state = { ...initialState, useSeconds: true, seconds: '30' };
    expect(buildExpression(state)).toBe('30 */5 * * * *');
  });
});

describe('serialize/deserialize round-trip', () => {
  it('round-trips through the permalink codec', () => {
    const state: CronState = {
      seconds: '15',
      minute: '0',
      hour: '9',
      dayOfMonth: '1',
      month: '*',
      dayOfWeek: '1-5',
      useSeconds: true,
    };
    const encoded = encodeState(state);
    const decoded = decodeState(encoded);
    expect(decoded).toEqual(state);
  });

  it('returns null for garbage input', () => {
    expect(decodeState('not-a-real-state!!!')).toBeNull();
  });
});

describe('validation', () => {
  it('rejects minute 60', () => {
    const issue = validateField('minute', '60');
    expect(issue).not.toBeNull();
    expect(issue?.message).toContain('out of range');
  });

  it('accepts every valid minute literal', () => {
    expect(validateField('minute', '0')).toBeNull();
    expect(validateField('minute', '59')).toBeNull();
  });

  it('rejects empty fields', () => {
    expect(validateField('hour', '')).not.toBeNull();
  });

  it('rejects a bad step', () => {
    expect(validateField('minute', '*/0')).not.toBeNull();
  });

  it('warns about Feb 30', () => {
    const state: CronState = {
      ...initialState,
      minute: '0',
      hour: '0',
      dayOfMonth: '30',
      month: '2',
    };
    const issues = validateState(state);
    expect(issues.some((i) => i.message.includes('does not exist'))).toBe(true);
    const runs = nextRuns(state, 1, new Date('2026-01-01T00:00:00Z'));
    expect(runs).toHaveLength(0);
  });

  it('accepts Feb 29', () => {
    const state: CronState = {
      ...initialState,
      minute: '0',
      hour: '0',
      dayOfMonth: '29',
      month: '2',
    };
    expect(validateState(state).some((i) => i.field === 'dayOfMonth')).toBe(false);
  });

  it('warns when both day fields are restricted', () => {
    const state = { ...initialState, dayOfMonth: '1', dayOfWeek: '1' };
    expect(validateState(state).some((i) => i.field === 'expression')).toBe(true);
  });

  it('accepts day-of-week 7 as Sunday', () => {
    expect(validateField('dayOfWeek', '7')).toBeNull();
  });
});

describe('next run calculation', () => {
  it('computes daily 09:30 correctly', () => {
    const state: CronState = {
      ...initialState,
      minute: '30',
      hour: '9',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    };
    const runs = nextRuns(state, 5, new Date('2026-11-20T00:00:00'));
    expect(runs[0]).toEqual(new Date(2026, 10, 20, 9, 30, 0));
    expect(runs[1]).toEqual(new Date(2026, 10, 21, 9, 30, 0));
    expect(runs).toHaveLength(5);
    for (let i = 1; i < runs.length; i += 1) {
      const prev = runs[i - 1];
      const curr = runs[i];
      expect(prev).toBeDefined();
      expect(curr).toBeDefined();
      if (prev && curr) expect(curr.getTime()).toBeGreaterThan(prev.getTime());
    }
  });

  it('computes every-5-minutes runs', () => {
    const state: CronState = { ...initialState, minute: '*/5', hour: '*' };
    const runs = nextRuns(state, 3, new Date(2026, 10, 20, 10, 2, 0));
    expect(runs[0]).toEqual(new Date(2026, 10, 20, 10, 5, 0));
    expect(runs[1]).toEqual(new Date(2026, 10, 20, 10, 10, 0));
    expect(runs[2]).toEqual(new Date(2026, 10, 20, 10, 15, 0));
  });

  it('computes hourly runs at minute 0', () => {
    const state: CronState = { ...initialState, minute: '0', hour: '*' };
    const runs = nextRuns(state, 2, new Date(2026, 10, 20, 10, 30, 0));
    expect(runs[0]).toEqual(new Date(2026, 10, 20, 11, 0, 0));
    expect(runs[1]).toEqual(new Date(2026, 10, 20, 12, 0, 0));
  });

  it('computes weekly Monday runs', () => {
    const state: CronState = { ...initialState, minute: '0', hour: '8', dayOfWeek: '1' };
    const runs = nextRuns(state, 2, new Date(2026, 10, 20, 12, 0, 0)); // Friday
    expect(runs[0]?.getDay()).toBe(1);
    expect(runs[0]).toEqual(new Date(2026, 10, 23, 8, 0, 0));
  });

  it('computes monthly first-day runs', () => {
    const state: CronState = { ...initialState, minute: '0', hour: '0', dayOfMonth: '1' };
    const runs = nextRuns(state, 2, new Date(2026, 10, 20, 12, 0, 0));
    expect(runs[0]).toEqual(new Date(2026, 11, 1, 0, 0, 0));
    expect(runs[1]).toEqual(new Date(2027, 0, 1, 0, 0, 0));
  });

  it('honors ranges in hours', () => {
    const state: CronState = { ...initialState, minute: '0', hour: '9-17' };
    const runs = nextRuns(state, 2, new Date(2026, 10, 20, 12, 30, 0));
    expect(runs[0]).toEqual(new Date(2026, 10, 20, 13, 0, 0));
    expect(runs[1]).toEqual(new Date(2026, 10, 20, 14, 0, 0));
  });

  it('computes second-granularity runs in 6-field mode', () => {
    const state: CronState = {
      ...initialState,
      useSeconds: true,
      seconds: '*/30',
      minute: '*',
      hour: '*',
    };
    const runs = nextRuns(state, 2, new Date(2026, 10, 20, 10, 0, 5));
    expect(runs[0]).toEqual(new Date(2026, 10, 20, 10, 0, 30));
    expect(runs[1]).toEqual(new Date(2026, 10, 20, 10, 1, 0));
  });
});

describe('presets', () => {
  it('produce canonical expressions', () => {
    const cases: Record<string, string> = {
      'every-minute': '* * * * *',
      'every-5-minutes': '*/5 * * * *',
      'every-15-minutes': '*/15 * * * *',
      hourly: '0 * * * *',
      'daily-930': '30 9 * * *',
      'weekdays-9': '0 9 * * 1-5',
      'weekly-monday': '0 8 * * 1',
      'monthly-first': '0 0 1 * *',
    };
    for (const preset of PRESETS) {
      expect(cases[preset.id]).toBeDefined();
      const expression = buildExpression({ ...preset.fields, useSeconds: false });
      expect(expression).toBe(cases[preset.id]);
    }
  });

  it('every preset is valid', () => {
    for (const preset of PRESETS) {
      expect(validateState({ ...preset.fields, useSeconds: false })).toHaveLength(0);
    }
  });
});

describe('expandField', () => {
  it('expands *', () => {
    const vals = expandField('*', 0, 5);
    expect(vals).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('expands steps', () => {
    expect(expandField('*/2', 0, 6)).toEqual([0, 2, 4, 6]);
  });

  it('expands ranges', () => {
    expect(expandField('2-4', 1, 31)).toEqual([2, 3, 4]);
  });

  it('maps 7 to Sunday', () => {
    expect(expandField('7', 0, 7)).toEqual([0]);
    expect(expandField('0,6,7', 0, 7)).toEqual([0, 6]);
  });

  it('expands lists', () => {
    expect(expandField('1,15', 0, 59)).toEqual([1, 15]);
  });
});

describe('describeSchedule', () => {
  it('describes every-5-minutes', () => {
    expect(describeSchedule(initialState)).toBe('Every 5 minutes');
  });
  it('describes daily 09:30', () => {
    const state = { ...initialState, minute: '30', hour: '9' };
    expect(describeSchedule(state)).toBe('At 09:30 every day');
  });

  it('describes weekdays', () => {
    const state = { ...initialState, minute: '0', hour: '9', dayOfWeek: '1-5' };
    expect(describeSchedule(state)).toContain('Monday');
    expect(describeSchedule(state)).toContain('Friday');
  });

  it('describes monthly first day', () => {
    const state = { ...initialState, minute: '0', hour: '0', dayOfMonth: '1' };
    expect(describeSchedule(state)).toContain('1st');
  });

  it('describes every minute', () => {
    const state = { ...initialState, minute: '*', hour: '*'};
    expect(describeSchedule(state)).toBe('Every minute');
  });

  it('describes specific months', () => {
    const state = { ...initialState, minute: '0', hour: '0', month: '1' };
    expect(describeSchedule(state)).toContain('January');
  });
});
