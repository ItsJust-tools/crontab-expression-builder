import {
  DAY_NAMES,
  FIELD_RANGES,
  MONTH_NAMES,
  type CronState,
} from '../types';
import { expandField } from '../tool-definition';

function joinList(items: string[]): string {
  if (items.length === 0) return 'never';
  const first = items[0] ?? '';
  if (items.length === 1) return first;
  const second = items[1] ?? '';
  if (items.length === 2) return `${first} and ${second}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1] ?? first}`;
}

/**
 * Human-readable, single-sentence description of the schedule.
 * Handles the common cron idioms: star, steps, lists, ranges, and literals.
 */
export function describeSchedule(state: CronState): string {
  const time = describeTime(state);
  const dom = state.dayOfMonth.trim();
  const dow = state.dayOfWeek.trim();
  const month = state.month.trim();

  const dateParts: string[] = [];
  if (dom !== '*') {
    dateParts.push(describeDom(dom));
  }
  if (month !== '*') {
    dateParts.push(describeMonth(month));
  }
  if (dow !== '*') {
    dateParts.push(describeDow(dow));
  }

  if (dateParts.length === 0) {
    if (/^Every \d+ minutes$/.test(time) || time === 'Every minute') return time;
    return `${time} every day`;
  }
  const joined = dateParts.join(', ').replace(', and ', ' and ');
  return `${time} on ${joined}`;
}

function describeTime(state: CronState): string {
  const minute = state.minute.trim();
  const hour = state.hour.trim();

  if (minute === '*' && hour === '*') {
    return state.useSeconds ? describeSeconds(state) : 'Every minute';
  }
  if (hour === '*' || hour === '*/1') {
    if (/^\*\/(\d+)$/.test(minute)) {
      const step = Number(minute.slice(2));
      // Pure frequency descriptions never carry a date suffix.
      if (state.dayOfMonth.trim() === '*' && state.month.trim() === '*' && state.dayOfWeek.trim() === '*') {
        return `Every ${step} minutes`;
      }
      return `Every ${step} minutes`; // phrasing stays frequency-first
    }
    if (/^\d+$/.test(minute)) {
      return `At minute ${minute} past every hour`;
    }
    return `At minute “${minute}” past every hour`;
  }
  if (/^\*\/(\d+)$/.test(hour)) {
    const step = Number(hour.slice(2));
    if (/^\d+$/.test(minute)) {
      return `At minute ${minute} past every ${step} hours`;
    }
    return `Every ${step} hours`;
  }
  const hourNum = Number(hour);
  if (Number.isInteger(hourNum) && /^\d+$/.test(minute)) {
    return `At ${pad(hourNum)}:${pad(Number(minute))}`;
  }
  const hours = expandField(hour, FIELD_RANGES.hour.min, FIELD_RANGES.hour.max);
  if (/^\d+$/.test(minute)) {
    return `At minute ${minute} past ${joinList(hours.map((h) => `${pad(h)}:00`))}`;
  }
  return `At “${minute}” minutes past hour(s) ${joinList(hours.map((h) => `${pad(h)}:00`))}`;
}

function describeSeconds(state: CronState): string {
  const sec = state.seconds.trim();
  if (/^\*\/(\d+)$/.test(sec)) {
    return `Every ${Number(sec.slice(2))} seconds`;
  }
  if (/^\d+$/.test(sec)) {
    return `At second ${sec} of every minute`;
  }
  return 'Every minute';
}

function describeDom(dom: string): string {
  if (/^\*\/(\d+)$/.test(dom)) {
    return `every ${Number(dom.slice(2))} days of the month`;
  }
  const days = expandField(dom, FIELD_RANGES.dayOfMonth.min, FIELD_RANGES.dayOfMonth.max);
  return `day ${joinList(days.map((d) => ordinal(d)))} of the month`;
}

function describeMonth(month: string): string {
  if (/^\*\/(\d+)$/.test(month)) {
    return `every ${Number(month.slice(2))} months`;
  }
  const months = expandField(month, FIELD_RANGES.month.min, FIELD_RANGES.month.max);
  return joinList(months.map((m) => MONTH_NAMES[m - 1] ?? ''));
}

function describeDow(dow: string): string {
  if (/^\*\/(\d+)$/.test(dow)) {
    return `every ${Number(dow.slice(2))} days of the week`;
  }
  const days = expandField(dow, FIELD_RANGES.dayOfWeek.min, FIELD_RANGES.dayOfWeek.max);
  return joinList(days.map((d) => DAY_NAMES[d] ?? ''));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n}st`;
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
  return `${n}th`;
}
