/**
 * Serializable state for the Crontab Expression Builder.
 * Every field is plain JSON so sessions can be exported, imported, and shared.
 */

/** A cron field value in canonical form (star, step, list, range, or number). */
export type CronFieldValue = string;

export interface CronState {
  /** Minute field (0-59). */
  minute: CronFieldValue;
  /** Hour field (0-23). */
  hour: CronFieldValue;
  /** Day-of-month field (1-31). */
  dayOfMonth: CronFieldValue;
  /** Month field (1-12). */
  month: CronFieldValue;
  /** Day-of-week field (0-7, 0 and 7 both mean Sunday). */
  dayOfWeek: CronFieldValue;
  /** Seconds field (0-59); ignored when `useSeconds` is false. */
  seconds: CronFieldValue;
  /** Whether the 6th (seconds) field is enabled. */
  useSeconds: boolean;
}

export const CRON_FIELDS = [
  'seconds',
  'minute',
  'hour',
  'dayOfMonth',
  'month',
  'dayOfWeek',
] as const;

export type CronFieldName = (typeof CRON_FIELDS)[number];

/** Display ranges for each field, keyed by field name. */
export const FIELD_RANGES: Record<CronFieldName, { min: number; max: number }> = {
  seconds: { min: 0, max: 59 },
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 7 },
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** A named schedule preset that fills all fields at once. */
export interface CronPreset {
  id: string;
  label: string;
  description: string;
  fields: Omit<CronState, 'useSeconds'>;
}

export const PRESETS: CronPreset[] = [
  {
    id: 'every-minute',
    label: 'Every minute',
    description: 'Runs once per minute',
    fields: { seconds: '0', minute: '*', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    id: 'every-5-minutes',
    label: 'Every 5 minutes',
    description: 'Runs every 5 minutes',
    fields: { seconds: '0', minute: '*/5', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    id: 'every-15-minutes',
    label: 'Every 15 minutes',
    description: 'Runs every 15 minutes',
    fields: {
      seconds: '0',
      minute: '*/15',
      hour: '*',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*',
    },
  },
  {
    id: 'hourly',
    label: 'Hourly',
    description: 'Runs at minute 0 of every hour',
    fields: { seconds: '0', minute: '0', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    id: 'daily-930',
    label: 'Daily at 09:30',
    description: 'Runs every day at 09:30',
    fields: { seconds: '0', minute: '30', hour: '9', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
  },
  {
    id: 'weekdays-9',
    label: 'Weekdays at 09:00',
    description: 'Runs Monday to Friday at 09:00',
    fields: { seconds: '0', minute: '0', hour: '9', dayOfMonth: '*', month: '*', dayOfWeek: '1-5' },
  },
  {
    id: 'weekly-monday',
    label: 'Weekly Monday 08:00',
    description: 'Runs every Monday at 08:00',
    fields: { seconds: '0', minute: '0', hour: '8', dayOfMonth: '*', month: '*', dayOfWeek: '1' },
  },
  {
    id: 'monthly-first',
    label: 'Monthly on the 1st at 00:00',
    description: 'Runs on day 1 of every month at midnight',
    fields: { seconds: '0', minute: '0', hour: '0', dayOfMonth: '1', month: '*', dayOfWeek: '*' },
  },
];

export const initialState: CronState = {
  seconds: '0',
  minute: '*/5',
  hour: '*',
  dayOfMonth: '*',
  month: '*',
  dayOfWeek: '*',
  useSeconds: false,
};

/** A single warning explaining why (or whether) a schedule cannot run. */
export interface ValidationIssue {
  field: CronFieldName | 'expression';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** A locally computed upcoming run. */
export interface NextRun {
  date: Date;
}
