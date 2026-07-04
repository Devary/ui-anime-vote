import { Component, OnInit, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character, MultiPoll, MultiPollGroup } from '../../anime-data';
import { VoteStore } from '../../vote.store';
import { CountdownComponent } from '../countdown/countdown.component';

const SEGMENT_COLORS = ['#1565c0', '#c62828', '#2e7d32', '#6a1b9a', '#e65100'];

type GroupStatus = 'open' | 'upcoming' | 'ended' | 'tbd';

/** One node in the knockout tree: a real group, or the synthetic winner slot of flat multi-polls. */
export interface BracketNode {
  group: MultiPollGroup | null;
  children: BracketNode[];
}

/** One participant circle inside a match node; char=null renders the TBD shield. */
export interface BracketSlot {
  char: Character | null;
  isWinner: boolean;
  isMyVote: boolean;
}

@Component({
  selector:    'app-multi-poll-card',
  standalone:  true,
  imports:     [CommonModule, CountdownComponent],
  templateUrl: './multi-poll-card.component.html',
  styleUrl:    './multi-poll-card.component.scss',
})
export class MultiPollCardComponent implements OnInit, OnDestroy {
  readonly poll = input.required<MultiPoll>();

  readonly voteStore = inject(VoteStore);
  private readonly _now = signal(Date.now());
  private _timer?: ReturnType<typeof setInterval>;

  readonly selectedGroupId = signal<string | null>(null);

  constructor() {
    // The carousel may reuse this component instance across consecutive multi-polls,
    // so hydration must key off the poll input, not ngOnInit.
    effect(() => {
      const pollId = this.poll().id;
      untracked(() => {
        this.selectedGroupId.set(null);
        // Hydrate counts + my per-group votes so revisited matches show results and lock voted groups
        this.voteStore.refreshMultiPollResult(pollId);
      });
    });
  }

  ngOnInit()    { this._timer = setInterval(() => this._now.set(Date.now()), 1000); }
  ngOnDestroy() { clearInterval(this._timer); }

  readonly COLORS = SEGMENT_COLORS;

  readonly bgImages = computed(() =>
    this.poll().groups.flatMap(g => g.candidates).map(c => c.image).slice(0, 6)
  );

  private readonly charById = computed(() => {
    const map = new Map<string, Character>();
    for (const g of this.poll().groups) for (const c of g.candidates) map.set(c.id, c);
    return map;
  });

  // ── Group status (open / upcoming / ended / tbd) ──────────────────────────

  readonly groupStatuses = computed((): Map<string, GroupStatus> => {
    const now = this._now();
    const statuses = new Map<string, GroupStatus>();
    for (const g of this.poll().groups) {
      if (!g.resolved) { statuses.set(g.id, 'tbd'); continue; }
      if (!g.startDate) { statuses.set(g.id, 'open'); continue; }
      const start = new Date(g.startDate).getTime();
      const end   = g.endDate ? new Date(g.endDate).getTime() : Infinity;
      statuses.set(g.id, now < start ? 'upcoming' : now > end ? 'ended' : 'open');
    }
    return statuses;
  });

  // ── Knockout tree ─────────────────────────────────────────────────────────

  readonly rootNode = computed<BracketNode>(() => {
    const groups = this.poll().groups;
    const byId = new Map(groups.map(g => [g.id, g]));
    const maxLevel = groups.reduce((m, g) => Math.max(m, g.level ?? 0), 0);

    if (maxLevel === 0) {
      // Flat multi-poll: synthetic winner node fed by every group
      return { group: null, children: groups.map(g => ({ group: g, children: [] })) };
    }

    const build = (g: MultiPollGroup): BracketNode => ({
      group: g,
      children: (g.feederGroupIds ?? [])
        .map(id => byId.get(id))
        .filter((f): f is MultiPollGroup => !!f)
        .map(build),
    });

    const finals = groups.filter(g => g.level === maxLevel);
    return finals.length === 1
      ? build(finals[0])
      : { group: null, children: finals.map(build) };
  });

