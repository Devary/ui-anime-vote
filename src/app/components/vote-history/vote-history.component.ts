import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoteStore } from '../../vote.store';
import { POLLS, Poll } from '../../anime-data';
import { VoteDetailModalComponent } from '../vote-detail-modal/vote-detail-modal.component';

@Component({
  selector: 'app-vote-history',
  standalone: true,
  imports: [CommonModule, FormsModule, VoteDetailModalComponent],
  templateUrl: './vote-history.component.html',
  styleUrl:    './vote-history.component.scss'
})
export class VoteHistoryComponent {
  readonly closeHistory = output<void>();

  private readonly voteStore = inject(VoteStore);

  // Filter signals
  readonly char1Filter = signal('');
  readonly char2Filter = signal('');
  readonly char2Disabled = computed(() => !this.char1Filter().trim());

  // All polls voted today
  readonly todayPolls = computed<Poll[]>(() => {
    const myVotes  = this.voteStore.myVotes();
    const stamps   = this.voteStore.timestamps();
    const todayStr = new Date().toDateString();
    return POLLS.filter(p =>
      myVotes[p.id] != null &&
      stamps[p.id] != null &&
      new Date(stamps[p.id]).toDateString() === todayStr
    );
  });

  // Filtered view
  readonly filteredPolls = computed<Poll[]>(() => {
    const c1 = this.char1Filter().trim().toLowerCase();
    const c2 = this.char2Filter().trim().toLowerCase();
    return this.todayPolls().filter(p => {
      if (!c1) return true;
      const n1 = p.fighter1.name.toLowerCase();
      const n2 = p.fighter2.name.toLowerCase();
      if (!n1.includes(c1) && !n2.includes(c1)) return false;
      if (c2 && !n1.includes(c2) && !n2.includes(c2)) return false;
      return true;
    });
  });

  readonly isFiltered = computed(() =>
    !!this.char1Filter().trim() || !!this.char2Filter().trim()
  );

  readonly selectedPoll = signal<Poll | null>(null);

  openDetail(poll: Poll): void { this.selectedPoll.set(poll); }
  closeDetail(): void          { this.selectedPoll.set(null); }

  clearFilters(): void {
    this.char1Filter.set('');
    this.char2Filter.set('');
  }

  onChar1Change(value: string): void {
    this.char1Filter.set(value);
    if (!value.trim()) this.char2Filter.set('');
  }

  myVotedChar(poll: Poll) {
    const charId = this.voteStore.getMyVote(poll.id);
    return charId === poll.fighter1.id ? poll.fighter1 : poll.fighter2;
  }

  pct(poll: Poll): string {
    const charId  = this.voteStore.getMyVote(poll.id)!;
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
