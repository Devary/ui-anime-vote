import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Poll } from '../../anime-data';
import { VoteStore } from '../../vote.store';

@Component({
  selector: 'app-poll-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poll-card.component.html',
  styleUrl: './poll-card.component.scss'
})
export class PollCardComponent {
  readonly poll = input.required<Poll>();

  private readonly voteStore = inject(VoteStore);

  readonly votes = this.voteStore.votes;

  vote(characterId: string): void {
    this.voteStore.vote(characterId);
  }

  getPercent(id: string): number {
    const p = this.poll();
    return this.voteStore.getPercent(id, p.fighter1.id, p.fighter2.id);
  }

  getCount(id: string): number {
    return this.voteStore.getCount(id);
  }

  getTotal(): number {
    const p = this.poll();
    return this.voteStore.getPollTotal(p.fighter1.id, p.fighter2.id);
  }
}
