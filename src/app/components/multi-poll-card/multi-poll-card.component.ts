import { Component, OnInit, OnDestroy, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode } from 'primeng/api';
import { Character, MultiPoll, MultiPollGroup } from '../../anime-data';
import { VoteStore } from '../../vote.store';
import { CountdownComponent } from '../countdown/countdown.component';

export interface BarSegment { name: string; pct: string; color: string; }
export interface GroupBar    { label: string; total: number; segments: BarSegment[]; }

const SEGMENT_COLORS = ['#1565c0', '#c62828', '#2e7d32', '#6a1b9a', '#e65100'];

type GroupStatus = 'open' | 'upcoming' | 'ended' | 'tbd';

@Component({
  selector:    'app-multi-poll-card',
  standalone:  true,
  imports:     [CommonModule, OrganizationChartModule, CountdownComponent],
  templateUrl: './multi-poll-card.component.html',
  styleUrl:    './multi-poll-card.component.scss',
})
export class MultiPollCardComponent implements OnInit, OnDestroy {
  readonly poll     = input.required<MultiPoll>();
  readonly castVote = output<string>(); // only emitted for standard non-bracket polls

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
      .sort(([a], [b]) => a - b)
      .map(([level, groups]) => ({ level, groups }));
  });

  // ── Vote state ────────────────────────────────────────────────────────────

  readonly voted = computed(() => this.voteStore.getMyVote(this.poll().id) !== null);

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

  // ── Standard (non-bracket) result view ───────────────────────────────────

  private groupWinner(group: MultiPollGroup): Character {
    return group.candidates.reduce((best, c) =>
      this.voteStore.getCount(c.id) > this.voteStore.getCount(best.id) ? c : best
    );
  }

  private overallWinner(): Character {
    const all = this.poll().groups.flatMap(g => g.candidates);
    return all.reduce((best, c) =>
      this.voteStore.getCount(c.id) > this.voteStore.getCount(best.id) ? c : best
    );
  }

  readonly COLORS = SEGMENT_COLORS;

  groupTotal(group: MultiPollGroup): number {
    return group.candidates.reduce((s, c) => s + this.voteStore.getCount(c.id), 0);
  }

  readonly orgNodes = computed<TreeNode[]>(() => {
    if (!this.voted() || this.isBracket()) return [];
    const poll   = this.poll();
    const myVote = this.voteStore.getMyVote(poll.id);
    const winner = this.overallWinner();

    const children: TreeNode[] = poll.groups.map(group => {
      const gw = this.groupWinner(group);
      const gt = this.groupTotal(group);
      return {
        expanded: true,
        type:     'group-winner',
        data:     { image: gw.image, name: gw.name, label: group.label, isMyVote: myVote === gw.id },
        children: group.candidates.map((c, ci) => ({
          type: 'candidate',
          data: {
            charId: c.id, image: c.image, name: c.name,
            votes:    this.voteStore.getCount(c.id),
            pct:      gt > 0 ? ((this.voteStore.getCount(c.id) / gt) * 100).toFixed(2) : '0.00',
            color:    SEGMENT_COLORS[ci % SEGMENT_COLORS.length],
            isMyVote: myVote === c.id,
            isWinner: gw.id === c.id,
          },
        }) as TreeNode),
      } as TreeNode;
    });

    return [{ expanded: true, type: 'overall-winner', data: { image: winner.image, name: winner.name }, children }];
  });

  readonly groupBars = computed<GroupBar[]>(() =>
    this.poll().groups.filter(g => g.resolved).map(group => {
      const total = this.groupTotal(group);
      return {
        label: group.label, total,
        segments: group.candidates.map((c, ci) => ({
          name:  c.name,
          pct:   total > 0 ? ((this.voteStore.getCount(c.id) / total) * 100).toFixed(2)
                           : (100 / group.candidates.length).toFixed(2),
          color: SEGMENT_COLORS[ci % SEGMENT_COLORS.length],
        })),
      };
    })
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  onClickCandidate(charId: string, group: MultiPollGroup): void {
    const status = this.groupStatuses().get(group.id);
    if (status !== 'open') return;
    if (this.hasVotedInGroup(group.id)) return;

    const pollId  = this.poll().id;
    const groupId = group.id;

    if (this.isBracket()) {
      // Bracket: vote per group, stay on this poll
      this.voteStore.voteMultiGroup(charId, pollId, groupId);
    } else {
      // Standard multi-poll: single vote for the whole poll
      this.voteStore.voteMultiGroup(charId, pollId, groupId);
      this.castVote.emit(charId); // triggers navigation in app.ts
    }
  }
}
