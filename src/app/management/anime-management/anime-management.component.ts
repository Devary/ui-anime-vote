import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
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
import { AnimeDto, AnimeCreateDto } from '../../services/api.types';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';

@Component({
  selector: 'app-anime-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ImageUploadComponent],
  template: `
    <div class="section">

      @if (showForm()) {
        <form class="form-card" (ngSubmit)="save()">
          <h4 class="form-title">{{ editing() ? 'Edit Anime' : 'New Anime' }}</h4>
          <label class="field">
            <span>Name *</span>
            <input class="input" [(ngModel)]="form.name" name="name" placeholder="e.g. Naruto" required />
          </label>
          <label class="field">
            <span>Poster / Image</span>
            <app-image-upload [(imageUrl)]="form.imageUrl"></app-image-upload>
          </label>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          <div class="form-actions">
            <button class="btn-primary" type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (editing() ? 'Update' : 'Create') }}
            </button>
            <button class="btn-ghost" type="button" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      }

      <p-table
        #dt
        [value]="animeList()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        [globalFilterFields]="['name']"
        [loading]="loading()"
        selectionMode="multiple"
        [(selection)]="selected"
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
                      [disabled]="!selected.length"
                      (click)="delSelected()">
                Remove Selected{{ selected.length ? ' (' + selected.length + ')' : '' }}
              </button>
              <button class="btn-danger" type="button"
                      [disabled]="!animeList().length"
                      (click)="delAll()">
                Remove All
              </button>
              <button class="btn-primary" type="button" (click)="toggleForm()">
                {{ showForm() ? '✕ Cancel' : '+ Add Anime' }}
              </button>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem"><p-tableHeaderCheckbox /></th>
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
          <tr>
            <td><p-tableCheckbox [value]="anime" /></td>
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
    </div>
  `,
  styles: [`
    :host { display: block; }
    .section { display: flex; flex-direction: column; gap: 1rem; }
    .form-card { background: var(--rz-surface); border: 1px solid var(--rz-border);
                  border-radius: var(--rz-radius-md); padding: 1rem; display: flex;
                  flex-direction: column; gap: 0.75rem; }
    .form-title { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--rz-ink); }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .form-actions { display: flex; gap: 0.5rem; }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .caption-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
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

  private readonly api = inject(AnimeApiService);
  private readonly toast = inject(ToastService);

  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<AnimeDto | null>(null);
  readonly error = signal<string | null>(null);

  selected: AnimeDto[] = [];
  form: AnimeCreateDto = { name: '', imageUrl: null };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.adminGetAnimeList().subscribe({
      next: list => { this.animeList.set(list); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  toggleForm(): void {
    if (this.showForm()) { this.cancelEdit(); } else { this.showForm.set(true); }
  }

  startEdit(a: AnimeDto): void {
    this.editing.set(a);
    this.form = { name: a.name, imageUrl: a.imageUrl };
    this.showForm.set(true);
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.form = { name: '', imageUrl: null };
    this.showForm.set(false);
    this.error.set(null);
  }

  save(): void {
    this.error.set(null);
    if (!this.form.name?.trim()) { this.error.set('Name is required'); return; }
    this.saving.set(true);
    const editId = this.editing()?.id;
    const req$ = editId
      ? this.api.adminUpdateAnime(editId, this.form)
      : this.api.adminCreateAnime(this.form);

    req$.subscribe({
      next: saved => {
        if (editId) {
          this.animeList.update(l => l.map(a => a.id === editId ? saved : a));
          this.toast.success('Anime updated');
        } else {
          this.animeList.update(l => [...l, saved].sort((a, b) => a.name.localeCompare(b.name)));
          this.toast.success('Anime created');
        }
        this.saving.set(false);
        this.cancelEdit();
      },
      error: e => { this.error.set(this.msg(e)); this.saving.set(false); }
    });
  }

  del(id: string): void {
    if (!confirm('Delete this anime?')) return;
    this.api.adminDeleteAnime(id).subscribe({
      next: () => {
        this.animeList.update(l => l.filter(a => a.id !== id));
        this.selected = this.selected.filter(a => a.id !== id);
        this.toast.success('Anime deleted');
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const sel = [...this.selected];
    if (!sel.length) return;
    if (!confirm(`Delete ${sel.length} selected anime?`)) return;
    this.bulkDelete(sel.map(a => a.id), id => this.api.adminDeleteAnime(id)).subscribe(deleted => {
      this.animeList.update(l => l.filter(a => !deleted.includes(a.id)));
      this.selected = [];
      this.toast.success(`Deleted ${deleted.length}${deleted.length < sel.length ? '/' + sel.length + ' (some failed)' : ''} anime`);
    });
  }

  delAll(): void {
    const items = this.animeList();
    if (!items.length) return;
    if (!confirm(`Delete all ${items.length} anime? This cannot be undone.`)) return;
    this.bulkDelete(items.map(a => a.id), id => this.api.adminDeleteAnime(id)).subscribe(deleted => {
      this.animeList.update(l => l.filter(a => !deleted.includes(a.id)));
      this.selected = [];
      this.toast.success(`Deleted ${deleted.length}${deleted.length < items.length ? '/' + items.length + ' (some failed)' : ''} anime`);
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
