import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { AnimeDto, CharacterDto, CharacterCreateDto } from '../../services/api.types';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';

@Component({
  selector: 'app-character-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, ImageUploadComponent],
  template: `
    <div class="section">

      @if (showForm()) {
        <form class="form-card" (ngSubmit)="save()">
          <h4 class="form-title">{{ editing() ? 'Edit Character' : 'New Character' }}</h4>
          <div class="form-grid">
            <label class="field">
              <span>Name *</span>
              <input class="input" [(ngModel)]="form.name" name="cname" placeholder="e.g. Naruto Uzumaki" required />
            </label>
            <label class="field">
              <span>Title / Role</span>
              <input class="input" [(ngModel)]="form.title" name="ctitle" placeholder="e.g. Hokage" />
            </label>
            <label class="field">
              <span>Anime</span>
              <input class="input" list="char-anime-dl" [(ngModel)]="form.anime" name="canime"
                     placeholder="Select or type anime…" />
              <datalist id="char-anime-dl">
                @for (a of animeList(); track a.id) {
                  <option [value]="a.name"></option>
                }
              </datalist>
            </label>
          </div>
          <label class="field">
            <span>Image</span>
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
            <button class="btn-primary" type="button" (click)="toggleForm()">
              {{ showForm() ? '✕ Cancel' : '+ Add Character' }}
            </button>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
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
          <tr>
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
          <tr><td colspan="5">No characters found.</td></tr>
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
    .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .form-actions { display: flex; gap: 0.5rem; }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
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
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.3rem 0.4rem;
                 border-radius: var(--rz-radius-sm); color: var(--rz-ink-muted); }
    .btn-icon:hover { background: var(--rz-surface-hover); color: var(--rz-ink); }
    .btn-icon.danger:hover { background: var(--rz-danger-bg); color: var(--rz-danger); }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class CharacterManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  private readonly api = inject(AnimeApiService);
  private readonly toast = inject(ToastService);

  readonly chars = signal<CharacterDto[]>([]);
  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<CharacterDto | null>(null);
  readonly error = signal<string | null>(null);

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

  toggleForm(): void {
    if (this.showForm()) { this.cancelEdit(); } else { this.showForm.set(true); }
  }

  startEdit(c: CharacterDto): void {
    this.editing.set(c);
    this.form = { name: c.name, title: c.title ?? '', anime: c.anime ?? '', imageUrl: c.imageUrl ?? null };
    this.showForm.set(true);
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.form = { name: '', title: '', anime: '', imageUrl: null };
    this.showForm.set(false);
    this.error.set(null);
  }

  save(): void {
    this.error.set(null);
    if (!this.form.name?.trim()) { this.error.set('Name is required'); return; }
    this.saving.set(true);
    const editId = this.editing()?.id;
    const req$ = editId
      ? this.api.adminUpdateCharacter(editId, this.form)
      : this.api.adminCreateCharacter(this.form);

    req$.subscribe({
      next: saved => {
        if (editId) {
          this.chars.update(l => l.map(c => c.id === editId ? saved : c));
          this.toast.success('Character updated');
        } else {
          this.chars.update(l => [...l, saved]);
          this.toast.success('Character created');
        }
        this.saving.set(false);
        this.cancelEdit();
      },
      error: e => { this.error.set(this.msg(e)); this.saving.set(false); }
    });
  }

  del(id: string): void {
    if (!confirm('Delete this character? This may affect existing polls.')) return;
    this.api.adminDeleteCharacter(id).subscribe({
      next: () => { this.chars.update(l => l.filter(c => c.id !== id)); this.toast.success('Character deleted'); },
      error: e => this.toast.error(this.msg(e))
    });
  }

  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }
  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
