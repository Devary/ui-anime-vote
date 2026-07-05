import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { VoteStore } from './vote.store';
import { AnimeApiService } from './services/anime-api.service';
import { MultiPollResultDto } from './services/api.types';

const result = (groups: { id: string; candidates: { charId: string; votes: number }[] }[],
                myVotesByGroup: Record<string, string> = {}): MultiPollResultDto => ({
  poll: { id: 'mp1', anime: '', question: '', groups: [] },
  groups: groups.map(g => ({
    id: g.id, label: g.id, level: 0, feederGroupIds: [], resolved: true, groupTotal: 0,
    candidates: g.candidates.map(c => ({ ...c, name: c.charId, imageUrl: '', pct: 0 })),
  })),
  overallWinnerCharId: null,
  myVotesByGroup,
});

describe('VoteStore', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let store: VoteStore;

  beforeEach(() => {
    api = {
      getHistory:          vi.fn(() => of([])),
      castVote:            vi.fn(() => throwError(() => new Error('offline'))),
      changeVote:          vi.fn(() => throwError(() => new Error('offline'))),
      castMultiVote:       vi.fn(() => throwError(() => new Error('offline'))),
      changeMultiVote:     vi.fn(() => throwError(() => new Error('offline'))),
      getPollResult:       vi.fn(() => of()),
      getMultiPollResult:  vi.fn(() => of(result([]))),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AnimeApiService, useValue: api }],
    });
    store = TestBed.inject(VoteStore);
  });

  it('keeps per-group counts when the same character sits in several bracket levels', () => {
    // regression: a character advancing to the next level must not lose its
    // quarter-final count to the (empty) semi-final group
    api['getMultiPollResult'] = vi.fn(() => of(result([
      { id: 'qf1', candidates: [{ charId: 'zoro', votes: 5 }, { charId: 'levi', votes: 2 }] },
      { id: 'sf1', candidates: [{ charId: 'zoro', votes: 0 }] },
    ])));
    store.refreshMultiPollResult('mp1');

    expect(store.getGroupCount('qf1', 'zoro')).toBe(5);
    expect(store.getGroupCount('sf1', 'zoro')).toBe(0);
    expect(store.getGroupCount('qf1', 'levi')).toBe(2);
  });

  it('hydrates my per-group votes from the result payload', () => {
    api['getMultiPollResult'] = vi.fn(() => of(result(
      [{ id: 'g1', candidates: [{ charId: 'luffy', votes: 1 }] }],
      { g1: 'luffy' },
    )));
    store.refreshMultiPollResult('mp1');
    expect(store.getMyGroupVote('g1')).toBe('luffy');
  });

  it('optimistically counts a group vote before the server answers', () => {
    store.voteMultiGroup('luffy', 'mp1', 'g1');
    expect(store.getGroupCount('g1', 'luffy')).toBe(1);
    expect(store.getMyGroupVote('g1')).toBe('luffy');
    expect(store.getMyVote('mp1')).toBe('luffy');
  });

  it('changeMultiVote moves the count between characters within the group', () => {
    store.voteMultiGroup('luffy', 'mp1', 'g1');
    store.changeMultiVote('mp1', 'g1', 'luffy', 'zoro');
    expect(store.getGroupCount('g1', 'luffy')).toBe(0);
    expect(store.getGroupCount('g1', 'zoro')).toBe(1);
    expect(store.getMyGroupVote('g1')).toBe('zoro');
  });
});
