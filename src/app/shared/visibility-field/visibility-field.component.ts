import { Component, inject, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnimeApiService } from '../../services/anime-api.service';
import { I18nService } from '../../i18n/i18n.service';
import { UserDirectoryEntryDto, Visibility } from '../../services/api.types';

/**
 * Visibility selector shared by every poll / multi-poll form:
 * PUBLIC · PRIVATE · AUTHENTICATED · RESTRICTED (+ audience picker).
 */
@Component({
  selector: 'app-visibility-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <label class="field">
      <span>{{ i18n.t('vis.label') }}</span>
      <select class="input" [ngModel]="visibility()" (ngModelChange)="onVisibilityChange($event)" name="visibility">
        @for (opt of OPTIONS; track opt.value) {
          <option [value]="opt.value">{{ i18n.t(opt.labelKey) }}</option>
        }
      </select>
      <small class="vis-hint">{{ hint() }}</small>
    </label>

    @if (visibility() === 'RESTRICTED') {
      <div class="audience-box">
        <span class="audience-title">{{ i18n.t('vis.allowedUsers') }}</span>
        @if (loading()) { <div class="audience-loading">{{ i18n.t('vis.loadingUsers') }}</div> }
        <div class="audience-list">
          @for (u of users(); track u.id) {
            <label class="audience-item">
              <input type="checkbox"
                     [checked]="allowedUserIds().includes(u.id)"
                     (change)="toggleUser(u.id)" />
              <span>{{ u.username }}</span>
            </label>
          }
        </div>
        @if (!loading() && users().length === 0) {
          <div class="audience-loading">{{ i18n.t('vis.noUsers') }}</div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field > span { font-size: 0.72rem; font-weight: 700; color: var(--rz-ink-muted); }
    .input {
      background: var(--rz-surface); color: var(--rz-ink);
      border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
      padding: 0.45rem 0.6rem; font: inherit; font-size: 0.85rem;
    }
    .vis-hint { font-size: 0.68rem; color: var(--rz-ink-faint); }
    .audience-box {
      grid-column: 1 / -1;
      border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-sm);
      padding: 0.55rem 0.7rem; display: flex; flex-direction: column; gap: 0.4rem;
    }
    .audience-title { font-size: 0.72rem; font-weight: 700; color: var(--rz-ink-muted); }
    .audience-loading { font-size: 0.75rem; color: var(--rz-ink-faint); }
    .audience-list { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; max-height: 9rem; overflow-y: auto; }
    .audience-item {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.8rem; color: var(--rz-ink); cursor: pointer;
    }
  `],
})
export class VisibilityFieldComponent {
  readonly visibility     = model<Visibility>('PUBLIC');
  readonly allowedUserIds = model<string[]>([]);
  readonly changed        = output<void>();

  private readonly api = inject(AnimeApiService);
  readonly i18n = inject(I18nService);

  readonly users   = signal<UserDirectoryEntryDto[]>([]);
  readonly loading = signal(false);
  private usersLoaded = false;

  readonly OPTIONS: { value: Visibility; labelKey: string }[] = [
    { value: 'PUBLIC',        labelKey: 'vis.public' },
    { value: 'AUTHENTICATED', labelKey: 'vis.authenticated' },
    { value: 'RESTRICTED',    labelKey: 'vis.restricted' },
    { value: 'PRIVATE',       labelKey: 'vis.private' },
  ];

  hint(): string {
    switch (this.visibility()) {
      case 'PUBLIC':        return this.i18n.t('vis.hint.public');
      case 'AUTHENTICATED': return this.i18n.t('vis.hint.auth');
      case 'RESTRICTED':    return this.i18n.t('vis.hint.restricted');
      case 'PRIVATE':       return this.i18n.t('vis.hint.private');
    }
  }

  onVisibilityChange(v: Visibility): void {
    this.visibility.set(v);
    if (v === 'RESTRICTED') this.loadUsers();
    this.changed.emit();
  }

  toggleUser(id: string): void {
    const list = this.allowedUserIds();
    this.allowedUserIds.set(list.includes(id) ? list.filter(u => u !== id) : [...list, id]);
    this.changed.emit();
  }

  private loadUsers(): void {
    if (this.usersLoaded) return;
    this.loading.set(true);
    this.api.getUserDirectory().subscribe({
      next: users => { this.users.set(users); this.usersLoaded = true; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  ngOnInit(): void {
    if (this.visibility() === 'RESTRICTED') this.loadUsers();
  }
}
