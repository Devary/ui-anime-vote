import { pollTimeWindow, pollTimeStatus, humanizeDuration, pollRemainingLabel } from './poll-time';
import { MultiPollGroupDto } from '../services/api.types';

const group = (over: Partial<MultiPollGroupDto> = {}): MultiPollGroupDto => ({
  id: 'g1', label: 'G', groupOrder: 0, level: 0, feederGroupIds: [], resolved: true,
  candidates: [], ...over,
});

describe('poll-time helpers', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('computes the window as earliest start / latest end across groups', () => {
    const groups = [
      group({ startDate: '2026-06-01T00:00:00Z', endDate: '2026-06-10T00:00:00Z' }),
      group({ startDate: '2026-06-05T00:00:00Z', endDate: '2026-06-20T00:00:00Z' }),
    ];
    const { start, end } = pollTimeWindow(groups);
    expect(start?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(end?.toISOString()).toBe('2026-06-20T00:00:00.000Z');
  });

  it('is upcoming before the earliest start', () => {
    const groups = [group({ startDate: '2026-07-01T00:00:00Z', endDate: '2026-07-10T00:00:00Z' })];
    expect(pollTimeStatus(groups, now)).toBe('upcoming');
    expect(pollRemainingLabel(groups, now)).toMatch(/^Starts in/);
  });

  it('is live between start and end', () => {
    const groups = [group({ startDate: '2026-06-01T00:00:00Z', endDate: '2026-06-20T00:00:00Z' })];
    expect(pollTimeStatus(groups, now)).toBe('live');
    expect(pollRemainingLabel(groups, now)).toMatch(/left$/);
  });

  it('is finished after the latest end', () => {
    const groups = [group({ startDate: '2026-05-01T00:00:00Z', endDate: '2026-06-01T00:00:00Z' })];
    expect(pollTimeStatus(groups, now)).toBe('finished');
    expect(pollRemainingLabel(groups, now)).toBe('Finished');
  });

  it('is unknown with no schedule at all (e.g. group-vote flat polls with missing dates)', () => {
    expect(pollTimeStatus([], now)).toBe('unknown');
    expect(pollRemainingLabel([], now)).toBe('—');
  });

  it('humanizes durations into days/hours/minutes, never negative', () => {
    expect(humanizeDuration(-5000)).toBe('now');
    expect(humanizeDuration(30_000)).toBe('0m');
    expect(humanizeDuration(90 * 60_000)).toBe('1h 30m');
    expect(humanizeDuration(50 * 3_600_000)).toBe('2d 2h');
  });
});
