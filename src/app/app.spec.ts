import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { App } from './app';
import { AnimeApiService } from './services/anime-api.service';
import { PollDto, MultiPollAdminDto } from './services/api.types';

const pollDto = (id: string, question: string): PollDto => ({
  id, question, anime: 'One Piece', visibility: 'PUBLIC',
  fighters: [
    { id: 'luffy', name: 'Luffy', title: 'Captain', anime: 'One Piece', imageUrl: '' },
    { id: 'zoro',  name: 'Zoro',  title: 'Swordsman', anime: 'One Piece', imageUrl: '' },
  ],
});

const multiDto = (id: string, question: string): MultiPollAdminDto => ({
  id, question, anime: 'One Piece', visibility: 'PUBLIC',
  groups: [{
    id: id + '-g0', label: 'Group', groupOrder: 0, level: 0,
    feederGroupIds: [], resolved: true, candidates: [],
  }],
});

describe('App', () => {
  let api: {
    getPolls: ReturnType<typeof vi.fn>;
    getMultiPolls: ReturnType<typeof vi.fn>;
    getHistory: ReturnType<typeof vi.fn>;
    getMultiPollResult: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      getPolls:           vi.fn(() => of([pollDto('p1', 'Q1?'), pollDto('p2', 'Q2?')])),
      getMultiPolls:      vi.fn(() => of([multiDto('m1', 'M1?')])),
      getHistory:         vi.fn(() => of([])),
      getMultiPollResult: vi.fn(() => of({ poll: { id: 'm1', anime: '', question: '', groups: [] }, groups: [], overallWinnerCharId: null, myVotesByGroup: {} })),
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AnimeApiService, useValue: api }],
    }).compileComponents();
  });

  it('creates the app and loads polls interleaved with multi-polls', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const app = fixture.componentInstance;
    expect(app.allPolls().map(p => p.id)).toEqual(['p1', 'm1', 'p2']);
    expect(app.currentPoll()?.id).toBe('p1');
  });

  it('jumps to the deep-linked poll from ?p=', async () => {
    history.replaceState(null, '', '?p=m1');
    try {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.currentPoll()?.id).toBe('m1');
    } finally {
      history.replaceState(null, '', location.pathname);
    }
  });

  it('next() skips polls the user already voted in', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const app = fixture.componentInstance;
    // simulate: user voted on m1 → next from p1 should land on p2
    (app as any).voteStore['_myVotes'].set({ m1: 'someChar' });
    app.next();
    expect(app.currentPoll()?.id).toBe('p2');
  });
});
