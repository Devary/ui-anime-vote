import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DataRefreshService } from '../../services/data-refresh.service';
import { AnimeDto, AnimeCreateDto } from '../../services/api.types';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { CrudModalComponent } from '../../shared/crud-modal/crud-modal.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-anime-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ImageUploadComponent, CrudModalComponent, ConfirmModalComponent],
  template: `
    <div class="section">

      <p-table
        #dt
        [value]="animeList()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        [globalFilterFields]="['name']"
        [loading]="loading()"
        sortMode="single"
        dataKey="id">

        <ng-template pTemplate="caption">
          <div class="table-caption">
            <p-iconfield>
              <p-inputicon styleClass="pi pi-search" />
              <input pInputText type="text"
                     (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                     placeholder="Search anime…" />
            </p-iconfield>
            <div class="caption-actions">
              <button class="btn-danger" type="button"
                      [disabled]="!selectedIds().size"
                      (click)="delSelected()">
                Remove Selected{{ selectedIds().size ? ' (' + selectedIds().size + ')' : '' }}
              </button>
              <button class="btn-danger" type="button"
                      [disabled]="!animeList().length"
                      (click)="delAll()">
                Remove All
              </button>
              <button class="btn-primary" type="button" (click)="openNew()">
                + Add Anime
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
            <th style="width:60px">Poster</th>
            <th pSortableColumn="name">
              Name
              <p-sortIcon field="name" />
              <p-columnFilter type="text" field="name" display="menu" />
            </th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-anime>
          <tr [class.row-selected]="selectedIds().has(anime.id)">
            <td>
              <input type="checkbox" class="row-check"
                     [checked]="selectedIds().has(anime.id)"
                     (change)="toggleRow(anime.id)" />
            </td>
            <td>
              @if (anime.imageUrl) {
                <img class="thumb" [src]="anime.imageUrl" [alt]="anime.name" (error)="onImgErr($event)" />
              } @else {
                <div class="no-img">—</div>
              }
            </td>
            <td class="name-cell">{{ anime.name }}</td>
            <td class="actions-cell">
              <button class="btn-icon" (click)="startEdit(anime)" title="Edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon danger" (click)="del(anime.id)" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="4">No anime found.</td></tr>
        </ng-template>

      </p-table>

      <!-- Form modal -->
      @if (showForm()) {
        <app-crud-modal [title]="editing() ? 'Edit Anime' : 'New Anime'" (closeRequest)="onCloseRequest()">
          <form (ngSubmit)="requestSave()">
            <label class="field">
              <span>Name *</span>
              <input class="input" [(ngModel)]="form.name" name="name" placeholder="e.g. Naruto"
                     (ngModelChange)="markDirty()" required />
            </label>
            <label class="field">
              <span>Poster / Image</span>
              <app-image-upload [(imageUrl)]="form.imageUrl" (imageUrlChange)="markDirty()"></app-image-upload>
            </label>
            @if (error()) { <div class="error-msg">{{ error() }}</div> }
            <div class="form-actions">
              <button class="btn-ghost" type="button" (click)="onCloseRequest()">Cancel</button>
              <button class="btn-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : (editing() ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
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
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.25rem; }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .caption-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .row-check { width: 15px; height: 15px; cursor: pointer; accent-color: var(--rz-primary); }
    .row-selected td { background: rgba(21, 101, 192, 0.08); }
    .thumb { width: 40px; height: 40px; object-fit: cover; border-radius: var(--rz-radius-sm); }
    .no-img { width: 40px; height: 40px; background: var(--rz-surface-hover);
               border-radius: var(--rz-radius-sm); display: flex; align-items: center;
               justify-content: center; color: var(--rz-ink-faint); font-size: 0.7rem; }
    .name-cell { font-weight: 600; }
    .actions-cell { display: flex; gap: 0.4rem; align-items: center; }
    .btn-primary { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm); border: none;
                    background: var(--rz-primary); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: default; }
    .btn-ghost { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm);
                  border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink);
                  font-size: 0.8rem; cursor: pointer; }
    .btn-ghost:hover { background: var(--rz-surface-hover); }
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
export class AnimeManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);

  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly showForm  = signal(false);
  readonly editing   = signal<AnimeDto | null>(null);
  readonly error     = signal<string | null>(null);
  readonly selectedIds = signal(new Set<string>());

  readonly allSelected = computed(() =>
    this.animeList().length > 0 && this.selectedIds().size === this.animeList().length
  );
  readonly someSelected = computed(() =>
    this.selectedIds().size > 0 && this.selectedIds().size < this.animeList().length
  );

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

  // ── Dirty tracking ───────────────────────────────────────────────────────────
  readonly isDirty = signal(false);
  markDirty(): void { this.isDirty.set(true); }

  form: AnimeCreateDto = { name: '', imageUrl: null };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.adminGetAnimeList().subscribe({
      next: list => { this.animeList.set(list); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  toggleRow(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.animeList().map(a => a.id)));
    }
  }

  openNew(): void {
    this.editing.set(null);
    this.form = { name: '', imageUrl: null };
    this.error.set(null);
    this.isDirty.set(false);
    this.showForm.set(true);
  }

  startEdit(a: AnimeDto): void {
    this.editing.set(a);
    this.form = { name: a.name, imageUrl: a.imageUrl };
    this.error.set(null);
    this.isDirty.set(false);
    this.showForm.set(true);
  }

  onCloseRequest(): void {
    if (this.isDirty()) {
      this.askConfirm('Discard changes?', 'You have unsaved changes. Discard them?',
        () => this.closeForm(), false);
    } else { this.closeForm(); }
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
    this.isDirty.set(false);
    this.error.set(null);
    this.form = { name: '', imageUrl: null };
  }

  requestSave(): void {
    if (!this.form.name?.trim()) { this.error.set('Name is required'); return; }
    const editId = this.editing()?.id;
    this.askConfirm(
      editId ? 'Save changes?' : 'Create anime?',
      editId ? 'Save the changes to this anime?' : 'Create this new anime?',
      () => this.doSave(), false
    );
  }

  private doSave(): void {
    this.saving.set(true);
    this.error.set(null);
    const editId = this.editing()?.id;
    const req$ = editId
      ? this.api.adminUpdateAnime(editId, this.form)
      : this.api.adminCreateAnime(this.form);

    req$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Anime updated' : 'Anime created');
        this.saving.set(false);
        this.closeForm();
        this.load();
        this.refresh.notify();
      },
      error: e => { this.error.set(this.msg(e)); this.saving.set(false); }
    });
  }

  del(id: string): void {
    this.askConfirm('Delete anime?', 'This action cannot be undone.',
      () => this.doDelete(id));
  }

  private doDelete(id: string): void {
    this.api.adminDeleteAnime(id).subscribe({
      next: () => {
        this.toast.success('Anime deleted');
        this.load();
        this.refresh.notify();
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.askConfirm(`Delete ${ids.length} anime?`, 'This action cannot be undone.',
      () => this.doBulkDelete(ids));
  }

  delAll(): void {
    const items = this.animeList();
    if (!items.length) return;
    this.askConfirm(`Delete all ${items.length} anime?`, 'This action cannot be undone.',
      () => this.doBulkDelete(items.map(a => a.id)));
  }

  private doBulkDelete(ids: string[]): void {
    this.bulkDelete(ids, id => this.api.adminDeleteAnime(id)).subscribe(deleted => {
      this.toast.success(`Deleted ${deleted.length}${deleted.length < ids.length ? '/' + ids.length + ' (some failed)' : ''} anime`);
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

  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }
  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
