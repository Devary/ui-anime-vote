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
  readonly poll     = input.required<Poll>();
  readonly castVote = output<string>();

  readonly voteStore = inject(VoteStore);

  readonly COLORS = ['#1565c0', '#c62828'];

  readonly myVoteId   = computed(() => this.voteStore.getMyVote(this.poll().id));
  readonly voted      = computed(() => this.myVoteId() !== null);
  readonly totalVotes = computed(() => {
    const p = this.poll();
    return this.voteStore.getPollTotal(p.fighter1.id, p.fighter2.id);
  });

  pct(fighter: Character): number {
    const total = this.totalVotes();
    return total > 0 ? (this.voteStore.getCount(fighter.id) / total) * 100 : 50;
  }

  /** Current leader once the user has voted; null before voting or on a tie. */
  readonly leader = computed<Character | null>(() => {
    if (!this.voted()) return null;
    const p  = this.poll();
    const c1 = this.voteStore.getCount(p.fighter1.id);
    const c2 = this.voteStore.getCount(p.fighter2.id);
    if (c1 === c2) return null;
    return c1 > c2 ? p.fighter1 : p.fighter2;
  });

  onClickFighter(id: string): void {
    if (!this.voted()) this.castVote.emit(id);
  }
}
