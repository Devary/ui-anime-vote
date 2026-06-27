import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { AnimeDto, AnimeCreateDto } from '../../services/api.types';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';

@Component({
  selector: 'app-anime-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent],
  template: `
    <div class="section">
      <div class="section-toolbar">
        <span class="count">{{ animeList().length }} anime</span>
        <button class="btn-primary" (click)="toggleForm()">
          {{ showForm() ? 'Cancel' : '+ Add Anime' }}
        </button>
      </div>

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
            <tr><th>Poster</th><th>Name</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (a of animeList(); track a.id) {
              <tr>
                <td>
                  @if (a.imageUrl) {
                    <img class="thumb" [src]="a.imageUrl" [alt]="a.name" (error)="onImgErr($event)" />
                  } @else {
                    <div class="no-img">—</div>
                  }
                </td>
                <td class="name-cell">{{ a.name }}</td>
                <td class="actions-cell">
                  <button class="btn-icon" (click)="startEdit(a)" title="Edit">✏</button>
                  <button class="btn-icon danger" (click)="del(a.id)" title="Delete">🗑</button>
                </td>
              </tr>
            }
            @if (animeList().length === 0 && !loading()) {
              <tr><td colspan="3" class="empty-cell">No anime added yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .section { display: flex; flex-direction: column; gap: 1rem; }
    .section-toolbar { display: flex; align-items: center; justify-content: space-between; }
    .count { font-size: 0.82rem; color: var(--rz-ink-muted); }
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
    .actions-cell { display: flex; gap: 0.4rem; align-items: center; }
    .empty-cell { text-align: center; color: var(--rz-ink-faint); padding: 2rem; }
    .btn-primary { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm); border: none;
                    background: var(--rz-primary); color: #fff; font-size: 0.8rem; font-weight: 600;
                    cursor: pointer; }
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
export class AnimeManagementComponent implements OnInit {
  private readonly api = inject(AnimeApiService);
  private readonly toast = inject(ToastService);

  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<AnimeDto | null>(null);
  readonly error = signal<string | null>(null);

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
          this.animeList.update(list => list.map(a => a.id === editId ? saved : a));
          this.toast.success('Anime updated');
        } else {
          this.animeList.update(list => [...list, saved].sort((a, b) => a.name.localeCompare(b.name)));
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
      next: () => { this.animeList.update(l => l.filter(a => a.id !== id)); this.toast.success('Anime deleted'); },
      error: e => this.toast.error(this.msg(e))
    });
  }

  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }

  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
