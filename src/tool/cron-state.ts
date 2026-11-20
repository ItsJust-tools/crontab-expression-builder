import type { Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import { buildExpression, validateField } from './tool-definition';
import { initialState, type CronFieldName, type CronState } from './types';

type DeserializeResult<T> = { success: true; data: T } | { success: false; error: string };

const FIELD_KEYS: readonly CronFieldName[] = [
  'seconds',
  'minute',
  'hour',
  'dayOfMonth',
  'month',
  'dayOfWeek',
];

type FieldMap = Record<CronFieldName, string> & { useSeconds?: unknown };

function isFieldMap(value: unknown): value is FieldMap {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return FIELD_KEYS.every((key) => typeof v[key] === 'string');
}

/** Validate and normalize an imported or shared payload into CronState. */
export function deserializeCronState(data: unknown): DeserializeResult<CronState> {
  try {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { success: false, error: 'Invalid data format: expected a JSON object' };
    }
    const value = data as Record<string, unknown>;

    if (!isFieldMap(value)) {
      return {
        success: false,
        error:
          'Invalid data format: expected fields { seconds, minute, hour, dayOfMonth, month, dayOfWeek } as strings',
      };
    }
    if (typeof value.useSeconds !== 'boolean') {
      return { success: false, error: 'Invalid data format: "useSeconds" must be a boolean' };
    }

    const state: CronState = {
      seconds: value.seconds,
      minute: value.minute,
      hour: value.hour,
      dayOfMonth: value.dayOfMonth,
      month: value.month,
      dayOfWeek: value.dayOfWeek,
      useSeconds: value.useSeconds,
    };

    for (const key of FIELD_KEYS) {
      if (key === 'seconds' && !state.useSeconds) continue;
      const issue = validateField(key, state[key]);
      if (issue) return { success: false, error: issue.message };
    }

    return { success: true, data: state };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deserialization error';
    return { success: false, error: `Failed to deserialize state: ${message}` };
  }
}

export const cronTool: Tool<CronState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState,
  serialize: (state) => JSON.stringify(state),
  deserialize: (data) => deserializeCronState(data),
  exporters: [
    { format: 'json', loader: () => import('./exporters/json') },
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
