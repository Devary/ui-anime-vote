import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from './theme.store';
import { VoteStore } from './vote.store';
import { AuthService } from './services/auth.service';
import { PollCardComponent } from './components/poll-card/poll-card.component';
import { MultiPollCardComponent } from './components/multi-poll-card/multi-poll-card.component';
import { VoteHistoryComponent } from './components/vote-history/vote-history.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { ToastComponent } from './components/toast/toast.component';
import { ManagementComponent } from './management/management.component';
import { ALL_POLLS, Poll, MultiPoll } from './anime-data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    PollCardComponent,
    MultiPollCardComponent,
    VoteHistoryComponent,
    AuthModalComponent,
    ManagementComponent,
    ToastComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly themeStore = inject(ThemeStore);
  private readonly voteStore  = inject(VoteStore);
  readonly authService        = inject(AuthService);

  readonly isStandalone = window.self === window.top;
  readonly isDark       = this.themeStore.isDark;

  // Auth
  readonly isLoggedIn  = this.authService.isLoggedIn;
  readonly isAdmin     = this.authService.isAdmin;
  readonly currentUser = this.authService.currentUser;
  readonly showAuth    = signal(false);
  readonly showManagement = signal(false);

  readonly totalPolls  = ALL_POLLS.length;
  private readonly _index = signal(0);
  readonly currentIndex   = this._index.asReadonly();
  readonly currentPoll    = computed(() => ALL_POLLS[this._index()]);
  readonly progressPct    = signal(0);
  readonly showHistory    = signal(false);

  readonly votedCount = computed(() => Object.keys(this.voteStore.myVotes()).length);

  readonly currentAsSingle = computed(() =>
    this.currentPoll().type === 'single' ? this.currentPoll() as Poll : null
  );
  readonly currentAsMulti = computed(() =>
    this.currentPoll().type === 'multi' ? this.currentPoll() as MultiPoll : null
  );

  private advancing = false;

  toggleTheme(): void     { this.themeStore.toggle(); }
  openHistory(): void     { this.showHistory.set(true); }
  closeHistory(): void    { this.showHistory.set(false); }
  openAuth(): void        { this.showAuth.set(true); }
  closeAuth(): void       { this.showAuth.set(false); }
  openManagement(): void  { this.showManagement.set(true); }
  closeManagement(): void { this.showManagement.set(false); }

  logout(): void { this.authService.logout(); }

  onVote(characterId: string): void {
    if (this.advancing) return;
    const poll = this.currentPoll();
    if (poll.type === 'multi') {
      this.voteStore.voteMulti(characterId, poll.id);
    } else {
      this.voteStore.vote(characterId, poll.id);
    }
    this.advancing = true;
    this.progressPct.set(0);
    setTimeout(() => this.progressPct.set(100), 10);
    setTimeout(() => {
      this.progressPct.set(0);
      this.advancing = false;
      this.next();
    }, 600);
  }

  next(): void { this._index.update(i => (i + 1) % ALL_POLLS.length); }
  prev(): void { this._index.update(i => (i - 1 + ALL_POLLS.length) % ALL_POLLS.length); }

  ngOnInit(): void {
    this.voteStore.loadTodayVotes();
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
