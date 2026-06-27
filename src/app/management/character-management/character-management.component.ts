import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { AnimeDto, CharacterDto, CharacterCreateDto } from '../../services/api.types';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';

@Component({
  selector: 'app-character-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent],
  template: `
    <div class="section">
      <div class="section-toolbar">
        <div class="toolbar-left">
          <span class="count">{{ filtered().length }} / {{ chars().length }} characters</span>
          <input class="search-input" [(ngModel)]="searchTerm" placeholder="Search…" />
        </div>
        <button class="btn-primary" (click)="toggleForm()">
          {{ showForm() ? 'Cancel' : '+ Add Character' }}
        </button>
      </div>

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
              <input class="input" list="anime-datalist" [(ngModel)]="form.anime" name="canime"
                     placeholder="Select or type anime…" />
              <datalist id="anime-datalist">
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
          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }
          <div class="form-actions">
            <button class="btn-primary" type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (editing() ? 'Update' : 'Create') }}
            </button>
            <button class="btn-ghost" type="button" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      }

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Image</th><th>Name</th><th>Title</th><th>Anime</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (c of filtered(); track c.id) {
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
                  <button class="btn-icon" (click)="startEdit(c)" title="Edit">✏</button>
                  <button class="btn-icon danger" (click)="del(c.id)" title="Delete">🗑</button>
                </td>
              </tr>
            }
            @if (filtered().length === 0 && !loading()) {
              <tr><td colspan="5" class="empty-cell">No characters found.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .section { display: flex; flex-direction: column; gap: 1rem; }
    .section-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .toolbar-left { display: flex; align-items: center; gap: 0.75rem; }
    .count { font-size: 0.82rem; color: var(--rz-ink-muted); white-space: nowrap; }
    .search-input { padding: 0.35rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
                     background: var(--rz-surface); color: var(--rz-ink); font-size: 0.82rem; width: 180px; }
    .search-input:focus { outline: none; border-color: var(--rz-primary); }
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
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .data-table th { text-align: left; padding: 0.5rem 0.75rem; color: var(--rz-ink-muted);
                      font-size: 0.75rem; font-weight: 600; border-bottom: 1px solid var(--rz-border); }
    .data-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--rz-border-faint);
                      color: var(--rz-ink); vertical-align: middle; }
    .thumb { width: 40px; height: 40px; object-fit: cover; border-radius: var(--rz-radius-sm); }
    .no-img { width: 40px; height: 40px; background: var(--rz-surface-hover);
               border-radius: var(--rz-radius-sm); display: flex; align-items: center;
               justify-content: center; color: var(--rz-ink-faint); font-size: 0.7rem; }
    .name-cell { font-weight: 600; }
    .muted-cell { color: var(--rz-ink-muted); }
    .actions-cell { display: flex; gap: 0.4rem; align-items: center; }
    .empty-cell { text-align: center; color: var(--rz-ink-faint); padding: 2rem; }
    .btn-primary { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm); border: none;
                    background: var(--rz-primary); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: default; }
    .btn-ghost { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm);
                  border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink);
                  font-size: 0.8rem; cursor: pointer; }
    .btn-ghost:hover { background: var(--rz-surface-hover); }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.2rem 0.4rem;
                 border-radius: var(--rz-radius-sm); color: var(--rz-ink-muted); }
    .btn-icon:hover { background: var(--rz-surface-hover); color: var(--rz-ink); }
    .btn-icon.danger:hover { background: var(--rz-danger-bg); color: var(--rz-danger); }
  `]
})
export class CharacterManagementComponent implements OnInit {
  private readonly api = inject(AnimeApiService);
  private readonly toast = inject(ToastService);

  readonly chars = signal<CharacterDto[]>([]);
  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<CharacterDto | null>(null);
  readonly error = signal<string | null>(null);
  searchTerm = '';

  readonly filtered = computed(() => {
    const q = this.searchTerm.toLowerCase();
    return q ? this.chars().filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.anime ?? '').toLowerCase().includes(q) ||
      (c.title ?? '').toLowerCase().includes(q)
    ) : this.chars();
  });

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
          this.chars.update(list => list.map(c => c.id === editId ? saved : c));
          this.toast.success('Character updated');
        } else {
          this.chars.update(list => [...list, saved]);
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
