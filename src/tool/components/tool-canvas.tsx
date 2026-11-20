'use client';

import { useMemo } from 'react';
import { buildExpression, nextRuns, validateState } from '../tool-definition';
import { describeSchedule } from '../lib/describe';
import {
  DAY_NAMES,
  FIELD_RANGES,
  MONTH_NAMES,
  type CronFieldName,
  type CronState,
} from '../types';

export interface ToolCanvasProps {
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  state: CronState;
  onChange: (state: CronState) => void;
}

const FIELD_LABELS: Record<CronFieldName, string> = {
  seconds: 'Seconds',
  minute: 'Minutes',
  hour: 'Hours',
  dayOfMonth: 'Day of month',
  month: 'Month',
  dayOfWeek: 'Day of week',
};

/** Point-and-click builder: field editors, expression, description, next runs. */
export function ToolCanvas({ canvasRef, state, onChange }: ToolCanvasProps) {
  const expression = useMemo(() => buildExpression(state), [state]);
  const issues = useMemo(() => validateState(state), [state]);
  const description = useMemo(() => describeSchedule(state), [state]);
  const runs = useMemo(() => nextRuns(state, 5), [state]);

  const copyExpression = async () => {
    try {
      await navigator.clipboard.writeText(expression);
    } catch {
      // Clipboard unavailable (e.g. test env); ignore.
    }
  };

  return (
    <div ref={canvasRef} className="cron-canvas" role="application" aria-label="Cron builder canvas">
      <div className="cron-grid">
        {state.useSeconds && (
          <FieldEditor field="seconds" value={state.seconds} state={state} onChange={onChange} />
        )}
        <FieldEditor field="minute" value={state.minute} state={state} onChange={onChange} />
        <FieldEditor field="hour" value={state.hour} state={state} onChange={onChange} />
        <FieldEditor field="dayOfMonth" value={state.dayOfMonth} state={state} onChange={onChange} />
        <FieldEditor field="month" value={state.month} state={state} onChange={onChange} />
        <FieldEditor field="dayOfWeek" value={state.dayOfWeek} state={state} onChange={onChange} />

        <div className="cron-field cron-field-seconds-toggle">
          <label>
            <input
              type="checkbox"
              checked={state.useSeconds}
              onChange={(e) => onChange({ ...state, useSeconds: e.target.checked })}
            />
            {' '}Include seconds (6-field)
          </label>
        </div>
      </div>

      <section className="cron-result" aria-label="Generated expression">
        <div className="cron-expression-row">
          <code className="cron-expression" data-testid="cron-expression">{expression}</code>
          <button type="button" className="toolbar-btn" onClick={copyExpression} aria-label="Copy expression">
            Copy
          </button>
        </div>
        <p className="cron-description" data-testid="cron-description">{description}</p>
        {issues.length > 0 && (
          <ul className="cron-issues" aria-label="Validation warnings">
            {issues.map((issue, i) => (
              <li key={i} role="alert" className="cron-issue">{issue.message}</li>
            ))}
          </ul>
        )}
        <h3>Next 5 run times</h3>
        {issues.some((i) => i.field !== 'expression') ? (
          <p className="cron-runs-invalid">Fix the warnings above to compute run times.</p>
        ) : (
          <ol className="cron-runs">
            {runs.map((run) => (
              <li key={run.toISOString()}>{formatRun(run)}</li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  state,
  onChange,
}: {
  field: CronFieldName;
  value: string;
  state: CronState;
  onChange: (state: CronState) => void;
}) {
  const { min, max } = FIELD_RANGES[field];
  const options = buildOptions(field, min, max);
  return (
    <div className="cron-field">
      <label htmlFor={`cron-field-${field}`}>{FIELD_LABELS[field]}</label>
      <input
        id={`cron-field-${field}`}
        value={value}
        onChange={(e) => onChange({ ...state, [field]: e.target.value })}
        aria-label={FIELD_LABELS[field]}
        data-testid={`cron-field-${field}`}
        spellCheck={false}
      />
      <div className="cron-chips">
        <button type="button" className="cron-chip" onClick={() => onChange({ ...state, [field]: '*' })}>
          Any
        </button>
        <button
          type="button"
          className="cron-chip"
          onClick={() => onChange({ ...state, [field]: `*/5` })}
        >
          */5
        </button>
        {options.slice(0, 8).map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="cron-chip"
            onClick={() => onChipClick(state, onChange, field, opt)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ChipOption {
  value: number;
  label: string;
}

function buildOptions(field: CronFieldName, min: number, max: number): ChipOption[] {
  if (field === 'month') {
    return MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name.slice(0, 3) }));
  }
  if (field === 'dayOfWeek') {
    return DAY_NAMES.map((name, i) => ({ value: i, label: name.slice(0, 3) }));
  }
  const opts: ChipOption[] = [];
  for (let v = min; v <= Math.min(max, min + 11); v += 1) {
    opts.push({ value: v, label: String(v) });
  }
  return opts;
}

function onChipClick(
  state: CronState,
  onChange: (state: CronState) => void,
  field: CronFieldName,
  opt: ChipOption,
): void {
  if (field === 'hour' && opt.value >= 0 && opt.value <= 23) {
    onChange({ ...state, hour: String(opt.value) });
    return;
  }
  onChange({ ...state, [field]: String(opt.value) });
}

function formatRun(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
