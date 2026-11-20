import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { initialState, type CronState } from '../types';
import { cronTool } from '../cron-state';

/** Encode tool state into a permalink `state` parameter value. */
export function encodeState(state: CronState): string {
  return compressToEncodedURIComponent(cronTool.serialize(state));
}

/** Decode a `state` parameter back into tool state, or null when invalid. */
export function decodeState(encoded: string): CronState | null {
  try {
    const serialized = decompressFromEncodedURIComponent(encoded);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    const result = cronTool.deserialize(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Build the full shareable permalink URL for the given state. */
export function buildPermalink(state: CronState): string {
  const url = new URL(window.location.href);
  url.searchParams.set('state', encodeState(state));
  url.searchParams.set('tool', cronTool.id);
  return url.toString();
}

/** Read state from the current URL, or null when absent/invalid. */
export function stateFromLocation(): CronState | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('state');
  if (!encoded) return null;
  const decoded = decodeState(encoded);
  return decoded ?? null;
}

export { initialState };