  readonly leftChildren = computed(() => {
    const c = this.rootNode().children;
    return c.slice(0, Math.ceil(c.length / 2));
  });

  readonly rightChildren = computed(() => {
    const c = this.rootNode().children;
    return c.slice(Math.ceil(c.length / 2));
  });

  readonly centerLabel = computed(() => this.rootNode().group ? 'Final' : 'Winner');

  readonly champion = computed<Character | null>(() => {
    const root = this.rootNode();
    if (root.group) {
      return root.group.winnerCharId ? this.charById().get(root.group.winnerCharId) ?? null : null;
    }
    // Flat poll: champion only once every group has a decided winner
    const winners: Character[] = [];
    for (const child of root.children) {
      const id = child.group?.winnerCharId;
      const w = id ? this.charById().get(id) : null;
      if (!w) return null;
      winners.push(w);
    }
    if (winners.length === 0) return null;
    const winnerVotes = new Map(root.children.map(child =>
      [child.group!.winnerCharId!, this.voteStore.getGroupCount(child.group!.id, child.group!.winnerCharId!)]
    ));
    return winners.reduce((best, c) =>
      (winnerVotes.get(c.id) ?? 0) > (winnerVotes.get(best.id) ?? 0) ? c : best
    );
  });

  slotsOf(node: BracketNode): BracketSlot[] {
    const g = node.group;
    if (!g) {
      return node.children.map(child => {
        const id = child.group?.winnerCharId ?? null;
        const char = id ? this.charById().get(id) ?? null : null;
        return { char, isWinner: !!char, isMyVote: false };
      });
    }
    if (g.candidates.length > 0) {
      const myVote = this.voteStore.getMyGroupVote(g.id);
      return g.candidates.map(c => ({
        char: c,
        isWinner: g.winnerCharId === c.id,
        isMyVote: myVote === c.id,
      }));
    }
    // Unresolved bracket round: one TBD shield per feeder
    return (g.feederGroupIds ?? []).map(() => ({ char: null, isWinner: false, isMyVote: false }));
  }

  // ── Vote sheet ────────────────────────────────────────────────────────────

  readonly selectedGroup = computed(() =>
    this.poll().groups.find(g => g.id === this.selectedGroupId()) ?? null
  );

  isOpenable(node: BracketNode): boolean {
    return !!node.group && this.groupStatuses().get(node.group.id) !== 'tbd';
  }

  openGroup(node: BracketNode): void {
    if (this.isOpenable(node)) this.selectedGroupId.set(node.group!.id);
  }

  closeSheet(): void { this.selectedGroupId.set(null); }

  myGroupVote(groupId: string): string | null {
    return this.voteStore.getMyGroupVote(groupId);
  }

  hasVotedInGroup(groupId: string): boolean {
    return this.voteStore.getMyGroupVote(groupId) !== null;
  }

  countOf(char: Character, group: MultiPollGroup): number {
    return this.voteStore.getGroupCount(group.id, char.id);
  }

  groupTotal(group: MultiPollGroup): number {
    return group.candidates.reduce((s, c) => s + this.countOf(c, group), 0);
  }

  pctOf(char: Character, group: MultiPollGroup): number {
    const total = this.groupTotal(group);
    return total > 0
      ? (this.countOf(char, group) / total) * 100
      : 100 / Math.max(group.candidates.length, 1);
  }

  showResults(group: MultiPollGroup): boolean {
    return this.hasVotedInGroup(group.id) || this.groupStatuses().get(group.id) === 'ended';
  }

  onClickCandidate(charId: string, group: MultiPollGroup): void {
    const status = this.groupStatuses().get(group.id);
    if (status !== 'open') return;
    if (this.hasVotedInGroup(group.id)) return;
    this.voteStore.voteMultiGroup(charId, this.poll().id, group.id);
  }
}
