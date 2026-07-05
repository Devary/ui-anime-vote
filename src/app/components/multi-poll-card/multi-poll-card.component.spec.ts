import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MultiPollCardComponent } from './multi-poll-card.component';
import { AnimeApiService } from '../../services/anime-api.service';
import { Character, MultiPoll, MultiPollGroup } from '../../anime-data';

const char = (id: string): Character => ({ id, name: id, title: '', anime: '', image: '' });

const group = (id: string, over: Partial<MultiPollGroup> = {}): MultiPollGroup => ({
  id, label: id, level: 0, feederGroupIds: [], resolved: true, candidates: [],
  ...over,
});

function createCard(poll: MultiPoll) {
  const fixture = TestBed.createComponent(MultiPollCardComponent);
  fixture.componentRef.setInput('poll', poll);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('MultiPollCardComponent (knockout tree)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiPollCardComponent],
      providers: [{
        provide: AnimeApiService,
        useValue: {
          getHistory: vi.fn(() => of([])),
          getMultiPollResult: vi.fn(() => of({
            poll: { id: 'mp', anime: '', question: '', groups: [] },
            groups: [], overallWinnerCharId: null, myVotesByGroup: {},
          })),
        },
      }],
    }).compileComponents();
  });

  const bracket: MultiPoll = {
    id: 'mp', type: 'multi', anime: 'x', question: 'q', visibility: 'PUBLIC',
    groups: [
      group('qf1', { candidates: [char('a'), char('b')], winnerCharId: 'a' }),
      group('qf2', { candidates: [char('c'), char('d')] }),
      group('sf',  { level: 1, feederGroupIds: ['qf1', 'qf2'], resolved: false }),
    ],
  };

  it('single-group polls render the simple org chart, not the tree', () => {
    const card = createCard({
      id: 'mp', type: 'multi', anime: 'x', question: 'q',
      groups: [group('g1', { candidates: [char('a'), char('b'), char('c')] })],
    });
    expect(card.isSimple()).toBe(true);
    expect(card.orgNodes()[0].children?.length).toBe(3);
  });

  it('builds the bracket tree from feeder relationships', () => {
    const card = createCard(bracket);
    expect(card.isSimple()).toBe(false);
    const root = card.rootNode();
    expect(root.group?.id).toBe('sf');
    expect(root.children.map(c => c.group?.id)).toEqual(['qf1', 'qf2']);
    expect(card.leftChildren().map(c => c.group?.id)).toEqual(['qf1']);
    expect(card.rightChildren().map(c => c.group?.id)).toEqual(['qf2']);
  });

  it('unresolved rounds render one TBD shield per feeder', () => {
    const card = createCard(bracket);
    const slots = card.slotsOf(card.rootNode());
    expect(slots.length).toBe(2);
    expect(slots.every(s => s.char === null)).toBe(true);
  });

  it('marks the group winner slot with a gold ring', () => {
    const card = createCard(bracket);
    const qf1 = card.rootNode().children[0];
    const slots = card.slotsOf(qf1);
    expect(slots.find(s => s.char?.id === 'a')?.isWinner).toBe(true);
    expect(slots.find(s => s.char?.id === 'b')?.isWinner).toBe(false);
  });

  it('crowns the champion once the final has a winner', () => {
    const decided: MultiPoll = {
      ...bracket,
      groups: [
        group('qf1', { candidates: [char('a'), char('b')], winnerCharId: 'a' }),
        group('qf2', { candidates: [char('c'), char('d')], winnerCharId: 'd' }),
        group('sf',  { level: 1, feederGroupIds: ['qf1', 'qf2'], candidates: [char('a'), char('d')], winnerCharId: 'd' }),
      ],
    };
    const card = createCard(decided);
    expect(card.champion()?.id).toBe('d');
  });

  it('flat multi-group polls get a synthetic Winner root fed by every group', () => {
    const card = createCard({
      id: 'mp', type: 'multi', anime: 'x', question: 'q',
      groups: [
        group('g1', { candidates: [char('a')] }),
        group('g2', { candidates: [char('b')] }),
        group('g3', { candidates: [char('c')] }),
      ],
    });
    const root = card.rootNode();
    expect(root.group).toBeNull();
    expect(root.children.length).toBe(3);
    expect(card.leftChildren().length).toBe(2);
    expect(card.rightChildren().length).toBe(1);
    expect(card.centerLabel()).toBe('poll.winner');
  });
});
