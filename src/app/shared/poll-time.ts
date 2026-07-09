import { MultiPollGroupDto } from '../services/api.types';

export type PollTimeStatus = 'upcoming' | 'live' | 'finished' | 'unknown';

/** Earliest start / latest end across every group of a multi-poll (brackets included). */
export function pollTimeWindow(groups: MultiPollGroupDto[] | undefined | null): { start: Date | null; end: Date | null } {
  const list = groups ?? [];
  const starts = list.map(g => g.startDate ? new Date(g.startDate) : null).filter((d): d is Date => !!d);
  const ends = list.map(g => g.endDate ? new Date(g.endDate) : null).filter((d): d is Date => !!d);
  return {
    start: starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : null,
    end: ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : null,
  };
}

export function pollTimeStatus(groups: MultiPollGroupDto[] | undefined | null, now: Date = new Date()): PollTimeStatus {
  const { start, end } = pollTimeWindow(groups);
  if (end && now > end) return 'finished';
  if (start && now < start) return 'upcoming';
  if (start || end) return 'live';
  return 'unknown';
}

/** e.g. "2d 4h", "45m", "now" — never negative. */
export function humanizeDuration(ms: number): string {
  if (ms <= 0) return 'now';
  const mins = Math.floor(ms / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

/** Human label for a table cell: "Finished", "Starts in 2d 4h", "3h 12m left", or "—". */
export function pollRemainingLabel(groups: MultiPollGroupDto[] | undefined | null, now: Date = new Date()): string {
  const { start, end } = pollTimeWindow(groups);
  const status = pollTimeStatus(groups, now);
  if (status === 'finished') return 'Finished';
  if (status === 'upcoming' && start) return `Starts in ${humanizeDuration(start.getTime() - now.getTime())}`;
  if (end) return `${humanizeDuration(end.getTime() - now.getTime())} left`;
  return '—';
}
