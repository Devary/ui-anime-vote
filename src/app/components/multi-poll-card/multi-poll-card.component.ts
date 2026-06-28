import { Component, OnInit, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MultiPoll, MultiPollGroup } from '../../anime-data';
import { VoteStore } from '../../vote.store';
import { CountdownComponent } from '../countdown/countdown.component';

const SEGMENT_COLORS = ['#1565c0', '#c62828', '#2e7d32', '#6a1b9a', '#e65100'];

type GroupStatus = 'open' | 'upcoming' | 'ended' | 'tbd';

@Component({
  selector:    'app-multi-poll-card',
  standalone:  true,
  imports:     [CommonModule, CountdownComponent],
  templateUrl: './multi-poll-card.component.html',
  styleUrl:    './multi-poll-card.component.scss',
})
export class MultiPollCardComponent implements OnInit, OnDestroy {
  readonly poll     = input.required<MultiPoll>();
  readonly castVote = output<string>();

  readonly voteStore = inject(VoteStore);
  private readonly _now = signal(Date.now());
  private _timer?: ReturnType<typeof setInterval>;

  ngOnInit()    { this._timer = setInterval(() => this._now.set(Date.now()), 1000); }
  ngOnDestroy() { clearInterval(this._timer); }

  // ── Bracket detection ─────────────────────────────────────────────────────

  readonly isBracket = computed(() => this.poll().groups.some(g => g.level > 0));

  readonly groupsByLevel = computed(() => {
    const map = new Map<number, MultiPollGroup[]>();
    for (const g of this.poll().groups) {
      if (!map.has(g.level)) map.set(g.level, []);
      map.get(g.level)!.push(g);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b - a)
      .map(([level, groups]) => ({ level, groups }));
  });

  // ── Vote state ────────────────────────────────────────────────────────────

  readonly bgImages = computed(() =>
    this.poll().groups.flatMap(g => g.candidates).map(c => c.image).slice(0, 6)
  );

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

  myGroupVote(groupId: string): string | null {
    return this.voteStore.getMyGroupVote(groupId);
  }

  hasVotedInGroup(groupId: string): boolean {
    return this.voteStore.getMyGroupVote(groupId) !== null;
  }

  readonly COLORS = SEGMENT_COLORS;

  groupTotal(group: MultiPollGroup): number {
    return group.candidates.reduce((s, c) => s + this.voteStore.getCount(c.id), 0);
  }

  // ── Bracket connectors ────────────────────────────────────────────────────
  readonly bracketConnectors = computed(() => {
    if (!this.isBracket()) return [];
    const levels = this.groupsByLevel();

    return levels.slice(0, -1).map((levelRow, i) => {
      const nextLevel   = levels[i + 1];
      const totalInNext = nextLevel.groups.length;

      return levelRow.groups.map(parentGroup => {
        const n        = parentGroup.feederGroupIds?.length ?? 0;
        const widthPct = totalInNext > 0 && n > 0 ? (n / totalInNext) * 100 : 0;
        const childPct = n > 0 ? (1 / (2 * n)) * 100 : 50;
        return { widthPct, childPct };
      });
    });
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  onClickCandidate(charId: string, group: MultiPollGroup): void {
    const status = this.groupStatuses().get(group.id);
    if (status !== 'open') return;
    if (this.hasVotedInGroup(group.id)) return;

    const pollId  = this.poll().id;
    const groupId = group.id;

    if (this.isBracket()) {
      this.voteStore.voteMultiGroup(charId, pollId, groupId);
    } else {
      this.voteStore.voteMultiGroup(charId, pollId, groupId);
      this.castVote.emit(charId);
    }
  }
}
