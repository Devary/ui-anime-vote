import { Component, OnInit, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode } from 'primeng/api';
import { Character, MultiPoll, MultiPollGroup } from '../../anime-data';
import { VoteStore } from '../../vote.store';

const SEGMENT_COLORS = ['#1565c0', '#c62828', '#2e7d32', '#6a1b9a', '#e65100'];

@Component({
  selector:    'app-multi-poll-detail-modal',
  standalone:  true,
  imports:     [CommonModule, OrganizationChartModule],
  templateUrl: './multi-poll-detail-modal.component.html',
  styleUrl:    './multi-poll-detail-modal.component.scss',
})
export class MultiPollDetailModalComponent implements OnInit {
  readonly poll  = input.required<MultiPoll>();
  readonly close = output<void>();

  private readonly voteStore = inject(VoteStore);

  ngOnInit(): void {
    this.voteStore.refreshMultiPollResult(this.poll().id);
  }

  readonly myVoteCharId = computed(() => this.voteStore.getMyVote(this.poll().id));

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

  private groupTotal(group: MultiPollGroup): number {
    return group.candidates.reduce((s, c) => s + this.voteStore.getCount(c.id), 0);
  }

  readonly orgNodes = computed<TreeNode[]>(() => {
    const poll   = this.poll();
    const myVote = this.myVoteCharId();
    const winner = this.overallWinner();

    return [{
      expanded: true,
      type:     'overall-winner',
      data:     { image: winner.image, name: winner.name },
      children: poll.groups.map(group => {
        const gw = this.groupWinner(group);
        const gt = this.groupTotal(group);
        return {
          expanded: true,
          type:     'group-winner',
          data:     { image: gw.image, name: gw.name, label: group.label, isMyVote: myVote === gw.id },
          children: group.candidates.map((c, ci) => ({
            type: 'candidate',
            data: {
              charId:   c.id,
              image:    c.image,
              name:     c.name,
              votes:    this.voteStore.getCount(c.id),
              pct:      gt > 0 ? ((this.voteStore.getCount(c.id) / gt) * 100).toFixed(2) : '0.00',
              color:    SEGMENT_COLORS[ci % SEGMENT_COLORS.length],
              isMyVote: myVote === c.id,
              isWinner: gw.id === c.id,
            },
          })),
        } as TreeNode;
      }),
    }];
  });

  readonly groupBars = computed(() =>
    this.poll().groups.map(group => {
      const total = this.groupTotal(group);
      return {
        label:    group.label,
        total,
        segments: group.candidates.map((c, ci) => ({
          name:  c.name,
          pct:   total > 0 ? ((this.voteStore.getCount(c.id) / total) * 100).toFixed(2)
                           : (100 / group.candidates.length).toFixed(2),
          color: SEGMENT_COLORS[ci % SEGMENT_COLORS.length],
        })),
      };
    })
  );

  switchVote(newCharId: string): void {
    const myVote = this.myVoteCharId();
    if (!myVote || myVote === newCharId) return;
    this.voteStore.changeMultiVote(this.poll().id, myVote, newCharId);
  }
}
