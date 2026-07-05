import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnyPoll } from '../../anime-data';
import { CommentDto, PollKind } from '../../services/api.types';
import { AnimeApiService } from '../../services/anime-api.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { COMMENT_MAX_LENGTH, sanitizeComment, validateComment } from './comment-validation';

/** Text-only comment drawer for polls and multi-polls (newest first). */
@Component({
  selector: 'app-comment-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drawer-backdrop" (click)="closed.emit()"></div>
    <div class="drawer" role="dialog" aria-modal="true">

      <div class="drawer-header">
        <span class="drawer-title">{{ i18n.t('comments.title') }} ({{ comments().length }})</span>
        @if (canToggle()) {
          <button class="toggle-btn" (click)="toggleEnabled()">
            {{ enabled() ? i18n.t('comments.pause') : i18n.t('comments.resume') }}
          </button>
        }
        <button class="drawer-close" (click)="closed.emit()" aria-label="Close">✕</button>
      </div>

      @if (!enabled()) {
        <div class="disabled-note">🔒 {{ i18n.t('comments.disabledNotice') }}</div>
      }

      <div class="comment-list">
        @if (loading()) { <div class="hint">…</div> }
        @if (!loading() && !comments().length) { <div class="hint">{{ i18n.t('comments.empty') }}</div> }
        @for (c of comments(); track c.id) {
          <div class="comment" [class.mine]="c.mine">
            <div class="comment-head">
              <span class="comment-user">{{ c.username }}</span>
              <span class="comment-time">{{ c.createdAt | date:'short' }}</span>
            </div>
            <div class="comment-text">{{ c.text }}</div>
          </div>
        }
      </div>

      @if (enabled()) {
        @if (isLoggedIn()) {
          <form class="composer" (ngSubmit)="post()">
            <textarea class="composer-input" rows="2" name="comment"
                      [(ngModel)]="draft" (ngModelChange)="error.set(null)"
                      [maxlength]="MAX + 1"
                      [placeholder]="i18n.t('comments.placeholder')"></textarea>
            @if (error(); as err) { <div class="composer-error">{{ i18n.t(err) }}</div> }
            <div class="composer-footer">
              <span class="composer-count" [class.over]="draft.length > MAX">{{ draft.length }}/{{ MAX }}</span>
              <button class="composer-post" type="submit" [disabled]="posting()">{{ i18n.t('comments.post') }}</button>
            </div>
          </form>
        } @else {
          <div class="hint sign-in-note">{{ i18n.t('comments.signIn') }}</div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .drawer-backdrop { position: fixed; inset: 0; z-index: 600; background: rgba(0, 0, 0, 0.45); }

    .drawer {
      position:        fixed;
      z-index:         601; // above the header bar
      display:         flex;
      flex-direction:  column;
      gap:             0.6rem;
      padding:         0.9rem;
      background:      var(--rz-surface);
      border:          1px solid var(--rz-border);
      box-shadow:      var(--rz-glass-shadow);
      // desktop: right-side panel · mobile: bottom sheet
      top:             0;
      bottom:          0;
      inset-inline-end: 0;
      width:           min(24rem, 92vw);
      border-start-start-radius: 1rem;
      border-end-start-radius:   1rem;
      animation:       drawer-in 0.2s ease;
    }

    @keyframes drawer-in { from { transform: translateX(2rem); opacity: 0; } }

    @media (max-width: 640px) {
      .drawer {
        top: auto; inset-inline: 0; bottom: 0;
        width: 100%; max-height: 75vh;
        border-radius: 1rem 1rem 0 0;
      }
    }

    .drawer-header { display: flex; align-items: center; gap: 0.5rem; }
    .drawer-title  { flex: 1; font-size: 0.9rem; font-weight: 800; color: var(--rz-ink); }

    .toggle-btn {
      border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink-muted);
      border-radius: var(--rz-radius-full); padding: 0.25rem 0.7rem;
      font-size: 0.7rem; font-weight: 700; cursor: pointer;
      &:hover { background: var(--rz-surface-hover); color: var(--rz-ink); }
    }

    .drawer-close {
      border: none; background: var(--rz-surface-hover); color: var(--rz-ink-muted);
      width: 1.7rem; height: 1.7rem; border-radius: 50%; cursor: pointer; font-size: 0.8rem;
      &:hover { background: var(--rz-surface-active); color: var(--rz-ink); }
    }

    .disabled-note {
      font-size: 0.75rem; font-weight: 600; color: var(--rz-ink-muted);
      background: var(--rz-surface-hover); border-radius: var(--rz-radius-sm);
      padding: 0.45rem 0.6rem; text-align: center;
    }

    .comment-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
    .hint { font-size: 0.78rem; color: var(--rz-ink-muted); text-align: center; padding: 0.6rem 0; }

    .comment {
      border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-md);
      padding: 0.5rem 0.65rem; display: flex; flex-direction: column; gap: 0.2rem;
      &.mine { border-color: color-mix(in srgb, var(--rz-primary) 45%, transparent); }
    }
    .comment-head { display: flex; justify-content: space-between; gap: 0.5rem; }
    .comment-user { font-size: 0.74rem; font-weight: 800; color: var(--rz-primary); }
    .comment-time { font-size: 0.66rem; color: var(--rz-ink-faint); white-space: nowrap; }
    .comment-text { font-size: 0.84rem; color: var(--rz-ink); word-break: break-word; white-space: pre-wrap; }

    .composer { display: flex; flex-direction: column; gap: 0.35rem; }
    .composer-input {
      resize: none; font: inherit; font-size: 0.85rem;
      background: var(--rz-glass-bg); color: var(--rz-ink);
      border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
      padding: 0.5rem 0.65rem; outline: none;
      &:focus { border-color: var(--rz-primary); }
    }
    .composer-error { font-size: 0.72rem; font-weight: 600; color: var(--rz-danger); }
    .composer-footer { display: flex; align-items: center; justify-content: space-between; }
    .composer-count { font-size: 0.68rem; color: var(--rz-ink-faint); &.over { color: var(--rz-danger); } }
    .composer-post {
      border: none; border-radius: var(--rz-radius-sm); background: var(--rz-gradient); color: #fff;
      font-weight: 700; font-size: 0.78rem; padding: 0.4rem 1rem; cursor: pointer;
      &:disabled { opacity: 0.6; cursor: default; }
    }
  `],
})
export class CommentDrawerComponent implements OnInit {
  readonly poll = input.required<AnyPoll>();
  readonly kind = input.required<PollKind>();
  readonly closed = output<void>();
  readonly countChanged = output<number>();

  private readonly api  = inject(AnimeApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);

  readonly MAX = COMMENT_MAX_LENGTH;
  readonly comments = signal<CommentDto[]>([]);
  readonly loading  = signal(false);
  readonly posting  = signal(false);
  readonly error    = signal<string | null>(null);
  readonly enabled  = signal(true);
  draft = '';

  readonly isLoggedIn = this.auth.isLoggedIn;

  /** poll creator, admins and moderators can pause/resume commenting */
  readonly canToggle = computed(() =>
    this.auth.canModerate()
    || (this.auth.isLoggedIn() && this.poll().ownerId === this.auth.currentUser()?.subject));

  ngOnInit(): void {
    this.enabled.set(this.poll().commentsEnabled ?? true);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.getComments(this.kind(), this.poll().id).subscribe({
      next: list => {
        this.comments.set(list);
        this.countChanged.emit(list.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  post(): void {
    const validationError = validateComment(this.draft);
    if (validationError) { this.error.set(validationError); return; }
    this.posting.set(true);
    this.api.addComment(this.kind(), this.poll().id, sanitizeComment(this.draft)).subscribe({
      next: comment => {
        this.comments.update(list => [comment, ...list]);
        this.countChanged.emit(this.comments().length);
        this.draft = '';
        this.posting.set(false);
      },
      error: e => {
        this.posting.set(false);
        this.toast.error(e?.error?.message ?? 'Failed to post comment');
      },
    });
  }

  toggleEnabled(): void {
    const next = !this.enabled();
    this.api.setCommentsEnabled(this.kind(), this.poll().id, next).subscribe({
      next: res => {
        this.enabled.set(res.enabled);
        const p = this.poll();
        p.commentsEnabled = res.enabled; // keep the card model in sync
      },
      error: e => this.toast.error(e?.error?.message ?? 'Failed to update comment settings'),
    });
  }
}
