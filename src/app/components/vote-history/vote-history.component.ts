import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnimeApiService } from '../../services/anime-api.service';
import { VoteStore } from '../../vote.store';
import { HistoryItemDto } from '../../services/api.types';
import { AnyPoll, Poll, MultiPoll } from '../../anime-data';
import { VoteDetailModalComponent } from '../vote-detail-modal/vote-detail-modal.component';
import { MultiPollDetailModalComponent } from '../multi-poll-detail-modal/multi-poll-detail-modal.component';

@Component({
  selector: 'app-vote-history',
  standalone: true,
  imports: [CommonModule, FormsModule, VoteDetailModalComponent, MultiPollDetailModalComponent],
  templateUrl: './vote-history.component.html',
  styleUrl:    './vote-history.component.scss'
})
export class VoteHistoryComponent implements OnInit {
  readonly allPolls     = input.required<AnyPoll[]>();
  readonly closeHistory = output<void>();

  private readonly api       = inject(AnimeApiService);
  private readonly voteStore = inject(VoteStore);

  readonly historyItems = signal<HistoryItemDto[]>([]);
  readonly loading      = signal(false);
  readonly searchFilter = signal('');

  readonly filteredItems = computed<HistoryItemDto[]>(() => {
    const q = this.searchFilter().trim().toLowerCase();
    if (!q) return this.historyItems();
    return this.historyItems().filter(item =>
      item.myVoteCharName.toLowerCase().includes(q) ||
      (item.anime ?? '').toLowerCase().includes(q) ||
      (item.question ?? '').toLowerCase().includes(q)
    );
  });

  readonly isFiltered = computed(() => !!this.searchFilter().trim());

  private readonly PAGE_INIT = 10;
  private readonly PAGE_MORE = 7;
  readonly visibleCount = signal(this.PAGE_INIT);
  readonly visibleItems = computed(() => this.filteredItems().slice(0, this.visibleCount()));
  readonly hasMore      = computed(() => this.filteredItems().length > this.visibleCount());

  readonly selectedSinglePoll = signal<Poll | null>(null);
  readonly selectedMultiPoll  = signal<MultiPoll | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getHistory().subscribe({
      next: items => { this.historyItems.set(items); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  showMore(): void { this.visibleCount.update(n => n + this.PAGE_MORE); }

  clearFilter(): void { this.searchFilter.set(''); this.visibleCount.set(this.PAGE_INIT); }

  onSearchChange(value: string): void {
    this.searchFilter.set(value);
    this.visibleCount.set(this.PAGE_INIT);
  }

  openDetail(item: HistoryItemDto): void {
    const poll = this.allPolls().find(p => p.id === item.pollId);
    if (!poll) return;
    if (poll.type === 'single') {
      this.selectedSinglePoll.set(poll as Poll);
      this.voteStore.refreshPollResult(poll.id);
    } else {
      this.selectedMultiPoll.set(poll as MultiPoll);
      this.voteStore.refreshMultiPollResult(poll.id);
    }
  }

  closeSingleDetail(): void { this.selectedSinglePoll.set(null); }
  closeMultiDetail():  void { this.selectedMultiPoll.set(null); }

  avatarUrl(item: HistoryItemDto): string {
    return item.myVoteCharImageUrl ?? 'https://placehold.co/48x48/1565C0/fff?text=?';
  }

  timeAgo(votedAt: string): string {
    const diff = Date.now() - new Date(votedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
  }

  /** True only if the poll is still in the visible feed (detail can be opened). */
  hasDetail(item: HistoryItemDto): boolean {
    return this.allPolls().some(p => p.id === item.pollId);
  }
}
