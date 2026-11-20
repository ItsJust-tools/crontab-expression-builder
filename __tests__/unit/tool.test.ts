import { describe, it, expect } from 'vitest';
import { cronTool } from '../../src/tool/cron-state';
import type { CronState } from '../../src/tool/types';

describe('CronTool definition', () => {
  const def = cronTool;

  it('serializes and deserializes round-trip', () => {
    const state: CronState = { ...def.initialState, minute: '30', hour: '9' };
    const json = def.serialize(state);
    const res = def.deserialize(JSON.parse(json));
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(state);
  });

  it('rejects an invalid expression (minute 60)', () => {
    const bad = { ...def.initialState, minute: '60' };
    const res = def.deserialize(bad);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toContain('out of range');
  });

  it('exposes config metadata', () => {
    expect(def.id).toBe('1795183469');
    expect(def.name).toBe('Crontab Expression Builder');
    expect(def.version).toBe('1.0.0');
  });
});
