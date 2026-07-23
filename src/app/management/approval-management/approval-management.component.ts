import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DataRefreshService } from '../../services/data-refresh.service';
import { ApprovalItemDto, ApprovalSummaryDto } from '../../services/api.types';
import { FormsModule } from '@angular/forms';
import { CrudModalComponent } from '../../shared/crud-modal/crud-modal.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-approval-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent, CrudModalComponent],
  template: `
    <div class="approvals">
      <div class="section-header">
        <span class="section-title">Approvals</span>
        <button class="btn-ghost-sm" (click)="load()" [disabled]="loading()">↻ Refresh</button>
      </div>

      @if (loading()) { <div class="loading">Loading…</div> }

      <!-- Pending new content -->
      <div class="block">
        <div class="block-title">
          Pending Content
          <span class="count-badge">{{ summary()?.pendingContent?.length ?? 0 }}</span>
        </div>
        @if (!summary()?.pendingContent?.length) {
          <div class="empty">No pending content.</div>
        }
        @for (item of summary()?.pendingContent; track item.id) {
          <div class="approval-row">
            <div class="item-info">
              <span class="item-type" [class]="'type-' + item.type">{{ typeLabel(item.type) }}</span>
              <div class="item-details">
                <span class="item-title">{{ item.title }}</span>
                @if (item.anime) { <span class="item-sub">{{ item.anime }}</span> }
                <span class="item-owner">by {{ item.ownerUsername ?? item.ownerId }}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn-edit" (click)="startEdit(item)">✎ Edit</button>
              <button class="btn-approve" (click)="approve(item)">✓ Approve</button>
              <button class="btn-reject" (click)="reject(item)">✗ Reject</button>
            </div>
          </div>
        }
      </div>

      <!-- Pending deletions -->
      <div class="block">
        <div class="block-title">
          Pending Deletions
          <span class="count-badge">{{ summary()?.pendingDeletions?.length ?? 0 }}</span>
        </div>
        @if (!summary()?.pendingDeletions?.length) {
          <div class="empty">No pending deletion requests.</div>
        }
        @for (item of summary()?.pendingDeletions; track item.id) {
          <div class="approval-row">
            <div class="item-info">
              <span class="item-type del-type" [class]="'type-' + item.type">{{ typeLabel(item.type) }}</span>
              <div class="item-details">
                <span class="item-title">{{ item.title }}</span>
                @if (item.anime) { <span class="item-sub">{{ item.anime }}</span> }
                <span class="item-owner">deletion requested by {{ item.ownerUsername ?? item.ownerId }}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn-danger-sm" (click)="approveDeletion(item)">Delete</button>
              <button class="btn-ghost-sm" (click)="rejectDeletion(item)">Keep</button>
            </div>
          </div>
        }
      </div>
    </div>

      <!-- Edit-before-approve modal -->
      @if (editItem(); as item) {
        <app-crud-modal [title]="'Edit ' + typeLabel(item.type)" (closeRequest)="onEditCloseRequest()">
          <div class="edit-grid">
            @if (item.type === 'ANIME') {
              <label class="field"><span>Name *</span>
                <input class="input" [(ngModel)]="editForm.name" maxlength="254" (ngModelChange)="editDirty = true" /></label>
              <label class="field"><span>Image URL</span>
                <input class="input" [(ngModel)]="editForm.imageUrl" (ngModelChange)="editDirty = true" /></label>
            } @else if (item.type === 'CHARACTER') {
              <label class="field"><span>Name *</span>
                <input class="input" [(ngModel)]="editForm.name" maxlength="254" (ngModelChange)="editDirty = true" /></label>
              <label class="field"><span>Title</span>
                <input class="input" [(ngModel)]="editForm.title" (ngModelChange)="editDirty = true" /></label>
              <label class="field"><span>Anime</span>
                <input class="input" [(ngModel)]="editForm.anime" (ngModelChange)="editDirty = true" /></label>
              <label class="field"><span>Image URL</span>
                <input class="input" [(ngModel)]="editForm.imageUrl" (ngModelChange)="editDirty = true" /></label>
            } @else {
              <label class="field"><span>Question *</span>
                <input class="input" [(ngModel)]="editForm.question" maxlength="254" (ngModelChange)="editDirty = true" /></label>
              <label class="field"><span>Anime</span>
                <input class="input" [(ngModel)]="editForm.anime" (ngModelChange)="editDirty = true" /></label>
            }
            @if (editError()) { <div class="error-msg">{{ editError() }}</div> }
            <div class="edit-actions">
              <button class="btn-ghost-sm" type="button" (click)="onEditCloseRequest()">Cancel</button>
              <button class="btn-edit" type="button" [disabled]="savingEdit()" (click)="saveEdit(false)">Save</button>
              <button class="btn-approve" type="button" [disabled]="savingEdit()" (click)="saveEdit(true)">Save &amp; Approve</button>
            </div>
          </div>
        </app-crud-modal>
      }

    @if (showConfirm()) {
      <app-confirm-modal
        [title]="confirmTitle()" [message]="confirmMsg()" [danger]="isDanger()"
        (confirmed)="onConfirmed()" (cancelled)="showConfirm.set(false)" />
    }
  `,
  styles: [`
    :host { display: block; }
    .approvals { display: flex; flex-direction: column; gap: 1.25rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-size: 0.95rem; font-weight: 700; color: var(--rz-ink); }
    .block { display: flex; flex-direction: column; gap: 0.5rem; }
    .block-title { font-size: 0.82rem; font-weight: 600; color: var(--rz-ink-muted); text-transform: uppercase;
                    letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.5rem; }
    .count-badge { background: var(--rz-primary); color: #fff; border-radius: 99px;
                    padding: 0 0.4rem; font-size: 0.7rem; font-weight: 700; }
    .approval-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
                     padding: 0.65rem 0.85rem; background: var(--rz-glass-bg);
                     border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-sm); }
    .item-info { display: flex; align-items: flex-start; gap: 0.6rem; min-width: 0; }
    .item-type { font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 99px;
                  text-transform: uppercase; flex-shrink: 0; margin-top: 0.1rem; }
    .type-POLL        { background: rgba(21,101,192,0.12); color: #1565c0; }
    .type-MULTI_POLL  { background: rgba(124,58,237,0.12); color: #7c3aed; }
    .type-CHARACTER   { background: rgba(5,150,105,0.12); color: #059669; }
    .type-ANIME       { background: rgba(59,130,246,0.12); color: #3b82f6; }
    .del-type { opacity: 0.7; }
    .item-details { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .item-title { font-size: 0.85rem; font-weight: 600; color: var(--rz-ink);
                   overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-sub { font-size: 0.75rem; color: var(--rz-ink-muted); }
    .item-owner { font-size: 0.72rem; color: var(--rz-ink-faint); font-style: italic; }
    .item-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
    .btn-approve { padding: 0.3rem 0.75rem; border-radius: var(--rz-radius-sm); border: none;
                    background: rgba(34,197,94,0.15); color: #16a34a; font-size: 0.78rem; font-weight: 600;
                    cursor: pointer; }
    .btn-approve:hover { background: rgba(34,197,94,0.28); }
    .btn-edit { padding: 0.3rem 0.75rem; border-radius: var(--rz-radius-sm); border: none;
                background: rgba(59,130,246,0.16); color: #3b82f6; font-weight: 700; cursor: pointer; }
    .btn-edit:hover { background: rgba(59,130,246,0.28); }
    .edit-grid { display: flex; flex-direction: column; gap: 0.7rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field > span { font-size: 0.72rem; font-weight: 700; color: var(--rz-ink-muted); }
    .input { background: var(--rz-surface); color: var(--rz-ink); border: 1px solid var(--rz-border);
             border-radius: var(--rz-radius-sm); padding: 0.45rem 0.6rem; font: inherit; font-size: 0.85rem; }
    .error-msg { color: var(--rz-danger); font-size: 0.78rem; }
    .edit-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.3rem; }
    .btn-reject { padding: 0.3rem 0.75rem; border-radius: var(--rz-radius-sm); border: none;
                   background: rgba(239,68,68,0.12); color: #dc2626; font-size: 0.78rem; font-weight: 600;
                   cursor: pointer; }
    .btn-reject:hover { background: rgba(239,68,68,0.22); }
    .btn-danger-sm { padding: 0.3rem 0.75rem; border-radius: var(--rz-radius-sm); border: 1px solid var(--rz-danger);
                      background: var(--rz-danger-bg); color: var(--rz-danger); font-size: 0.78rem; font-weight: 600;
                      cursor: pointer; }
    .btn-danger-sm:hover { background: var(--rz-danger); color: #fff; }
    .btn-ghost-sm { padding: 0.3rem 0.75rem; border-radius: var(--rz-radius-sm);
                     border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink);
                     font-size: 0.78rem; cursor: pointer; }
    .btn-ghost-sm:hover { background: var(--rz-surface-hover); }
    .loading, .empty { font-size: 0.8rem; color: var(--rz-ink-muted); padding: 0.75rem 0; text-align: center; }
  `]
})
export class ApprovalManagementComponent implements OnInit {
  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);

  readonly summary = signal<ApprovalSummaryDto | null>(null);
  readonly loading = signal(false);

  readonly showConfirm  = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmMsg   = signal('');
  readonly isDanger     = signal(true);
  private confirmCb: () => void = () => {};

  private askConfirm(title: string, msg: string, cb: () => void, danger = true): void {
    this.confirmTitle.set(title); this.confirmMsg.set(msg);
    this.isDanger.set(danger); this.confirmCb = cb; this.showConfirm.set(true);
  }
  onConfirmed(): void { this.confirmCb(); this.showConfirm.set(false); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getApprovalSummary().subscribe({
      next: s => { this.summary.set(s); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  typeLabel(type: string): string {
    return type === 'POLL' ? 'Poll' : type === 'MULTI_POLL' ? 'Tournament' : type === 'ANIME' ? 'Anime' : 'Character';
  }

  approve(item: ApprovalItemDto): void {
    this.askConfirm('Approve?', `Approve "${item.title}" by ${item.ownerUsername}? It will appear in the main feed.`,
      () => this.doApprove(item), false);
  }

  reject(item: ApprovalItemDto): void {
    this.askConfirm('Reject?', `Reject "${item.title}"? The creator will see status REJECTED.`,
      () => this.doReject(item));
  }

  approveDeletion(item: ApprovalItemDto): void {
    this.askConfirm('Approve deletion?', `Permanently delete "${item.title}"? This cannot be undone.`,
      () => this.doApproveDeletion(item));
  }

  rejectDeletion(item: ApprovalItemDto): void {
    this.askConfirm('Reject deletion?', `Keep "${item.title}" and cancel the deletion request?`,
      () => this.doRejectDeletion(item), false);
  }

  private doApprove(item: ApprovalItemDto): void {
    const req$ = item.type === 'POLL' ? this.api.approvePoll(item.id)
               : item.type === 'MULTI_POLL' ? this.api.approveMultiPoll(item.id)
               : item.type === 'ANIME' ? this.api.approveAnime(item.id)
               : this.api.approveCharacter(item.id);
    req$.subscribe({ next: () => { this.toast.success('Approved'); this.refresh.notify(); this.load(); }, error: e => this.toast.error(this.msg(e)) });
  }

  private doReject(item: ApprovalItemDto): void {
    const req$ = item.type === 'POLL' ? this.api.rejectPoll(item.id)
               : item.type === 'MULTI_POLL' ? this.api.rejectMultiPoll(item.id)
               : item.type === 'ANIME' ? this.api.rejectAnime(item.id)
               : this.api.rejectCharacter(item.id);
    req$.subscribe({ next: () => { this.toast.success('Rejected'); this.load(); }, error: e => this.toast.error(this.msg(e)) });
  }

  private doApproveDeletion(item: ApprovalItemDto): void {
    const req$ = item.type === 'POLL' ? this.api.approvePollDeletion(item.id) : this.api.approveMultiPollDeletion(item.id);
    req$.subscribe({ next: () => { this.toast.success('Deleted'); this.refresh.notify(); this.load(); }, error: e => this.toast.error(this.msg(e)) });
  }

  private doRejectDeletion(item: ApprovalItemDto): void {
    const req$ = item.type === 'POLL' ? this.api.rejectPollDeletion(item.id) : this.api.rejectMultiPollDeletion(item.id);
    req$.subscribe({ next: () => { this.toast.success('Deletion request cancelled'); this.load(); }, error: e => this.toast.error(this.msg(e)) });
  }

  // ── Edit before approving ─────────────────────────────────────────────────

  readonly editItem   = signal<ApprovalItemDto | null>(null);
  readonly savingEdit = signal(false);
  readonly editError  = signal<string | null>(null);
  editDirty = false;
  editForm = { name: '', title: '', anime: '', imageUrl: '', question: '' };

  startEdit(item: ApprovalItemDto): void {
    this.editError.set(null);
    this.editDirty = false;
    switch (item.type) {
      case 'ANIME':
        this.api.adminGetAnime(item.id).subscribe({
          next: a => { this.editForm = { name: a.name, title: '', anime: '', imageUrl: a.imageUrl ?? '', question: '' }; this.editItem.set(item); },
          error: e => this.toast.error(this.msg(e)),
        });
        break;
      case 'CHARACTER':
        this.api.adminGetAllCharacters().subscribe({
          next: list => {
            const c = list.find(x => x.id === item.id);
            if (!c) { this.toast.error('Character not found'); return; }
            this.editForm = { name: c.name, title: c.title ?? '', anime: c.anime ?? '', imageUrl: c.imageUrl ?? '', question: '' };
            this.editItem.set(item);
          },
          error: e => this.toast.error(this.msg(e)),
        });
        break;
      case 'POLL':
        this.api.adminGetPolls().subscribe({
          next: list => {
            const poll = list.find(x => x.id === item.id);
            if (!poll) { this.toast.error('Poll not found'); return; }
            this.editForm = { name: '', title: '', anime: poll.anime ?? '', imageUrl: '', question: poll.question };
            this.editItem.set(item);
          },
          error: e => this.toast.error(this.msg(e)),
        });
        break;
      case 'MULTI_POLL':
        this.api.adminGetMultiPolls().subscribe({
          next: list => {
            const mp = list.find(x => x.id === item.id);
            if (!mp) { this.toast.error('Multi-poll not found'); return; }
            this.editForm = { name: '', title: '', anime: mp.anime ?? '', imageUrl: '', question: mp.question };
            this.editItem.set(item);
          },
          error: e => this.toast.error(this.msg(e)),
        });
        break;
    }
  }

  onEditCloseRequest(): void {
    if (this.editDirty) {
      this.askConfirm('Discard changes?', 'You have unsaved changes. Discard them?',
        () => this.editItem.set(null), false);
    } else { this.editItem.set(null); }
  }

  saveEdit(approveAfter: boolean): void {
    const item = this.editItem();
    if (!item) return;
    if ((item.type === 'ANIME' || item.type === 'CHARACTER') && !this.editForm.name.trim()) {
      this.editError.set('Name is required'); return;
    }
    if ((item.type === 'POLL' || item.type === 'MULTI_POLL') && !this.editForm.question.trim()) {
      this.editError.set('Question is required'); return;
    }
    this.askConfirm(
      approveAfter ? 'Save and approve?' : 'Save changes?',
      approveAfter
        ? `Save the changes and publish "${item.title}"?`
        : 'Save the changes to this entry? It stays pending.',
      () => this.doSaveEdit(item, approveAfter), false);
  }

  private doSaveEdit(item: ApprovalItemDto, approveAfter: boolean): void {
    this.savingEdit.set(true);
    this.editError.set(null);
    const f = this.editForm;
    // widen to Observable<unknown> — the union of DTO observables has incompatible subscribe overloads
    const req$: import('rxjs').Observable<unknown> =
        item.type === 'ANIME'      ? this.api.adminUpdateAnime(item.id, { name: f.name, imageUrl: f.imageUrl || null })
      : item.type === 'CHARACTER'  ? this.api.adminUpdateCharacter(item.id, { name: f.name, title: f.title, anime: f.anime, imageUrl: f.imageUrl || null })
      : item.type === 'POLL'       ? this.api.adminUpdatePoll(item.id, { question: f.question, anime: f.anime, fighterIds: [] })
      :                              this.api.adminUpdateMultiPoll(item.id, { question: f.question, anime: f.anime, groups: [] });

    req$.subscribe({
      next: () => {
        this.savingEdit.set(false);
        this.editItem.set(null);
        this.editDirty = false;
        this.toast.success('Changes saved');
        if (approveAfter) { this.doApprove(item); } else { this.load(); }
      },
      error: e => { this.savingEdit.set(false); this.editError.set(this.msg(e)); },
    });
  }

  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
