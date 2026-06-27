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
import { AnimeDto, CharacterDto, MultiPollAdminDto, MultiPollCreateDto, GroupCreateDto } from '../../services/api.types';

interface CharOption { id: string; displayName: string; imageUrl: string; }

@Component({
  selector: 'app-multi-poll-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule],
  template: `
    <div class="section">

      @if (showForm()) {
        <form class="form-card" (ngSubmit)="save()">
          <h4 class="form-title">{{ editing() ? 'Edit Multi-Poll' : 'New Multi-Poll' }}</h4>
          <div class="form-grid">
            <label class="field span-2">
              <span>Question *</span>
              <input class="input" [(ngModel)]="form.question" name="mq" placeholder="Who is the best?" required />
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
                name="ma"
                appendTo="body" />
            </label>
          </div>

          <div class="groups-header">
            <span class="groups-label">Groups <span class="optional">(min 2, each with ≥2 fighters)</span></span>
            <button type="button" class="btn-ghost-sm" (click)="addGroup()">+ Group</button>
          </div>

          @for (group of form.groups; track $index; let i = $index) {
            <div class="group-card">
              <div class="group-header">
                <input class="input group-label-input" [(ngModel)]="group.label" [name]="'gl'+i"
                       placeholder="Group label e.g. Round 1" />
                <button type="button" class="btn-icon danger" (click)="removeGroup(i)"
                        [disabled]="form.groups.length <= 2" title="Remove group">
                  <i class="pi pi-trash"></i>
                </button>
              </div>

              <div class="candidates-section">
                @for (cId of group.characterIds; track $index; let cIdx = $index) {
                  <div class="candidate-slot">
                    <span class="slot-num">{{ cIdx + 1 }}</span>
                    <p-select
                      [options]="charOptions()"
                      [(ngModel)]="group.characterIds[cIdx]"
                      [name]="'gc'+i+'_'+cIdx"
                      optionLabel="displayName"
                      optionValue="id"
                      [filter]="true"
                      filterBy="displayName"
                      [showClear]="true"
                      placeholder="Select fighter…"
                      appendTo="body">
                      <ng-template pTemplate="option" let-opt>
                        <div class="char-opt">
                          @if (opt.imageUrl) {
                            <img class="opt-img" [src]="opt.imageUrl" [alt]="opt.displayName" (error)="onImgErr($event)" />
                          }
                          <span>{{ opt.displayName }}</span>
                        </div>
                      </ng-template>
                    </p-select>
                    @if (group.characterIds.length > 2) {
                      <button type="button" class="btn-icon danger" (click)="removeCandidate(i, cIdx)" title="Remove fighter">
                        <i class="pi pi-times"></i>
                      </button>
                    }
                  </div>
                }
                @if (group.characterIds.length < 10) {
                  <button type="button" class="btn-ghost-sm add-cand" (click)="addCandidate(i)">+ Add Fighter</button>
                }
              </div>
            </div>
          }

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
            <button class="btn-primary" type="button" (click)="toggleForm()">
              {{ showForm() ? '✕ Cancel' : '+ New Multi-Poll' }}
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
            <th style="width:90px">Groups</th>
            <th style="width:110px">Candidates</th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-mp>
          <tr>
            <td class="muted-cell">{{ mp.anime || '—' }}</td>
            <td class="name-cell">{{ mp.question }}</td>
            <td class="center-cell">{{ mp.groups?.length ?? 0 }}</td>
            <td class="center-cell">{{ totalCandidates(mp) }}</td>
            <td class="actions-cell">
              <button class="btn-icon" (click)="startEdit(mp)" title="Edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon danger" (click)="del(mp.id)" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5">No multi-polls found.</td></tr>
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
    .groups-header { display: flex; align-items: center; justify-content: space-between; }
    .groups-label { font-size: 0.8rem; font-weight: 600; color: var(--rz-ink-muted); }
    .group-card { background: var(--rz-surface-hover); border: 1px solid var(--rz-border-faint);
                   border-radius: var(--rz-radius-sm); padding: 0.75rem; display: flex;
                   flex-direction: column; gap: 0.5rem; }
    .group-header { display: flex; gap: 0.5rem; align-items: center; }
    .group-label-input { flex: 1; }
    .candidates-section { display: flex; flex-direction: column; gap: 0.4rem; }
    .candidate-slot { display: flex; align-items: center; gap: 0.5rem; }
    .slot-num { min-width: 1.4rem; height: 1.4rem; border-radius: 50%;
                 background: var(--rz-surface); border: 1px solid var(--rz-border);
                 color: var(--rz-ink-muted); font-size: 0.72rem; font-weight: 700;
                 display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .candidate-slot p-select { flex: 1; }
    .char-opt { display: flex; align-items: center; gap: 0.5rem; }
    .opt-img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .add-cand { align-self: flex-start; margin-top: 0.1rem; }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .dup-banner { display: flex; align-items: center; gap: 0.5rem; background: var(--rz-danger-bg);
                   color: var(--rz-danger); border-radius: var(--rz-radius-sm); padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .dup-close { background: none; border: none; cursor: pointer; color: var(--rz-danger); font-size: 1rem; padding: 0; }
    .form-actions { display: flex; gap: 0.5rem; }
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .name-cell { font-weight: 600; }
    .muted-cell { color: var(--rz-ink-muted); }
    .center-cell { text-align: center; color: var(--rz-ink-muted); }
    .actions-cell { display: flex; gap: 0.4rem; align-items: center; }
    .btn-primary { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm); border: none;
                    background: var(--rz-primary); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: default; }
    .btn-ghost { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm);
                  border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink);
                  font-size: 0.8rem; cursor: pointer; }
    .btn-ghost:hover { background: var(--rz-surface-hover); }
    .btn-ghost-sm { padding: 0.25rem 0.75rem; border-radius: var(--rz-radius-sm);
                     border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink);
                     font-size: 0.78rem; cursor: pointer; }
    .btn-ghost-sm:hover { background: var(--rz-surface-hover); }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.3rem 0.4rem;
                 border-radius: var(--rz-radius-sm); color: var(--rz-ink-muted); }
    .btn-icon:hover { background: var(--rz-surface-hover); color: var(--rz-ink); }
    .btn-icon.danger:hover { background: var(--rz-danger-bg); color: var(--rz-danger); }
    .btn-icon:disabled { opacity: 0.3; cursor: default; }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
  `]
})
export class MultiPollManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  private readonly api = inject(AnimeApiService);
  private readonly toast = inject(ToastService);

  readonly multiPolls = signal<MultiPollAdminDto[]>([]);
  readonly chars = signal<CharacterDto[]>([]);
  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<MultiPollAdminDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly dupError = signal<string | null>(null);

  readonly charOptions = computed<CharOption[]>(() =>
    this.chars().map(c => ({
      id: c.id,
      displayName: c.anime ? `${c.name} (${c.anime})` : c.name,
      imageUrl: c.imageUrl
    }))
  );

  form: MultiPollCreateDto = { anime: '', question: '', groups: [this.emptyGroup(), this.emptyGroup()] };

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

  toggleForm(): void {
    if (this.showForm()) { this.cancelEdit(); } else { this.showForm.set(true); }
  }

  startEdit(mp: MultiPollAdminDto): void {
    this.editing.set(mp);
    const groups = (mp.groups ?? []).map(g => {
      const ids = g.candidates.map(c => c.id);
      while (ids.length < 2) ids.push('');
      return { label: g.label, characterIds: ids };
    });
    while (groups.length < 2) groups.push(this.emptyGroup());
    this.form = { anime: mp.anime ?? '', question: mp.question, groups };
    this.showForm.set(true);
    this.error.set(null);
    this.dupError.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.form = { anime: '', question: '', groups: [this.emptyGroup(), this.emptyGroup()] };
    this.showForm.set(false);
    this.error.set(null);
    this.dupError.set(null);
  }

  addGroup(): void { this.form.groups = [...this.form.groups, this.emptyGroup()]; }

  removeGroup(idx: number): void { this.form.groups = this.form.groups.filter((_, i) => i !== idx); }

  addCandidate(groupIdx: number): void {
    if (this.form.groups[groupIdx].characterIds.length < 10) {
      this.form.groups[groupIdx].characterIds = [...this.form.groups[groupIdx].characterIds, ''];
    }
  }

  removeCandidate(groupIdx: number, cIdx: number): void {
    this.form.groups[groupIdx].characterIds = this.form.groups[groupIdx].characterIds.filter((_, i) => i !== cIdx);
  }

  save(): void {
    this.error.set(null);
    this.dupError.set(null);
    if (!this.form.question?.trim()) { this.error.set('Question is required'); return; }
    if (this.form.groups.length < 2) { this.error.set('At least 2 groups required'); return; }

    const filledGroups: GroupCreateDto[] = this.form.groups.map(g => ({
      label: g.label,
      characterIds: g.characterIds.filter(id => id)
    }));

    for (const g of filledGroups) {
      if (!g.label?.trim() || g.characterIds.length < 2) {
        this.error.set('Each group needs a label and at least 2 fighters'); return;
      }
      if (new Set(g.characterIds).size < g.characterIds.length) {
        this.error.set(`Group "${g.label}" has duplicate fighters`); return;
      }
    }

    this.saving.set(true);
    const editId = this.editing()?.id;
    const dto: MultiPollCreateDto = { anime: this.form.anime, question: this.form.question, groups: filledGroups };
    const req$ = editId
      ? this.api.adminUpdateMultiPoll(editId, dto)
      : this.api.adminCreateMultiPoll(dto);

    req$.subscribe({
      next: saved => {
        if (editId) {
          this.multiPolls.update(l => l.map(mp => mp.id === editId ? saved : mp));
          this.toast.success('Multi-poll updated');
        } else {
          this.multiPolls.update(l => [saved, ...l]);
          this.toast.success('Multi-poll created');
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
    if (!confirm('Delete this multi-poll and all its votes?')) return;
    this.api.adminDeleteMultiPoll(id).subscribe({
      next: () => { this.multiPolls.update(l => l.filter(mp => mp.id !== id)); this.toast.success('Multi-poll deleted'); },
      error: e => this.toast.error(this.msg(e))
    });
  }

  totalCandidates(mp: MultiPollAdminDto): number {
    return (mp.groups ?? []).reduce((s, g) => s + (g.candidates?.length ?? 0), 0);
  }

  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }

  private emptyGroup(): GroupCreateDto { return { label: '', characterIds: ['', ''] }; }
  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
