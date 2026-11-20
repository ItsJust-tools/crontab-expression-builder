import { describe, it, expect } from 'vitest';
import { cronTool } from '@/tool/cron-state';
import { initialState } from '@/tool/types';
import type { CronState } from '@/tool/types';

describe('CronTool logic', () => {
  it('initializes with the default 5-field state', () => {
    expect(cronTool.initialState).toEqual(initialState);
    expect(cronTool.initialState.useSeconds).toBe(false);
  });

  it('exposes the configured tool metadata', () => {
    expect(cronTool.id).toBe('1795183469');
    expect(cronTool.name).toBe('Crontab Expression Builder');
  });
});

describe('CronTool deserialize', () => {
  it('accepts a valid state object', () => {
    const state: CronState = { ...initialState, minute: '30', hour: '9' };
    const result = cronTool.deserialize(state);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(state);
    }
  });

  it('rejects null data', () => {
    const result = cronTool.deserialize(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects non-object data', () => {
    const result = cronTool.deserialize('string');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects an object missing fields', () => {
    const result = cronTool.deserialize({ minute: '*' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects a non-string field value', () => {
    const result = cronTool.deserialize({ ...initialState, minute: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid data');
    }
  });

  it('rejects a non-boolean useSeconds', () => {
    const result = cronTool.deserialize({ ...initialState, useSeconds: 'yes' });
    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range minute', () => {
    const result = cronTool.deserialize({ ...initialState, minute: '60' });
    expect(result.success).toBe(false);
  });

  it('round-trips state through serialize/deserialize', () => {
    const state: CronState = {
      seconds: '30',
      minute: '*/10',
      hour: '9-17',
      dayOfMonth: '1,15',
      month: '1-6',
      dayOfWeek: '1-5',
      useSeconds: true,
    };
    const json = cronTool.serialize(state);
    expect(() => JSON.parse(json)).not.toThrow();
    const result = cronTool.deserialize(JSON.parse(json));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(state);
    }
  });
});
