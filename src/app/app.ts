import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ThemeStore } from './theme.store';
import { VoteStore } from './vote.store';
import { AuthService } from './services/auth.service';
import { AnimeApiService } from './services/anime-api.service';
import { PollCardComponent } from './components/poll-card/poll-card.component';
import { MultiPollCardComponent } from './components/multi-poll-card/multi-poll-card.component';
import { VoteHistoryComponent } from './components/vote-history/vote-history.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { ToastComponent } from './components/toast/toast.component';
import { ManagementComponent } from './management/management.component';
import { Poll, MultiPoll, AnyPoll, Character } from './anime-data';
import { PollDto, MultiPollAdminDto } from './services/api.types';

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
  private readonly api        = inject(AnimeApiService);
  readonly authService        = inject(AuthService);

  readonly isStandalone = window.self === window.top;
  readonly isDark       = this.themeStore.isDark;

  // Auth
  readonly isLoggedIn  = this.authService.isLoggedIn;
  readonly isAdmin     = this.authService.isAdmin;
  readonly currentUser = this.authService.currentUser;
  readonly showAuth    = signal(false);
  readonly showManagement = signal(false);

  readonly allPolls    = signal<AnyPoll[]>([]);
  readonly loading     = signal(true);
  private readonly _index = signal(0);
  readonly currentIndex   = this._index.asReadonly();
  readonly currentPoll    = computed<AnyPoll | null>(() => {
    const polls = this.allPolls();
    return polls.length > 0 ? polls[this._index()] : null;
  });
  readonly progressPct    = signal(0);
  readonly showHistory    = signal(false);

  readonly votedCount = computed(() => Object.keys(this.voteStore.myVotes()).length);

  readonly currentAsSingle = computed(() => {
    const p = this.currentPoll();
    return p?.type === 'single' ? p as Poll : null;
  });
  readonly currentAsMulti = computed(() => {
    const p = this.currentPoll();
    return p?.type === 'multi' ? p as MultiPoll : null;
  });

  private advancing = false;

  toggleTheme(): void     { this.themeStore.toggle(); }
  openHistory(): void     { this.showHistory.set(true); }
  closeHistory(): void    { this.showHistory.set(false); }
  openAuth(): void        { this.showAuth.set(true); }
  closeAuth(): void       { this.showAuth.set(false); }
  openManagement(): void  { this.showManagement.set(true); }
  closeManagement(): void { this.showManagement.set(false); }

  logout(): void { this.authService.logout(); }

  private mapPoll(dto: PollDto): Poll {
    const fighters = (dto.fighters ?? []).map(f => this.mapChar(f));
    return { id: dto.id, type: 'single', anime: dto.anime ?? '', question: dto.question,
             fighter1: fighters[0], fighter2: fighters[1] };
  }

  private mapMultiPoll(dto: MultiPollAdminDto): MultiPoll {
    return { id: dto.id, type: 'multi', anime: dto.anime ?? '', question: dto.question,
             groups: (dto.groups ?? []).map(g => ({
               id: g.id, label: g.label,
               startDate: g.startDate, endDate: g.endDate,
               candidates: (g.candidates ?? []).map(c => this.mapChar(c))
             })) };
  }

  private mapChar(c: { id: string; name: string; title: string; anime: string; imageUrl: string }): Character {
    return { id: c.id, name: c.name, title: c.title, anime: c.anime, image: c.imageUrl };
  }

  private interleave(polls: Poll[], multiPolls: MultiPoll[]): AnyPoll[] {
    const result: AnyPoll[] = [];
    const max = Math.max(polls.length, multiPolls.length);
    for (let i = 0; i < max; i++) {
      if (i < polls.length)      result.push(polls[i]);
      if (i < multiPolls.length) result.push(multiPolls[i]);
    }
    return result;
  }

  onVote(characterId: string): void {
    if (this.advancing) return;
    const poll = this.currentPoll();
    if (!poll) return;
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

  next(): void { this._index.update(i => (i + 1) % Math.max(1, this.allPolls().length)); }
  prev(): void { this._index.update(i => (i - 1 + Math.max(1, this.allPolls().length)) % Math.max(1, this.allPolls().length)); }

  ngOnInit(): void {
    this.voteStore.loadTodayVotes();
    forkJoin({ polls: this.api.getPolls(), multiPolls: this.api.getMultiPolls() }).subscribe({
      next: ({ polls, multiPolls }) => {
        const mapped = this.interleave(polls.map(p => this.mapPoll(p)), multiPolls.map(m => this.mapMultiPoll(m)));
        this.allPolls.set(mapped);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
