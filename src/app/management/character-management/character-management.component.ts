import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DataRefreshService } from '../../services/data-refresh.service';
import { AnimeDto, CharacterDto, CharacterCreateDto } from '../../services/api.types';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { CrudModalComponent } from '../../shared/crud-modal/crud-modal.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-character-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, ImageUploadComponent, CrudModalComponent, ConfirmModalComponent],
  template: `
    <div class="section">

      <p-table
        #dt
        [value]="chars()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        [globalFilterFields]="['name', 'title', 'anime']"
        [loading]="loading()"
        sortMode="single"
        dataKey="id">

        <ng-template pTemplate="caption">
          <div class="table-caption">
            <p-iconfield>
              <p-inputicon styleClass="pi pi-search" />
              <input pInputText type="text"
                     (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                     placeholder="Search characters…" />
            </p-iconfield>
            <div class="caption-actions">
              <button class="btn-danger" type="button"
                      [disabled]="!selectedIds().size"
                      (click)="delSelected()">
                Remove Selected{{ selectedIds().size ? ' (' + selectedIds().size + ')' : '' }}
              </button>
              <button class="btn-danger" type="button"
                      [disabled]="!chars().length"
                      (click)="delAll()">
                Remove All
              </button>
              <button class="btn-primary" type="button" (click)="openNew()">
                + Add Character
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
            <th style="width:60px">Image</th>
            <th pSortableColumn="name">
              Name
              <p-sortIcon field="name" />
              <p-columnFilter type="text" field="name" display="menu" />
            </th>
            <th pSortableColumn="title">
              Title
              <p-sortIcon field="title" />
              <p-columnFilter type="text" field="title" display="menu" />
            </th>
            <th pSortableColumn="anime">
              Anime
              <p-sortIcon field="anime" />
              <p-columnFilter type="text" field="anime" display="menu" />
            </th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-c>
          <tr [class.row-selected]="selectedIds().has(c.id)">
            <td>
              <input type="checkbox" class="row-check"
                     [checked]="selectedIds().has(c.id)"
                     (change)="toggleRow(c.id)" />
            </td>
            <td>
              @if (c.imageUrl) {
                <img class="thumb" [src]="c.imageUrl" [alt]="c.name" (error)="onImgErr($event)" />
              } @else {
                <div class="no-img">—</div>
              }
            </td>
            <td class="name-cell">{{ c.name }}</td>
            <td class="muted-cell">{{ c.title || '—' }}</td>
            <td class="muted-cell">{{ c.anime || '—' }}</td>
            <td class="actions-cell">
              <button class="btn-icon" (click)="startEdit(c)" title="Edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon danger" (click)="del(c.id)" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">No characters found.</td></tr>
        </ng-template>

      </p-table>

      <!-- Form modal -->
      @if (showForm()) {
        <app-crud-modal [title]="editing() ? 'Edit Character' : 'New Character'" (closeRequest)="onCloseRequest()">
          <form (ngSubmit)="requestSave()">
            <div class="form-grid">
              <label class="field">
                <span>Name *</span>
                <input class="input" [(ngModel)]="form.name" name="cname" placeholder="e.g. Naruto Uzumaki"
                       (ngModelChange)="markDirty()" required />
              </label>
              <label class="field">
                <span>Title / Role</span>
                <input class="input" [(ngModel)]="form.title" name="ctitle" placeholder="e.g. Hokage"
                       (ngModelChange)="markDirty()" />
              </label>
              <label class="field">
                <span>Anime</span>
                <p-select
                  [options]="animeList()"
                  [(ngModel)]="form.anime"
                  optionLabel="name"
                  optionValue="name"
                  [filter]="true"
                  filterBy="name"
                  [editable]="true"
                  [showClear]="true"
                  placeholder="Select or type anime…"
                  name="canime"
                  (onChange)="markDirty()"
                  appendTo="body" />
              </label>
            </div>
            <label class="field">
              <span>Image</span>
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
    .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
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
    .muted-cell { color: var(--rz-ink-muted); }
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
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class CharacterManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);

  readonly chars     = signal<CharacterDto[]>([]);
  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading   = signal(false);
  readonly saving    = signal(false);
  readonly showForm  = signal(false);
  readonly editing   = signal<CharacterDto | null>(null);
  readonly error     = signal<string | null>(null);
  readonly selectedIds = signal(new Set<string>());

  readonly allSelected = computed(() =>
    this.chars().length > 0 && this.selectedIds().size === this.chars().length
  );
  readonly someSelected = computed(() =>
    this.selectedIds().size > 0 && this.selectedIds().size < this.chars().length
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

  form: CharacterCreateDto = { name: '', title: '', anime: '', imageUrl: null };

  ngOnInit(): void {
    this.load();
    this.api.adminGetAnimeList().subscribe({ next: l => this.animeList.set(l) });
  }

  load(): void {
    this.loading.set(true);
    this.api.adminGetAllCharacters().subscribe({
      next: list => { this.chars.set(list); this.loading.set(false); },
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
      this.selectedIds.set(new Set(this.chars().map(c => c.id)));
    }
  }

  openNew(): void {
    this.editing.set(null);
    this.form = { name: '', title: '', anime: '', imageUrl: null };
    this.error.set(null);
    this.isDirty.set(false);
    this.showForm.set(true);
  }

  startEdit(c: CharacterDto): void {
    this.editing.set(c);
    this.form = { name: c.name, title: c.title ?? '', anime: c.anime ?? '', imageUrl: c.imageUrl ?? null };
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
    this.form = { name: '', title: '', anime: '', imageUrl: null };
  }

  requestSave(): void {
    if (!this.form.name?.trim()) { this.error.set('Name is required'); return; }
    const editId = this.editing()?.id;
    this.askConfirm(
      editId ? 'Save changes?' : 'Create character?',
      editId ? 'Save the changes to this character?' : 'Create this new character?',
      () => this.doSave(), false
    );
  }

  private doSave(): void {
    this.saving.set(true);
    this.error.set(null);
    const editId = this.editing()?.id;
    const req$ = editId
      ? this.api.adminUpdateCharacter(editId, this.form)
      : this.api.adminCreateCharacter(this.form);

    req$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Character updated' : 'Character created');
        this.saving.set(false);
        this.closeForm();
        this.load();
        this.refresh.notify();
      },
      error: e => { this.error.set(this.msg(e)); this.saving.set(false); }
    });
  }

  del(id: string): void {
    this.askConfirm('Delete character?', 'This action cannot be undone. This may affect existing polls.',
      () => this.doDelete(id));
  }

  private doDelete(id: string): void {
    this.api.adminDeleteCharacter(id).subscribe({
      next: () => {
        this.toast.success('Character deleted');
        this.load();
        this.refresh.notify();
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.askConfirm(`Delete ${ids.length} characters?`, 'This action cannot be undone. This may affect existing polls.',
      () => this.doBulkDelete(ids));
  }

  delAll(): void {
    const items = this.chars();
    if (!items.length) return;
    this.askConfirm(`Delete all ${items.length} characters?`, 'This action cannot be undone. This may affect existing polls.',
      () => this.doBulkDelete(items.map(c => c.id)));
  }

  private doBulkDelete(ids: string[]): void {
    this.bulkDelete(ids, id => this.api.adminDeleteCharacter(id)).subscribe(deleted => {
      this.toast.success(`Deleted ${deleted.length}${deleted.length < ids.length ? '/' + ids.length + ' (some failed)' : ''} characters`);
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
