import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from './theme.store';
import { VoteStore } from './vote.store';
import { PollCardComponent } from './components/poll-card/poll-card.component';
import { VoteHistoryComponent } from './components/vote-history/vote-history.component';
import { POLLS } from './anime-data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, PollCardComponent, VoteHistoryComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly themeStore = inject(ThemeStore);
  private readonly voteStore  = inject(VoteStore);

  readonly isStandalone = window.self === window.top;
  readonly isDark       = this.themeStore.isDark;

  readonly totalPolls  = POLLS.length;
  private readonly _index = signal(0);
  readonly currentIndex   = this._index.asReadonly();
  readonly currentPoll    = computed(() => POLLS[this._index()]);
  readonly progressPct    = signal(0);
  readonly showHistory    = signal(false);

  readonly votedCount = computed(() => Object.keys(this.voteStore.myVotes()).length);

  private advancing = false;

  toggleTheme(): void   { this.themeStore.toggle(); }
  openHistory(): void   { this.showHistory.set(true); }
  closeHistory(): void  { this.showHistory.set(false); }

  onVote(characterId: string): void {
    if (this.advancing) return;
    this.voteStore.vote(characterId, this.currentPoll().id);
    this.advancing = true;
    this.progressPct.set(0);
    setTimeout(() => this.progressPct.set(100), 10);
    setTimeout(() => {
      this.progressPct.set(0);
      this.advancing = false;
      this.next();
    }, 600);
  }

  next(): void {
    this._index.update(i => (i + 1) % POLLS.length);
  }

  prev(): void {
    this._index.update(i => (i - 1 + POLLS.length) % POLLS.length);
  }

  ngOnInit(): void {
    if (this.isStandalone) return;
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; theme?: string } | null;
      if (data?.type === 'ui-anime-vote:theme' && (data.theme === 'light' || data.theme === 'dark')) {
        this.themeStore.setTheme(data.theme as 'light' | 'dark');
      }
    });
    window.parent?.postMessage({ type: 'ui-anime-vote:request-theme' }, window.location.origin);
  }
}
