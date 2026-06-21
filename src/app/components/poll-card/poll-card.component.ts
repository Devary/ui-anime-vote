import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character, Poll } from '../../anime-data';
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
    return null; // tie
  });

  onClickFighter(characterId: string): void {
    if (!this.voted()) this.castVote.emit(characterId);
  }

  getPercent(id: string, otherId: string): string {
    return this.voteStore.getPercent(id, otherId).toFixed(2);
  }

  getCount(id: string): number {
    return this.voteStore.getCount(id);
  }

  getTotal(): number {
    const p = this.poll();
    return this.voteStore.getPollTotal(p.fighter1.id, p.fighter2.id);
  }

  isWinner(id: string, otherId: string): boolean {
    return this.voted() && this.voteStore.getCount(id) > this.voteStore.getCount(otherId);
  }
}
