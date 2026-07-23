import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DataRefreshService } from '../../services/data-refresh.service';
import { AuditEventDto } from '../../services/api.types';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

/** Content audit trail: who created/modified/approved/deleted what and when, with version restore. */
@Component({
  selector: 'app-audit-management',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  template: `
    <div class="audit">
      <div class="section-header">
        <span class="section-title">Audit trail</span>
        <button class="btn-ghost-sm" (click)="load()" [disabled]="loading()">↻ Refresh</button>
      </div>

      @if (loading()) { <div class="loading">Loading…</div> }
      @if (!loading() && !events().length) { <div class="empty">No audit events yet.</div> }

      @for (e of events(); track e.id) {
        <div class="audit-row">
          <span class="action-badge" [class]="'action-' + e.action">{{ e.action }}</span>
          <span class="entity-type">{{ e.entityType }}</span>
          <div class="details">
            <span class="summary">{{ summaryOf(e) }}</span>
            <span class="meta">by {{ e.username ?? 'system' }} · {{ e.at | date:'medium' }}</span>
          </div>
          @if (e.restorable && e.action !== 'DELETED') {
            <button class="btn-restore" (click)="askRestore(e)">⤺ Restore this version</button>
          }
        </div>
      }

      @if (showConfirm()) {
        <app-confirm-modal
          [title]="confirmTitle()" [message]="confirmMsg()" [danger]="false"
          (confirmed)="onConfirmed()" (cancelled)="showConfirm.set(false)" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .audit { display: flex; flex-direction: column; gap: 0.5rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; }
    .section-title { font-size: 1rem; font-weight: 800; color: var(--rz-ink); }
    .btn-ghost-sm { border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink-muted);
                    border-radius: var(--rz-radius-sm); padding: 0.25rem 0.6rem; cursor: pointer; }
    .loading, .empty { color: var(--rz-ink-muted); font-size: 0.85rem; padding: 0.8rem 0; }
    .audit-row { display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem 0.7rem;
                 border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-md); }
    .action-badge { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.05em; padding: 0.18rem 0.5rem;
                    border-radius: var(--rz-radius-full); flex-shrink: 0; }
    .action-CREATED  { background: rgba(34,197,94,0.14);  color: #22c55e; }
    .action-UPDATED  { background: rgba(59,130,246,0.14); color: #3b82f6; }
    .action-DELETED  { background: rgba(239,68,68,0.14);  color: #ef4444; }
    .action-APPROVED { background: rgba(16,185,129,0.14); color: #10b981; }
    .action-REJECTED { background: rgba(245,158,11,0.14); color: #f59e0b; }
    .action-RESTORED { background: rgba(168,85,247,0.14); color: #a855f7; }
    .entity-type { font-size: 0.62rem; font-weight: 700; color: var(--rz-ink-faint); flex-shrink: 0; }
    .details { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
    .summary { font-size: 0.82rem; font-weight: 600; color: var(--rz-ink);
               overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta { font-size: 0.68rem; color: var(--rz-ink-muted); }
    .btn-restore { border: none; background: rgba(168,85,247,0.14); color: #a855f7; font-weight: 700;
                   border-radius: var(--rz-radius-sm); padding: 0.3rem 0.7rem; cursor: pointer; flex-shrink: 0; }
    .btn-restore:hover { background: rgba(168,85,247,0.26); }
  `],
})
export class AuditManagementComponent implements OnInit {
  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);

  readonly events  = signal<AuditEventDto[]>([]);
  readonly loading = signal(false);

  readonly showConfirm  = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmMsg   = signal('');
  private confirmCb: () => void = () => {};
  onConfirmed(): void { this.confirmCb(); this.showConfirm.set(false); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAuditRecent(100).subscribe({
      next: list => { this.events.set(list); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); },
    });
  }

  /** Best human label from the snapshot JSON (name or question), else the entity id. */
  summaryOf(e: AuditEventDto): string {
    if (e.snapshot) {
      try {
        const snap = JSON.parse(e.snapshot);
        if (snap.name) return snap.name;
        if (snap.question) return snap.question;
      } catch { /* keep fallback */ }
    }
    return e.entityId;
  }

  askRestore(e: AuditEventDto): void {
    this.confirmTitle.set('Restore this version?');
    this.confirmMsg.set(`Revert "${this.summaryOf(e)}" (${e.entityType}) to its state of ${new Date(e.at).toLocaleString()}?`);
    this.confirmCb = () => this.doRestore(e);
    this.showConfirm.set(true);
  }

  private doRestore(e: AuditEventDto): void {
    this.api.restoreAuditEvent(e.id).subscribe({
      next: () => { this.toast.success('Version restored'); this.refresh.notify(); this.load(); },
      error: err => this.toast.error(this.msg(err)),
    });
  }

  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
