import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoteStore } from '../../vote.store';
import { ALL_POLLS, AnyPoll, Poll, MultiPoll, Character } from '../../anime-data';
import { VoteDetailModalComponent } from '../vote-detail-modal/vote-detail-modal.component';
import { MultiPollDetailModalComponent } from '../multi-poll-detail-modal/multi-poll-detail-modal.component';

@Component({
  selector: 'app-vote-history',
  standalone: true,
  imports: [CommonModule, FormsModule, VoteDetailModalComponent, MultiPollDetailModalComponent],
  templateUrl: './vote-history.component.html',
  styleUrl:    './vote-history.component.scss'
})
export class VoteHistoryComponent {
  readonly closeHistory = output<void>();

  private readonly voteStore = inject(VoteStore);

  // Filter signals
  readonly char1Filter  = signal('');
  readonly char2Filter  = signal('');
  readonly char2Disabled = computed(() => !this.char1Filter().trim());

  // Type guards
  isSingle(p: AnyPoll): p is Poll      { return p.type === 'single'; }
  isMulti(p: AnyPoll):  p is MultiPoll { return p.type === 'multi'; }

  // All polls voted today (single + multi)
  readonly todayPolls = computed<AnyPoll[]>(() => {
    const myVotes  = this.voteStore.myVotes();
    const stamps   = this.voteStore.timestamps();
    const todayStr = new Date().toDateString();
    return ALL_POLLS.filter(p =>
      myVotes[p.id] != null &&
      stamps[p.id]  != null &&
      new Date(stamps[p.id]).toDateString() === todayStr
    );
  });

  // Filtered view — searches candidate names in both poll types
  readonly filteredPolls = computed<AnyPoll[]>(() => {
    const c1 = this.char1Filter().trim().toLowerCase();
    const c2 = this.char2Filter().trim().toLowerCase();
    return this.todayPolls().filter(p => {
      if (!c1) return true;
      const names = this.isSingle(p)
        ? [p.fighter1.name.toLowerCase(), p.fighter2.name.toLowerCase()]
        : p.groups.flatMap(g => g.candidates.map(c => c.name.toLowerCase()));
      if (!names.some(n => n.includes(c1))) return false;
      if (c2 && !names.some(n => n.includes(c2))) return false;
      return true;
    });
  });

  readonly isFiltered = computed(() =>
    !!this.char1Filter().trim() || !!this.char2Filter().trim()
  );

  readonly selectedSinglePoll = signal<Poll | null>(null);
  readonly selectedMultiPoll  = signal<MultiPoll | null>(null);

  openDetail(p: AnyPoll): void {
    if (this.isSingle(p)) this.selectedSinglePoll.set(p);
    else                  this.selectedMultiPoll.set(p);
  }

  closeSingleDetail(): void { this.selectedSinglePoll.set(null); }
  closeMultiDetail():  void { this.selectedMultiPoll.set(null); }

  clearFilters(): void {
    this.char1Filter.set('');
    this.char2Filter.set('');
  }

  onChar1Change(value: string): void {
    this.char1Filter.set(value);
    if (!value.trim()) this.char2Filter.set('');
  }

  // ── Helpers used in template ───────────────────────────────────────────────

  myVotedChar(p: AnyPoll): Character {
    const charId = this.voteStore.getMyVote(p.id)!;
    if (this.isSingle(p)) {
      return charId === p.fighter1.id ? p.fighter1 : p.fighter2;
    }
    return p.groups.flatMap(g => g.candidates).find(c => c.id === charId)!;
  }

  pct(p: AnyPoll): string {
    const charId = this.voteStore.getMyVote(p.id)!;
    if (this.isSingle(p)) {
      const otherId = charId === p.fighter1.id ? p.fighter2.id : p.fighter1.id;
      return this.voteStore.getPercent(charId, otherId).toFixed(2);
    }
    // For multi: % within the candidate's group
    const group = p.groups.find(g => g.candidates.some(c => c.id === charId))!;
    const total = group.candidates.reduce((s, c) => s + this.voteStore.getCount(c.id), 0);
    const count = this.voteStore.getCount(charId);
    return total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';
  }

  isWinner(p: AnyPoll): boolean {
    const charId = this.voteStore.getMyVote(p.id);
    if (!charId) return false;
    if (this.isSingle(p)) {
      const otherId = charId === p.fighter1.id ? p.fighter2.id : p.fighter1.id;
      return this.voteStore.getCount(charId) > this.voteStore.getCount(otherId);
    }
    const all     = p.groups.flatMap(g => g.candidates);
    const maxVotes = Math.max(...all.map(c => this.voteStore.getCount(c.id)));
    return maxVotes > 0 && this.voteStore.getCount(charId) === maxVotes;
  }

  opponentName(p: AnyPoll): string {
    const charId = this.voteStore.getMyVote(p.id)!;
    if (this.isSingle(p)) {
      return charId === p.fighter1.id ? p.fighter2.name : p.fighter1.name;
    }
    const others = p.groups
      .flatMap(g => g.candidates)
      .filter(c => c.id !== charId)
      .map(c => c.name);
    return others.slice(0, 2).join(', ') + (others.length > 2 ? ' +' + (others.length - 2) : '');
  }
}
