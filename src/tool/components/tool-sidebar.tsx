'use client';

import { buildExpression } from '../tool-definition';
import { describeSchedule } from '../lib/describe';
import { encodeState } from '../lib/permalink';
import type { CronState } from '../types';

export interface ToolSidebarProps {
  state: CronState;
}

/** Sidebar: field summary and permalink. */
export function ToolSidebar({ state }: ToolSidebarProps) {
  const expression = buildExpression(state);
  const description = describeSchedule(state);
  const fieldCount = state.useSeconds ? 6 : 5;
  const permalink =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/?state=${encodeState(state)}&tool=1795183469`;

  return (
    <div className="notepad-sidebar cron-sidebar">
      <div className="sidebar-section">
        <h3>Expression</h3>
        <p className="cron-sidebar-expression" data-testid="sidebar-expression">{expression}</p>
        <p>{description}</p>
        <p className="cron-sidebar-mode">
          {fieldCount}-field mode {state.useSeconds ? '(seconds included)' : '(minutes precision)'}
        </p>
      </div>
      <div className="sidebar-section">
        <h3>Share</h3>
        <p className="cron-sidebar-permalink" data-testid="sidebar-permalink">
          {permalink || 'Permalink available after load'}
        </p>
      </div>
    </div>
  );
}
