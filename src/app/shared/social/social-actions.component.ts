import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnyPoll } from '../../anime-data';
import { PollKind } from '../../services/api.types';
import { AnimeApiService } from '../../services/anime-api.service';
import { ShareService } from '../../services/share.service';
import { I18nService } from '../../i18n/i18n.service';
import { CommentDrawerComponent } from './comment-drawer.component';

/** TikTok-style vertical action rail: Like, Comment, Share. */
@Component({
  selector: 'app-social-actions',
  standalone: true,
  imports: [CommonModule, CommentDrawerComponent],
  template: `
    <div class="action-rail">
      <button class="rail-btn like-btn" [class.liked]="likedByMe()"
              (click)="toggleLike()" [title]="i18n.t('action.like')">
        <span class="rail-icon">{{ likedByMe() ? '❤️' : '🤍' }}</span>
        <span class="rail-count">{{ likes() }}</span>
      </button>

      <button class="rail-btn comment-btn" (click)="drawerOpen.set(true)"
              [title]="i18n.t('action.comment')">
        <span class="rail-icon">💬</span>
        <span class="rail-count">{{ commentCount() }}</span>
      </button>

      @if (shareable()) {
        <button class="rail-btn share-btn" (click)="share()" [title]="i18n.t('poll.share')">
          <span class="rail-icon">↗</span>
          <span class="rail-count">{{ i18n.t('action.share') }}</span>
        </button>
      }
    </div>

    @if (drawerOpen()) {
      <app-comment-drawer
        [poll]="poll()" [kind]="kind()"
        (closed)="drawerOpen.set(false)"
        (countChanged)="commentCount.set($event)" />
    }
  `,
  styles: [`
    :host { display: contents; }

    .action-rail {
      position:         absolute;
      inset-inline-end: 0.75rem;
      bottom:           4.5rem;
      z-index:          15;
      display:          flex;
      flex-direction:   column;
      gap:              0.8rem;
      align-items:      center;
    }

    .rail-btn {
      display:        flex;
      flex-direction: column;
      align-items:    center;
      gap:            0.15rem;
      border:         none;
      background:     transparent;
      cursor:         pointer;
      padding:        0;
      -webkit-tap-highlight-color: transparent;

      .rail-icon {
        display:         grid;
        place-items:     center;
        width:           2.7rem;
        height:          2.7rem;
        border-radius:   50%;
        font-size:       1.2rem;
        background:      rgba(255, 255, 255, 0.08);
        border:          1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(8px);
        transition:      transform 0.15s ease, background 0.15s ease;
      }

      .rail-count {
        font-size:   0.66rem;
        font-weight: 700;
        color:       rgba(255, 255, 255, 0.85);
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
      }

      &:hover .rail-icon { background: rgba(255, 255, 255, 0.18); transform: scale(1.08); }
      &:active .rail-icon { transform: scale(0.94); }
    }

    .like-btn.liked .rail-icon {
      background:   rgba(239, 68, 68, 0.22);
      border-color: rgba(239, 68, 68, 0.45);
    }

    @media (max-width: 640px) {
      .action-rail { inset-inline-end: 0.4rem; bottom: 4rem; }
      .rail-btn .rail-icon { width: 2.4rem; height: 2.4rem; font-size: 1.05rem; }
    }
  `],
})
export class SocialActionsComponent {
  readonly poll = input.required<AnyPoll>();
  readonly kind = input.required<PollKind>();

  private readonly api = inject(AnimeApiService);
  private readonly shareService = inject(ShareService);
  readonly i18n = inject(I18nService);

  readonly likes = signal(0);
  readonly likedByMe = signal(false);
  readonly commentCount = signal(0);
  readonly drawerOpen = signal(false);

  readonly shareable = computed(() => (this.poll().visibility ?? 'PUBLIC') === 'PUBLIC');

  constructor() {
    // the carousel reuses card components — resync whenever the poll input changes
    effect(() => {
      const p = this.poll();
      untracked(() => {
        this.likes.set(p.likes ?? 0);
        this.likedByMe.set(p.likedByMe ?? false);
        this.commentCount.set(p.commentCount ?? 0);
        this.drawerOpen.set(false);
      });
    });
  }

  toggleLike(): void {
    // optimistic flip, corrected by the server response
    const wasLiked = this.likedByMe();
    this.likedByMe.set(!wasLiked);
    this.likes.update(n => n + (wasLiked ? -1 : 1));
    this.api.toggleLike(this.kind(), this.poll().id).subscribe({
      next: state => { this.likes.set(state.likes); this.likedByMe.set(state.likedByMe); },
      error: () => { this.likedByMe.set(wasLiked); this.likes.update(n => n + (wasLiked ? 1 : -1)); },
    });
  }

  share(): void {
    this.shareService.share(this.poll().id, this.poll().question);
  }
}
