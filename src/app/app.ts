import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ThemeStore } from './theme.store';
import { I18nService } from './i18n/i18n.service';
import { VoteStore } from './vote.store';
import { AuthService } from './services/auth.service';
import { AnimeApiService } from './services/anime-api.service';
import { DataRefreshService } from './services/data-refresh.service';
import { ShareService } from './services/share.service';
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
  private readonly themeStore   = inject(ThemeStore);
  private readonly voteStore    = inject(VoteStore);
  private readonly api          = inject(AnimeApiService);
  private readonly dataRefresh  = inject(DataRefreshService);
  private readonly share        = inject(ShareService);
  private readonly destroyRef   = inject(DestroyRef);
  readonly authService          = inject(AuthService);
  readonly i18n                 = inject(I18nService);

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

  /** slide animation direction for the TikTok-style vertical feed */
  readonly slideDir = signal<'next' | 'prev'>('next');
  readonly currentPollArr = computed<AnyPoll[]>(() => {
    const p = this.currentPoll();
    return p ? [p] : [];
  });
  private lastNavAt = 0;
  private touchStartY: number | null = null;

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

  private loadData(): void {
    this.loading.set(true);
    forkJoin({ polls: this.api.getPolls(), multiPolls: this.api.getMultiPolls() }).subscribe({
      next: ({ polls, multiPolls }) => {
        const mapped = this.interleave(polls.map(p => this.mapPoll(p)), multiPolls.map(m => this.mapMultiPoll(m)));
        this.allPolls.set(mapped);
        // Deep link: ?p=<pollId> jumps straight to that poll (shared links)
        const linked = this.share.deepLinkedPollId();
        const idx = linked ? mapped.findIndex(p => p.id === linked) : -1;
        this._index.set(idx >= 0 ? idx : 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

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
             fighter1: fighters[0], fighter2: fighters[1],
             visibility: dto.visibility ?? 'PUBLIC',
             ownerUsername: dto.ownerUsername ?? null };
  }

  private mapMultiPoll(dto: MultiPollAdminDto): MultiPoll {
    return { id: dto.id, type: 'multi', anime: dto.anime ?? '', question: dto.question,
             visibility: dto.visibility ?? 'PUBLIC',
             ownerUsername: dto.ownerUsername ?? null,
             groups: (dto.groups ?? []).map(g => ({
               id: g.id, label: g.label,
               level: g.level ?? 0,
               feederGroupIds: g.feederGroupIds ?? [],
               resolved: g.resolved ?? true,
               startDate: g.startDate, endDate: g.endDate,
               winnerCharId: g.winnerCharId ?? null,
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

  goNext(): void { this.slideDir.set('next'); this.next(); }
  goPrev(): void { this.slideDir.set('prev'); this.prev(); }

  /** One wheel gesture = one poll, TikTok style (with a cooldown against inertial scrolling). */
  onWheel(event: WheelEvent): void {
    if (this.isInsideScrollable(event.target)) return;
    if (Math.abs(event.deltaY) < 20) return;
    const now = Date.now();
    if (now - this.lastNavAt < 500) return;
    this.lastNavAt = now;
    event.deltaY > 0 ? this.goNext() : this.goPrev();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0]?.clientY ?? null;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchStartY === null || this.isInsideScrollable(event.target)) { this.touchStartY = null; return; }
    const endY = event.changedTouches[0]?.clientY ?? this.touchStartY;
    const delta = this.touchStartY - endY;
    this.touchStartY = null;
    if (Math.abs(delta) < 60) return;
    delta > 0 ? this.goNext() : this.goPrev(); // swipe up → next poll
  }

  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (this.showHistory() || this.showAuth() || this.showManagement()) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); this.goNext(); }
    if (event.key === 'ArrowUp')   { event.preventDefault(); this.goPrev(); }
  }

  /** Interactive sub-areas (vote sheet, bracket board, drawers) keep their own scrolling. */
  private isInsideScrollable(target: EventTarget | null): boolean {
    return target instanceof Element
      && !!target.closest('.vote-sheet, .bracket-board, .simple-board, app-vote-history, app-management, app-auth-modal');
  }

  next(): void {
    const polls = this.allPolls();
    const total = polls.length;
    if (total === 0) return;
    const cur     = this._index();
    const myVotes = this.voteStore.myVotes();
    for (let step = 1; step <= total; step++) {
      const idx = (cur + step) % total;
      if (!myVotes[polls[idx].id]) { this._index.set(idx); return; }
    }
    this._index.set((cur + 1) % total); // all voted — advance normally
  }

  prev(): void {
    const polls = this.allPolls();
    const total = polls.length;
    if (total === 0) return;
    const cur     = this._index();
    const myVotes = this.voteStore.myVotes();
    for (let step = 1; step <= total; step++) {
      const idx = (cur - step + total) % total;
      if (!myVotes[polls[idx].id]) { this._index.set(idx); return; }
    }
    this._index.set((cur - 1 + total) % total); // all voted — go back normally
  }

  ngOnInit(): void {
    this.voteStore.loadTodayVotes();
    this.loadData();
    this.dataRefresh.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());
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
