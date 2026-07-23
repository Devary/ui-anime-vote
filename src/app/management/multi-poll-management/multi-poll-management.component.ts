import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DataRefreshService } from '../../services/data-refresh.service';
import { PollExportService } from '../../services/poll-export.service';
import { AnimeDto, CharacterDto, MultiPollAdminDto, MultiPollCreateDto } from '../../services/api.types';
import { CharOption } from '../poll-group-form/poll-group-form.component';
import { CrudModalComponent } from '../../shared/crud-modal/crud-modal.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';
import { MultiPollWizardComponent } from '../../shared/multi-poll-wizard/multi-poll-wizard.component';
import { pollTimeStatus, pollRemainingLabel } from '../../shared/poll-time';

@Component({
  selector: 'app-multi-poll-management',
  standalone: true,
  imports: [CommonModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, CrudModalComponent, ConfirmModalComponent, MultiPollWizardComponent],
  template: `
    <div class="section">

      <p-table
        #dt
        [value]="multiPolls()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        [globalFilterFields]="['anime', 'question']"
        [loading]="loading()"
        sortMode="single"
        dataKey="id">

        <ng-template pTemplate="caption">
          <div class="table-caption">
            <p-iconfield>
              <p-inputicon styleClass="pi pi-search" />
              <input pInputText type="text"
                     (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                     placeholder="Search multi-polls…" />
            </p-iconfield>
            <div class="caption-actions">
              <button class="btn-danger" type="button"
                      [disabled]="!selectedIds().size"
                      (click)="delSelected()">
                Remove Selected{{ selectedIds().size ? ' (' + selectedIds().size + ')' : '' }}
              </button>
              <button class="btn-danger" type="button"
                      [disabled]="!multiPolls().length"
                      (click)="delAll()">
                Remove All
              </button>
              <button class="btn-primary" type="button" (click)="openNew()">
                + New Multi-Poll
              </button>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem">
              <input type="checkbox" class="row-check"
                     [checked]="allSelected()"
                     [indeterminate]="someSelected()"
                     (change)="toggleAll()" />
            </th>
            <th pSortableColumn="anime">
              Anime <p-sortIcon field="anime" />
              <p-columnFilter type="text" field="anime" display="menu" />
            </th>
            <th pSortableColumn="question">
              Question <p-sortIcon field="question" />
              <p-columnFilter type="text" field="question" display="menu" />
            </th>
            <th style="width:100px">Visibility</th>
            <th style="width:90px">Mode</th>
            <th style="width:130px">Status</th>
            <th style="width:90px">Groups</th>
            <th style="width:110px">Candidates</th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-mp>
          <tr [class.row-selected]="selectedIds().has(mp.id)">
            <td>
              <input type="checkbox" class="row-check"
                     [checked]="selectedIds().has(mp.id)"
                     (change)="toggleRow(mp.id)" />
            </td>
            <td class="muted-cell">{{ mp.anime || '—' }}</td>
            <td class="name-cell">{{ mp.question }}</td>
            <td><span class="vis-badge" [class]="'vis-' + (mp.visibility || 'PUBLIC')">{{ mp.visibility || 'PUBLIC' }}</span></td>
            <td><span class="mode-badge">{{ mp.votingByGroup ? 'Group' : 'Character' }}</span></td>
            <td>
              <span class="time-badge" [class]="'time-' + timeStatus(mp)">{{ remaining(mp) }}</span>
            </td>
            <td class="center-cell">{{ mp.groups?.length ?? 0 }}</td>
            <td class="center-cell">{{ totalCandidates(mp) }}</td>
            <td class="actions-cell">
              <button class="btn-icon" (click)="startEdit(mp)" title="Edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon" (click)="download(mp)" title="Download hierarchy">
                <i class="pi pi-download"></i>
              </button>
              <button class="btn-icon danger" (click)="del(mp.id)" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9">No multi-polls found.</td></tr>
        </ng-template>
      </p-table>

      <!-- Wizard modal -->
      @if (showForm()) {
        <app-crud-modal [title]="editing() ? 'Edit Multi-Poll' : 'New Multi-Poll'" (closeRequest)="onCloseRequest()">
          <app-multi-poll-wizard #wizard
            mode="admin"
            [animeList]="animeList()"
            [charOptions]="charOptions()"
            [editing]="editing()"
            [serverNow]="serverNow"
            [saving]="saving()"
            [error]="error()"
            [dupError]="dupError()"
            (dupErrorDismiss)="dupError.set(null)"
            (save)="onWizardSave($event)"
            (cancelRequest)="onCloseRequest()" />
        </app-crud-modal>
      }

      <!-- Confirm modal -->
      @if (showConfirm()) {
        <app-confirm-modal
          [title]="confirmTitle()"
          [message]="confirmMsg()"
          [danger]="isDanger()"
          (confirmed)="onConfirmed()"
          (cancelled)="onCancelled()" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .section { display: flex; flex-direction: column; gap: 1rem; }

    /* Table */
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .caption-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .row-check { width: 15px; height: 15px; cursor: pointer; accent-color: var(--rz-primary); }
    .row-selected td { background: rgba(21, 101, 192, 0.08); }
    .name-cell { font-weight: 600; }
    .muted-cell { color: var(--rz-ink-muted); }
    .center-cell { text-align: center; color: var(--rz-ink-muted); }
    .actions-cell { display: flex; gap: 0.4rem; align-items: center; }

    .vis-badge { font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.02em; }
    .vis-PUBLIC { background: rgba(34,197,94,0.12); color: #16a34a; }
    .vis-PRIVATE { background: rgba(239,68,68,0.12); color: #dc2626; }
    .vis-AUTHENTICATED { background: rgba(59,130,246,0.12); color: #2563eb; }
    .vis-RESTRICTED { background: rgba(124,58,237,0.12); color: #7c3aed; }

    .mode-badge { font-size: 0.7rem; font-weight: 600; color: var(--rz-ink-muted); }

    .time-badge { font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 99px; white-space: nowrap; }
    .time-upcoming { background: rgba(251,192,45,0.15); color: #f59e0b; }
    .time-live     { background: rgba(34,197,94,0.12); color: #16a34a; }
    .time-finished { background: var(--rz-surface-hover); color: var(--rz-ink-muted); }
    .time-unknown  { background: var(--rz-surface-hover); color: var(--rz-ink-faint); }

    .btn-primary { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm); border: none;
                    background: var(--rz-primary); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: default; }
    .btn-danger { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm);
                   border: 1px solid var(--rz-danger); background: var(--rz-danger-bg);
                   color: var(--rz-danger); font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-danger:hover:not(:disabled) { background: var(--rz-danger); color: #fff; }
    .btn-danger:disabled { opacity: 0.4; cursor: default; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.3rem 0.4rem;
                 border-radius: var(--rz-radius-sm); color: var(--rz-ink-muted); }
    .btn-icon:hover { background: var(--rz-surface-hover); color: var(--rz-ink); }
    .btn-icon.danger:hover { background: var(--rz-danger-bg); color: var(--rz-danger); }
  `]
})
export class MultiPollManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  @ViewChild('wizard') wizard?: MultiPollWizardComponent;

  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);
  private readonly export  = inject(PollExportService);

  readonly multiPolls = signal<MultiPollAdminDto[]>([]);
  readonly chars       = signal<CharacterDto[]>([]);
  readonly animeList   = signal<AnimeDto[]>([]);
  readonly loading     = signal(false);
  readonly saving      = signal(false);
  readonly showForm    = signal(false);
  readonly editing     = signal<MultiPollAdminDto | null>(null);
  readonly error       = signal<string | null>(null);
  readonly dupError    = signal<string | null>(null);
  readonly selectedIds = signal(new Set<string>());

  readonly allSelected = computed(() =>
    this.multiPolls().length > 0 && this.selectedIds().size === this.multiPolls().length
  );
  readonly someSelected = computed(() =>
    this.selectedIds().size > 0 && this.selectedIds().size < this.multiPolls().length
  );

  readonly charOptions = computed<CharOption[]>(() =>
    this.chars().map(c => ({
      id: c.id,
      displayName: c.anime ? `${c.name} (${c.anime})` : c.name,
      imageUrl: c.imageUrl
    }))
  );

  timeStatus(mp: MultiPollAdminDto): string { return pollTimeStatus(mp.groups); }
  remaining(mp: MultiPollAdminDto): string { return pollRemainingLabel(mp.groups); }

  // ── Confirm modal state ──────────────────────────────────────────────────────
  readonly showConfirm  = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmMsg   = signal('');
  readonly isDanger     = signal(true);
  private confirmCb: () => void = () => {};

  private askConfirm(title: string, msg: string, cb: () => void, danger = true): void {
    this.confirmTitle.set(title); this.confirmMsg.set(msg);
    this.isDanger.set(danger); this.confirmCb = cb;
    this.showConfirm.set(true);
  }
  onConfirmed(): void { this.confirmCb(); this.showConfirm.set(false); }
  onCancelled(): void { this.showConfirm.set(false); }

  serverNow = new Date();

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
    this.api.adminGetAnimeList().subscribe({ next: l => this.animeList.set(l) });
    this.api.adminGetAllCharacters().subscribe({ next: l => this.chars.set(l) });
  }

  load(): void {
    this.loading.set(true);
    this.api.adminGetMultiPolls().subscribe({
      next: list => { this.multiPolls.set(list); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  toggleRow(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.multiPolls().map(mp => mp.id)));
    }
  }

  // ── UI actions ─────────────────────────────────────────────────────────────

  openNew(): void {
    this.editing.set(null);
    this.api.getServerTime().subscribe({ next: t => { this.serverNow = new Date(t.now); } });
    this.error.set(null);
    this.dupError.set(null);
    this.showForm.set(true);
  }

  startEdit(mp: MultiPollAdminDto): void {
    this.editing.set(mp);
    this.error.set(null);
    this.dupError.set(null);
    this.showForm.set(true);
  }

  onCloseRequest(): void {
    if (this.wizard?.dirty) {
      this.askConfirm('Discard changes?', 'You have unsaved changes. Discard them?',
        () => this.closeForm(), false);
    } else { this.closeForm(); }
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
    this.error.set(null);
    this.dupError.set(null);
  }

  onWizardSave(dto: MultiPollCreateDto): void {
    const editId = this.editing()?.id;
    this.askConfirm(
      editId ? 'Save changes?' : 'Create multi-poll?',
      editId ? 'Save the changes to this multi-poll?' : 'Create this new multi-poll?',
      () => this.doSave(dto), false
    );
  }

  private doSave(dto: MultiPollCreateDto): void {
    this.saving.set(true);
    const editId = this.editing()?.id;
    const req$ = editId
      ? this.api.adminUpdateMultiPoll(editId, dto)
      : this.api.adminCreateMultiPoll(dto);

    req$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Multi-poll updated' : 'Multi-poll created');
        this.saving.set(false);
        this.closeForm();
        this.load();
        this.refresh.notify();
      },
      error: e => {
        this.saving.set(false);
        if (e?.status === 409) { this.dupError.set(this.msg(e)); }
        else { this.error.set(this.msg(e)); }
      }
    });
  }

  download(mp: MultiPollAdminDto): void { this.export.downloadMultiPoll(mp).catch(e => this.toast.error(this.msg(e))); }

  del(id: string): void {
    this.askConfirm('Delete multi-poll?', 'This will delete the multi-poll and all its votes. This action cannot be undone.',
      () => this.doDelete(id));
  }

  private doDelete(id: string): void {
    this.api.adminDeleteMultiPoll(id).subscribe({
      next: () => {
        this.toast.success('Multi-poll deleted');
        this.load();
        this.refresh.notify();
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.askConfirm(`Delete ${ids.length} multi-polls?`, 'This will delete the selected multi-polls and all their votes. This action cannot be undone.',
      () => this.doBulkDelete(ids));
  }

  delAll(): void {
    const items = this.multiPolls();
    if (!items.length) return;
    this.askConfirm(`Delete all ${items.length} multi-polls?`, 'This will delete all multi-polls and their votes. This action cannot be undone.',
      () => this.doBulkDelete(items.map(mp => mp.id)));
  }

  private doBulkDelete(ids: string[]): void {
    this.bulkDelete(ids, id => this.api.adminDeleteMultiPoll(id)).subscribe(deleted => {
      this.toast.success(`Deleted ${deleted.length}${deleted.length < ids.length ? '/' + ids.length + ' (some failed)' : ''} multi-polls`);
      this.selectedIds.set(new Set());
      this.load();
      this.refresh.notify();
    });
  }

  private bulkDelete(ids: string[], fn: (id: string) => any) {
    return forkJoin(ids.map(id => (fn(id) as any).pipe(
      map(() => id as string | null),
      catchError(() => of(null))
    ))).pipe(map(results => results.filter((r): r is string => r !== null)));
  }

  totalCandidates(mp: MultiPollAdminDto): number {
    return (mp.groups ?? []).reduce((s, g) => s + (g.candidates?.length ?? 0), 0);
  }

  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
