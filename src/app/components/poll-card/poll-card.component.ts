import { Component, computed, inject, input, output } from '@angular/core';
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

  onClickFighter(id: string): void {
    if (!this.voted()) this.castVote.emit(id);
  }
}
