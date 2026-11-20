'use client';

import Link from 'next/link';
import { PRESETS, type CronState } from '../types';

export interface ToolToolbarProps {
  state: CronState;
  onChange: (state: CronState) => void;
}

/** Preset schedule buttons plus the shell's Help link. */
export function ToolToolbar({ state, onChange }: ToolToolbarProps) {
  return (
    <div className="notepad-toolbar cron-toolbar" role="toolbar" aria-label="Schedule presets">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="toolbar-btn"
          title={preset.description}
          aria-label={`Preset: ${preset.label}`}
          onClick={() => onChange({ ...preset.fields, useSeconds: state.useSeconds })}
        >
          {preset.label}
        </button>
      ))}
      <Link href="/help" className="toolbar-btn toolbar-help-link" aria-label="Open help page">
        Help
      </Link>
    </div>
  );
}
