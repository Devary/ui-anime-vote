import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoteStore } from '../../vote.store';
import { POLLS, Poll } from '../../anime-data';
import { VoteDetailModalComponent } from '../vote-detail-modal/vote-detail-modal.component';

@Component({
  selector: 'app-vote-history',
  standalone: true,
  imports: [CommonModule, VoteDetailModalComponent],
  templateUrl: './vote-history.component.html',
  styleUrl:    './vote-history.component.scss'
})
export class VoteHistoryComponent {
  readonly closeHistory = output<void>();

  private readonly voteStore = inject(VoteStore);

  readonly votedPolls = computed<Poll[]>(() => {
    const myVotes = this.voteStore.myVotes();
    return POLLS.filter(p => myVotes[p.id] != null);
  });

  readonly selectedPoll = signal<Poll | null>(null);

  openDetail(poll: Poll): void  { this.selectedPoll.set(poll); }
  closeDetail(): void           { this.selectedPoll.set(null); }

  myVotedChar(poll: Poll) {
    const charId = this.voteStore.getMyVote(poll.id);
    return charId === poll.fighter1.id ? poll.fighter1 : poll.fighter2;
  }

  pct(poll: Poll): string {
    const charId = this.voteStore.getMyVote(poll.id)!;
    const otherId = charId === poll.fighter1.id ? poll.fighter2.id : poll.fighter1.id;
    return this.voteStore.getPercent(charId, otherId).toFixed(2);
  }

  isWinner(poll: Poll): boolean {
    const charId = this.voteStore.getMyVote(poll.id);
    if (!charId) return false;
    const otherId = charId === poll.fighter1.id ? poll.fighter2.id : poll.fighter1.id;
    return this.voteStore.getCount(charId) > this.voteStore.getCount(otherId);
  }
}
