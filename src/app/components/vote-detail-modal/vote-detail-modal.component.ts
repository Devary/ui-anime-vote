import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode } from 'primeng/api';
import { Character, Poll } from '../../anime-data';
import { VoteStore } from '../../vote.store';

@Component({
  selector: 'app-vote-detail-modal',
  standalone: true,
  imports: [CommonModule, OrganizationChartModule],
  templateUrl: './vote-detail-modal.component.html',
  styleUrl: './vote-detail-modal.component.scss'
})
export class VoteDetailModalComponent {
  readonly poll   = input.required<Poll>();
  readonly close  = output<void>();

  private readonly voteStore = inject(VoteStore);

  readonly myVoteCharId = computed(() =>
    this.voteStore.getMyVote(this.poll().id)
  );

  readonly winnerChar = computed<Character | null>(() => {
    const p  = this.poll();
    const c1 = this.voteStore.getCount(p.fighter1.id);
    const c2 = this.voteStore.getCount(p.fighter2.id);
    if (c1 > c2) return p.fighter1;
    if (c2 > c1) return p.fighter2;
    return null;
  });

  readonly orgNodes = computed<TreeNode[]>(() => {
    const p      = this.poll();
    const myVote = this.myVoteCharId();
    const winner = this.winnerChar();
    const c1     = this.voteStore.getCount(p.fighter1.id);
    const c2     = this.voteStore.getCount(p.fighter2.id);

    const makeNode = (char: Character, count: number, otherId: string): TreeNode => ({
      type: 'fighter',
      data: {
        charId:    char.id,
        image:     char.image,
        name:      char.name,
        votes:     count,
        pct:       this.voteStore.getPercent(char.id, otherId).toFixed(2),
        isWinner:  winner?.id === char.id,
        isMyVote:  myVote === char.id,
      }
    });

    const f1 = makeNode(p.fighter1, c1, p.fighter2.id);
    const f2 = makeNode(p.fighter2, c2, p.fighter1.id);

    return [{
      expanded: true,
      type:     winner ? 'winner' : 'tie',
      data:     winner
        ? { image: winner.image, name: winner.name }
        : { name: 'TIE 🤝' },
      children: [f1, f2]
    }];
  });

  readonly barPcts = computed(() => {
    const p = this.poll();
    return {
      pct1:  this.voteStore.getPercent(p.fighter1.id, p.fighter2.id).toFixed(2),
      pct2:  this.voteStore.getPercent(p.fighter2.id, p.fighter1.id).toFixed(2),
      total: this.voteStore.getPollTotal(p.fighter1.id, p.fighter2.id),
    };
  });

  changeVote(newCharId: string): void {
    const p      = this.poll();
    const myVote = this.myVoteCharId();
    if (!myVote || myVote === newCharId) return;
    this.voteStore.changeVote(p.id, myVote, newCharId);
  }
}
