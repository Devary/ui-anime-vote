import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode } from 'primeng/api';
import { Character, MultiPoll, MultiPollGroup } from '../../anime-data';
import { VoteStore } from '../../vote.store';
import { CountdownComponent } from '../countdown/countdown.component';

// Bar segment for a single candidate inside a group bar
export interface BarSegment {
  name:  string;
  pct:   string;
  color: string;
}

export interface GroupBar {
  label:    string;
  total:    number;
  segments: BarSegment[];
}

const SEGMENT_COLORS = [
  '#1565c0', // blue
  '#c62828', // red
  '#2e7d32', // green
  '#6a1b9a', // purple
  '#e65100', // orange
];

@Component({
  selector:    'app-multi-poll-card',
  standalone:  true,
  imports:     [CommonModule, OrganizationChartModule, CountdownComponent],
  templateUrl: './multi-poll-card.component.html',
  styleUrl:    './multi-poll-card.component.scss',
})
export class MultiPollCardComponent {
  readonly poll     = input.required<MultiPoll>();
  readonly castVote = output<string>();

  private readonly voteStore = inject(VoteStore);

  readonly voted = computed(() => this.voteStore.getMyVote(this.poll().id) !== null);

  readonly myVoteCharId = computed(() => this.voteStore.getMyVote(this.poll().id));

  // Candidate with most votes in a group
  private groupWinner(group: MultiPollGroup): Character {
    return group.candidates.reduce((best, c) =>
      this.voteStore.getCount(c.id) > this.voteStore.getCount(best.id) ? c : best
    );
  }

  // Candidate with most votes overall
  private overallWinner(): Character {
    const all = this.poll().groups.flatMap(g => g.candidates);
    return all.reduce((best, c) =>
      this.voteStore.getCount(c.id) > this.voteStore.getCount(best.id) ? c : best
    );
  }

  private groupTotal(group: MultiPollGroup): number {
    return group.candidates.reduce((s, c) => s + this.voteStore.getCount(c.id), 0);
  }

  // PrimeNG OrgChart tree (only shown after voting)
  readonly orgNodes = computed<TreeNode[]>(() => {
    if (!this.voted()) return [];
    const poll   = this.poll();
    const myVote = this.myVoteCharId();
    const winner = this.overallWinner();

    const children = poll.groups.map(group => {
      const gw    = this.groupWinner(group);
      const gt    = this.groupTotal(group);

      const candidateNodes: TreeNode[] = group.candidates.map((c, ci) => ({
        type: 'candidate',
        data: {
          charId:    c.id,
          image:     c.image,
          name:      c.name,
          votes:     this.voteStore.getCount(c.id),
          pct:       gt > 0 ? ((this.voteStore.getCount(c.id) / gt) * 100).toFixed(2) : '0.00',
          color:     SEGMENT_COLORS[ci % SEGMENT_COLORS.length],
          isMyVote:  myVote === c.id,
          isWinner:  gw.id === c.id,
        },
      }));

      return {
        expanded: true,
        type:     'group-winner',
        data:     {
          image:    gw.image,
          name:     gw.name,
          label:    group.label,
          isMyVote: myVote === gw.id,
        },
        children: candidateNodes,
      } as TreeNode;
    });

    return [{
      expanded: true,
      type:     'overall-winner',
      data:     { image: winner.image, name: winner.name },
      children,
    }];
  });

  // Per-group % bars
  readonly groupBars = computed<GroupBar[]>(() => {
    const poll = this.poll();
    return poll.groups.map(group => {
      const total = this.groupTotal(group);
      return {
        label:    group.label,
        total,
        segments: group.candidates.map((c, ci) => ({
          name:  c.name,
          pct:   total > 0
            ? ((this.voteStore.getCount(c.id) / total) * 100).toFixed(2)
            : (100 / group.candidates.length).toFixed(2),
          color: SEGMENT_COLORS[ci % SEGMENT_COLORS.length],
        })),
      };
    });
  });

  onClickCandidate(charId: string): void {
    if (!this.voted()) this.castVote.emit(charId);
  }
}
