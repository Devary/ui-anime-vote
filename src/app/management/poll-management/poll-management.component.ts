import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { AnimeDto, CharacterDto, PollDto, PollCreateDto } from '../../services/api.types';

@Component({
  selector: 'app-poll-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="section">
      <div class="section-toolbar">
        <span class="count">{{ polls().length }} polls</span>
        <button class="btn-primary" (click)="toggleForm()">
          {{ showForm() ? 'Cancel' : '+ New Poll' }}
        </button>
      </div>

      @if (showForm()) {
        <form class="form-card" (ngSubmit)="save()">
          <h4 class="form-title">{{ editing() ? 'Edit Poll' : 'New Poll' }}</h4>
          <div class="form-grid">
            <label class="field span-2">
              <span>Question *</span>
              <input class="input" [(ngModel)]="form.question" name="pq" placeholder="Who would win?" required />
            </label>
            <label class="field">
              <span>Anime <span class="optional">(optional)</span></span>
              <input class="input" list="poll-anime-dl" [(ngModel)]="form.anime" name="pa"
                     placeholder="Select or type…" (change)="onAnimeChange()" />
              <datalist id="poll-anime-dl">
                @for (a of animeList(); track a.id) {
                  <option [value]="a.name"></option>
                }
              </datalist>
            </label>
          </div>
          <div class="form-grid">
            <label class="field">
              <span>Fighter 1 *</span>
              <input class="char-search" [(ngModel)]="charSearch1" name="cs1"
                     placeholder="Search character…" (input)="onCharSearch()" />
              <select class="input select-lg" [(ngModel)]="form.fighter1Id" name="pf1" size="4">
                @for (c of filteredChars1(); track c.id) {
                  <option [value]="c.id">{{ c.name }} ({{ c.anime }})</option>
                }
              </select>
              @if (form.fighter1Id) {
                <small class="selected-name">✓ {{ charName(form.fighter1Id) }}</small>
              }
            </label>
            <label class="field">
              <span>Fighter 2 *</span>
              <input class="char-search" [(ngModel)]="charSearch2" name="cs2"
                     placeholder="Search character…" (input)="onCharSearch()" />
              <select class="input select-lg" [(ngModel)]="form.fighter2Id" name="pf2" size="4">
                @for (c of filteredChars2(); track c.id) {
                  <option [value]="c.id">{{ c.name }} ({{ c.anime }})</option>
                }
              </select>
              @if (form.fighter2Id) {
                <small class="selected-name">✓ {{ charName(form.fighter2Id) }}</small>
              }
            </label>
          </div>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          @if (dupError()) {
            <div class="dup-banner">⚠ {{ dupError() }}
              <button type="button" class="dup-close" (click)="dupError.set(null)">✕</button>
            </div>
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
            <tr><th>Anime</th><th>Question</th><th>Fighter 1</th><th>Fighter 2</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (p of polls(); track p.id) {
              <tr>
                <td class="muted-cell">{{ p.anime || '—' }}</td>
                <td class="name-cell">{{ p.question }}</td>
                <td>
                  <div class="char-cell">
                    @if (p.fighter1.imageUrl) {
                      <img class="thumb" [src]="p.fighter1.imageUrl" [alt]="p.fighter1.name" (error)="onImgErr($event)" />
                    }
                    {{ p.fighter1.name }}
                  </div>
                </td>
                <td>
                  <div class="char-cell">
                    @if (p.fighter2.imageUrl) {
                      <img class="thumb" [src]="p.fighter2.imageUrl" [alt]="p.fighter2.name" (error)="onImgErr($event)" />
                    }
                    {{ p.fighter2.name }}
                  </div>
                </td>
                <td class="actions-cell">
                  <button class="btn-icon" (click)="startEdit(p)" title="Edit">✏</button>
                  <button class="btn-icon danger" (click)="del(p.id)" title="Delete">🗑</button>
                </td>
              </tr>
            }
            @if (polls().length === 0 && !loading()) {
              <tr><td colspan="5" class="empty-cell">No polls yet.</td></tr>
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
    .form-title { margin: 0; font-size: 0.9rem; font-weight: 700; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .span-2 { grid-column: span 2; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .optional { font-size: 0.72rem; color: var(--rz-ink-faint); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .char-search { padding: 0.35rem 0.5rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
                    background: var(--rz-surface); color: var(--rz-ink); font-size: 0.78rem; margin-bottom: 0.25rem; }
    .char-search:focus { outline: none; border-color: var(--rz-accent); }
    .select-lg { height: 100px; overflow-y: auto; font-size: 0.78rem; }
    .selected-name { color: var(--rz-primary); font-size: 0.75rem; margin-top: 0.2rem; }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .dup-banner { display: flex; align-items: center; gap: 0.5rem; background: var(--rz-danger-bg);
                   color: var(--rz-danger); border-radius: var(--rz-radius-sm); padding: 0.5rem 0.75rem;
                   font-size: 0.8rem; }
    .dup-close { background: none; border: none; cursor: pointer; color: var(--rz-danger); font-size: 1rem; padding: 0; }
    .form-actions { display: flex; gap: 0.5rem; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .data-table th { text-align: left; padding: 0.5rem 0.75rem; color: var(--rz-ink-muted);
                      font-size: 0.75rem; font-weight: 600; border-bottom: 1px solid var(--rz-border); }
    .data-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--rz-border-faint);
                      color: var(--rz-ink); vertical-align: middle; }
    .char-cell { display: flex; align-items: center; gap: 0.4rem; }
    .thumb { width: 32px; height: 32px; object-fit: cover; border-radius: var(--rz-radius-sm); flex-shrink: 0; }
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
export class PollManagementComponent implements OnInit {
  private readonly api = inject(AnimeApiService);
  private readonly toast = inject(ToastService);

  readonly polls = signal<PollDto[]>([]);
  readonly chars = signal<CharacterDto[]>([]);
  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<PollDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly dupError = signal<string | null>(null);

  charSearch1 = '';
  charSearch2 = '';
  form: PollCreateDto = { anime: '', question: '', fighter1Id: '', fighter2Id: '' };

  readonly filteredChars1 = computed(() => this._filterChars(this.charSearch1));
  readonly filteredChars2 = computed(() => this._filterChars(this.charSearch2));

  private _filterChars(q: string): CharacterDto[] {
    if (!q) return this.chars();
    const lower = q.toLowerCase();
    return this.chars().filter(c =>
      c.name.toLowerCase().includes(lower) || (c.anime ?? '').toLowerCase().includes(lower)
    );
  }

  ngOnInit(): void {
    this.load();
    this.api.adminGetAnimeList().subscribe({ next: l => this.animeList.set(l) });
    this.api.adminGetAllCharacters().subscribe({ next: l => this.chars.set(l) });
  }

  load(): void {
    this.loading.set(true);
    this.api.adminGetPolls().subscribe({
      next: list => { this.polls.set(list); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  toggleForm(): void {
    if (this.showForm()) { this.cancelEdit(); } else { this.showForm.set(true); }
  }

  onAnimeChange(): void {
    // auto-filter characters by selected anime when anime is set
  }

  onCharSearch(): void {
    // triggers computed signals to re-evaluate
  }

  startEdit(p: PollDto): void {
    this.editing.set(p);
    this.form = { anime: p.anime ?? '', question: p.question, fighter1Id: p.fighter1.id, fighter2Id: p.fighter2.id };
    this.showForm.set(true);
    this.error.set(null);
    this.dupError.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.form = { anime: '', question: '', fighter1Id: '', fighter2Id: '' };
    this.showForm.set(false);
    this.error.set(null);
    this.dupError.set(null);
    this.charSearch1 = '';
    this.charSearch2 = '';
  }

  save(): void {
    this.error.set(null);
    this.dupError.set(null);
    if (!this.form.question?.trim()) { this.error.set('Question is required'); return; }
    if (!this.form.fighter1Id || !this.form.fighter2Id) { this.error.set('Select both fighters'); return; }
    if (this.form.fighter1Id === this.form.fighter2Id) { this.error.set('Fighters must be different'); return; }
    this.saving.set(true);
    const editId = this.editing()?.id;
    const req$ = editId
      ? this.api.adminUpdatePoll(editId, this.form)
      : this.api.adminCreatePoll(this.form);

    req$.subscribe({
      next: saved => {
        if (editId) {
          this.polls.update(list => list.map(p => p.id === editId ? saved : p));
          this.toast.success('Poll updated');
        } else {
          this.polls.update(list => [saved, ...list]);
          this.toast.success('Poll created');
        }
        this.saving.set(false);
        this.cancelEdit();
      },
      error: e => {
        this.saving.set(false);
        if (e?.status === 409) { this.dupError.set(this.msg(e)); }
        else { this.error.set(this.msg(e)); }
      }
    });
  }

  del(id: string): void {
    if (!confirm('Delete this poll and all its votes?')) return;
    this.api.adminDeletePoll(id).subscribe({
      next: () => { this.polls.update(l => l.filter(p => p.id !== id)); this.toast.success('Poll deleted'); },
      error: e => this.toast.error(this.msg(e))
    });
  }

  charName(id: string): string {
    return this.chars().find(c => c.id === id)?.name ?? id;
  }

  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }
  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
