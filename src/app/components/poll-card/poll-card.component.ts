import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode } from 'primeng/api';
import { Character, Poll } from '../../anime-data';
import { VoteStore } from '../../vote.store';

@Component({
  selector: 'app-poll-card',
  standalone: true,
  imports: [CommonModule, OrganizationChartModule],
  templateUrl: './poll-card.component.html',
  styleUrl: './poll-card.component.scss'
})
export class PollCardComponent {
  readonly poll = input.required<Poll>();
  readonly castVote = output<string>();

  private readonly voteStore = inject(VoteStore);
  readonly votes = this.voteStore.votes;

  readonly voted = computed(() => {
    const p = this.poll();
    return this.voteStore.hasVoted(p.fighter1.id, p.fighter2.id);
  });

  readonly winnerChar = computed<Character | null>(() => {
    if (!this.voted()) return null;
    const p = this.poll();
    const c1 = this.voteStore.getCount(p.fighter1.id);
    const c2 = this.voteStore.getCount(p.fighter2.id);
    if (c1 > c2) return p.fighter1;
    if (c2 > c1) return p.fighter2;
    return null;
  });

  readonly orgNodes = computed<TreeNode[]>(() => {
    if (!this.voted()) return [];
    const p = this.poll();
    const winner = this.winnerChar();
    const c1 = this.voteStore.getCount(p.fighter1.id);
    const c2 = this.voteStore.getCount(p.fighter2.id);

    const f1: TreeNode = {
      type: 'fighter',
      data: {
        image: p.fighter1.image,
        name: p.fighter1.name,
        votes: c1,
        pct: this.voteStore.getPercent(p.fighter1.id, p.fighter2.id).toFixed(2),
        isWinner: winner?.id === p.fighter1.id,
      }
    };

    const f2: TreeNode = {
      type: 'fighter',
      data: {
        image: p.fighter2.image,
        name: p.fighter2.name,
        votes: c2,
        pct: this.voteStore.getPercent(p.fighter2.id, p.fighter1.id).toFixed(2),
        isWinner: winner?.id === p.fighter2.id,
      }
    };

    return [{
      expanded: true,
      type: winner ? 'winner' : 'tie',
      data: winner
        ? { image: winner.image, name: winner.name }
        : { name: 'TIE 🤝' },
      children: [f1, f2]
    }];
  });

  readonly barPcts = computed(() => {
    if (!this.voted()) return null;
    const p = this.poll();
    return {
      pct1: this.voteStore.getPercent(p.fighter1.id, p.fighter2.id).toFixed(2),
      pct2: this.voteStore.getPercent(p.fighter2.id, p.fighter1.id).toFixed(2),
      total: this.voteStore.getPollTotal(p.fighter1.id, p.fighter2.id),
    };
  });

  onClickFighter(id: string): void {
    if (!this.voted()) this.castVote.emit(id);
  }
}
