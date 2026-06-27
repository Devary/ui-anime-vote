import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { AnimeDto, CharacterDto, PollDto, PollCreateDto } from '../../services/api.types';

@Component({
  selector: 'app-poll-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule],
  template: `
    <div class="section">

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
              <p-select
                [options]="animeList()"
                [(ngModel)]="form.anime"
                optionLabel="name"
                optionValue="name"
                [filter]="true"
                filterBy="name"
                [editable]="true"
                [showClear]="true"
                placeholder="Select or type…"
                name="pa"
                appendTo="body" />
            </label>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>Fighter 1 *</span>
              <input class="char-search" [(ngModel)]="charSearch1" name="cs1" placeholder="Type to search…"
                     (ngModelChange)="triggerFilter()" />
              <select class="input select-lg" [(ngModel)]="form.fighter1Id" name="pf1" size="5">
                @for (c of filteredChars1(); track c.id) {
                  <option [value]="c.id">{{ c.name }}{{ c.anime ? ' (' + c.anime + ')' : '' }}</option>
                }
              </select>
              @if (form.fighter1Id) {
                <small class="selected-name">✓ {{ charName(form.fighter1Id) }}</small>
              }
            </label>
            <label class="field">
              <span>Fighter 2 *</span>
              <input class="char-search" [(ngModel)]="charSearch2" name="cs2" placeholder="Type to search…"
                     (ngModelChange)="triggerFilter()" />
              <select class="input select-lg" [(ngModel)]="form.fighter2Id" name="pf2" size="5">
                @for (c of filteredChars2(); track c.id) {
                  <option [value]="c.id">{{ c.name }}{{ c.anime ? ' (' + c.anime + ')' : '' }}</option>
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

      <p-table
        #dt
        [value]="polls()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        [globalFilterFields]="['anime', 'question', 'fighter1.name', 'fighter2.name']"
        [loading]="loading()"
        sortMode="single"
        dataKey="id">

        <ng-template pTemplate="caption">
          <div class="table-caption">
            <p-iconfield>
              <p-inputicon styleClass="pi pi-search" />
              <input pInputText type="text"
                     (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                     placeholder="Search polls…" />
            </p-iconfield>
            <button class="btn-primary" type="button" (click)="toggleForm()">
              {{ showForm() ? '✕ Cancel' : '+ New Poll' }}
            </button>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="anime">
              Anime
              <p-sortIcon field="anime" />
              <p-columnFilter type="text" field="anime" display="menu" />
            </th>
            <th pSortableColumn="question">
              Question
              <p-sortIcon field="question" />
              <p-columnFilter type="text" field="question" display="menu" />
            </th>
            <th>Fighter 1</th>
            <th>Fighter 2</th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-poll>
          <tr>
            <td class="muted-cell">{{ poll.anime || '—' }}</td>
            <td class="name-cell">{{ poll.question }}</td>
            <td>
              <div class="char-cell">
                @if (poll.fighter1?.imageUrl) {
                  <img class="thumb" [src]="poll.fighter1.imageUrl" [alt]="poll.fighter1.name" (error)="onImgErr($event)" />
                }
                {{ poll.fighter1?.name }}
              </div>
            </td>
            <td>
              <div class="char-cell">
                @if (poll.fighter2?.imageUrl) {
                  <img class="thumb" [src]="poll.fighter2.imageUrl" [alt]="poll.fighter2.name" (error)="onImgErr($event)" />
                }
                {{ poll.fighter2?.name }}
              </div>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" (click)="startEdit(poll)" title="Edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon danger" (click)="del(poll.id)" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5">No polls found.</td></tr>
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
    .select-lg { height: 110px; overflow-y: auto; font-size: 0.78rem; }
    .selected-name { color: var(--rz-primary); font-size: 0.75rem; margin-top: 0.2rem; }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .dup-banner { display: flex; align-items: center; gap: 0.5rem; background: var(--rz-danger-bg);
                   color: var(--rz-danger); border-radius: var(--rz-radius-sm); padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .dup-close { background: none; border: none; cursor: pointer; color: var(--rz-danger); font-size: 1rem; padding: 0; }
    .form-actions { display: flex; gap: 0.5rem; }
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .char-cell { display: flex; align-items: center; gap: 0.4rem; }
    .thumb { width: 32px; height: 32px; object-fit: cover; border-radius: var(--rz-radius-sm); flex-shrink: 0; }
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
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
  `]
})
export class PollManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

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

  readonly filteredChars1 = computed(() => this.filterChars(this.charSearch1));
  readonly filteredChars2 = computed(() => this.filterChars(this.charSearch2));

  // Dummy signal toggled to force computed re-evaluation when search terms change
  private readonly _filterTick = signal(0);

  private filterChars(q: string): CharacterDto[] {
    this._filterTick(); // read to establish dependency
    if (!q) return this.chars();
    const lower = q.toLowerCase();
    return this.chars().filter(c =>
      c.name.toLowerCase().includes(lower) || (c.anime ?? '').toLowerCase().includes(lower)
    );
  }

  triggerFilter(): void { this._filterTick.update(n => n + 1); }

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

  startEdit(p: PollDto): void {
    this.editing.set(p);
    this.form = { anime: p.anime ?? '', question: p.question, fighter1Id: p.fighter1.id, fighter2Id: p.fighter2.id };
    this.charSearch1 = '';
    this.charSearch2 = '';
    this.showForm.set(true);
    this.error.set(null);
    this.dupError.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.form = { anime: '', question: '', fighter1Id: '', fighter2Id: '' };
    this.charSearch1 = '';
    this.charSearch2 = '';
    this.showForm.set(false);
    this.error.set(null);
    this.dupError.set(null);
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
          this.polls.update(l => l.map(p => p.id === editId ? saved : p));
          this.toast.success('Poll updated');
        } else {
          this.polls.update(l => [saved, ...l]);
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

  charName(id: string): string { return this.chars().find(c => c.id === id)?.name ?? id; }
  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }
  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
