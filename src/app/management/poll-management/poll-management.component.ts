import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { PollExportService } from '../../services/poll-export.service';
import { AnimeDto, CharacterDto, PollDto, PollCreateDto } from '../../services/api.types';
import { PollGroupFormComponent, CharOption, createGroupForm } from '../poll-group-form/poll-group-form.component';

@Component({
  selector: 'app-poll-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, PollGroupFormComponent],
  template: `
    <div class="section">

      @if (showForm()) {
        <form class="form-card" [formGroup]="meta" (ngSubmit)="save()">
          <h4 class="form-title">{{ editing() ? 'Edit Poll' : 'New Poll' }}</h4>
          <div class="form-grid">
            <label class="field span-2">
              <span>Question *</span>
              <input class="input" formControlName="question" placeholder="Who would win?" />
              @if (submitted && meta.get('question')?.errors?.['required']) {
                <small class="error-msg">Question is required</small>
              }
            </label>
            <label class="field">
              <span>Anime <span class="optional">(optional)</span></span>
              <p-select
                [options]="animeList()"
                formControlName="anime"
                optionLabel="name"
                optionValue="name"
                [filter]="true"
                filterBy="name"
                [editable]="true"
                [showClear]="true"
                placeholder="Select or type…"
                appendTo="body" />
            </label>
          </div>

          <span class="field-label">Fighters *
            <small class="optional">({{ fighterCount }}/10, min 2)</small>
          </span>

          <app-poll-group-form
            [group]="fightersGroup"
            [charOptions]="charOptions()"
            [showLabel]="false"
            [showPeriod]="false"
            [canRemove]="false"
            [submitted]="submitted"
            candidatePlaceholder="Select fighter…"
            candidateLabel="Fighter" />

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
                     placeholder="Search polls…" />
            </p-iconfield>
            <div class="caption-actions">
              <button class="btn-danger" type="button"
                      [disabled]="!selectedIds().size"
                      (click)="delSelected()">
                Remove Selected{{ selectedIds().size ? ' (' + selectedIds().size + ')' : '' }}
              </button>
              <button class="btn-danger" type="button"
                      [disabled]="!polls().length"
                      (click)="delAll()">
                Remove All
              </button>
              <button class="btn-primary" type="button" (click)="toggleForm()">
                {{ showForm() ? '✕ Cancel' : '+ New Poll' }}
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
            <th>Fighters</th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-poll>
          <tr [class.row-selected]="selectedIds().has(poll.id)">
            <td>
              <input type="checkbox" class="row-check"
                     [checked]="selectedIds().has(poll.id)"
                     (change)="toggleRow(poll.id)" />
            </td>
            <td class="muted-cell">{{ poll.anime || '—' }}</td>
            <td class="name-cell">{{ poll.question }}</td>
            <td>
              <div class="fighters-cell">
                @for (f of poll.fighters; track f.id; let i = $index) {
                  @if (i > 0) { <span class="vs-sep">vs</span> }
                  <div class="char-cell">
                    @if (f.imageUrl) {
                      <img class="thumb" [src]="f.imageUrl" [alt]="f.name" (error)="onImgErr($event)" />
                    }
                    <span>{{ f.name }}</span>
                  </div>
                }
              </div>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" (click)="startEdit(poll)" title="Edit">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon" (click)="download(poll)" title="Download hierarchy">
                <i class="pi pi-download"></i>
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
    .field-label { font-size: 0.8rem; color: var(--rz-ink-muted); font-weight: 500; }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .dup-banner { display: flex; align-items: center; gap: 0.5rem; background: var(--rz-danger-bg);
                   color: var(--rz-danger); border-radius: var(--rz-radius-sm); padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .dup-close { background: none; border: none; cursor: pointer; color: var(--rz-danger); font-size: 1rem; padding: 0; }
    .form-actions { display: flex; gap: 0.5rem; }
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .caption-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .row-check { width: 15px; height: 15px; cursor: pointer; accent-color: var(--rz-primary); }
    .row-selected td { background: rgba(21, 101, 192, 0.08); }
    .fighters-cell { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .vs-sep { font-size: 0.65rem; font-weight: 700; color: var(--rz-ink-faint); text-transform: uppercase; padding: 0 0.1rem; }
    .char-cell { display: flex; align-items: center; gap: 0.3rem; }
    .thumb { width: 28px; height: 28px; object-fit: cover; border-radius: 50%; flex-shrink: 0; }
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
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
  `]
})
export class PollManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  private readonly api    = inject(AnimeApiService);
  private readonly toast  = inject(ToastService);
  private readonly export = inject(PollExportService);

  readonly polls    = signal<PollDto[]>([]);
  readonly chars    = signal<CharacterDto[]>([]);
  readonly animeList = signal<AnimeDto[]>([]);
  readonly loading  = signal(false);
  readonly saving   = signal(false);
  readonly showForm = signal(false);
  readonly editing  = signal<PollDto | null>(null);
  readonly error    = signal<string | null>(null);
  readonly dupError = signal<string | null>(null);
  readonly selectedIds = signal(new Set<string>());

  readonly allSelected = computed(() =>
    this.polls().length > 0 && this.selectedIds().size === this.polls().length
  );
  readonly someSelected = computed(() =>
    this.selectedIds().size > 0 && this.selectedIds().size < this.polls().length
  );

  readonly charOptions = computed<CharOption[]>(() =>
    this.chars().map(c => ({
      id: c.id,
      displayName: c.anime ? `${c.name} (${c.anime})` : c.name,
      imageUrl: c.imageUrl
    }))
  );

  submitted = false;

  meta = new FormGroup({
    anime:    new FormControl(''),
    question: new FormControl('', Validators.required)
  });

  fightersGroup = createGroupForm({ showPeriod: false });

  get fighterCount(): number {
    return (this.fightersGroup.get('candidates') as FormArray).length;
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

  toggleRow(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.polls().map(p => p.id)));
    }
  }

  toggleForm(): void {
    if (this.showForm()) { this.cancelEdit(); } else { this.showForm.set(true); }
  }

  startEdit(p: PollDto): void {
    this.editing.set(p);
    this.meta.patchValue({ anime: p.anime ?? '', question: p.question });
    this.fightersGroup = createGroupForm({ showPeriod: false });
    const cArr = this.fightersGroup.get('candidates') as FormArray;
    cArr.clear();
    const ids = (p.fighters ?? []).map(f => f.id);
    while (ids.length < 2) ids.push('');
    ids.forEach(id => cArr.push(new FormControl(id)));
    this.submitted = false;
    this.showForm.set(true);
    this.error.set(null);
    this.dupError.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.meta.reset({ anime: '', question: '' });
    this.fightersGroup = createGroupForm({ showPeriod: false });
    this.submitted = false;
    this.showForm.set(false);
    this.error.set(null);
    this.dupError.set(null);
  }

  save(): void {
    this.submitted = true;
    this.error.set(null);
    this.dupError.set(null);
    if (!this.meta.get('question')?.value?.trim()) { this.error.set('Question is required'); return; }
    const cArr = this.fightersGroup.get('candidates') as FormArray;
    const filled = cArr.controls.map(c => c.value as string).filter(id => id);
    if (filled.length < 2) { this.error.set('Select at least 2 fighters'); return; }
    if (new Set(filled).size < filled.length) { this.error.set('Fighters must be different'); return; }

    this.saving.set(true);
    const editId = this.editing()?.id;
    const dto: PollCreateDto = {
      anime:     this.meta.get('anime')?.value ?? '',
      question:  this.meta.get('question')?.value ?? '',
      fighterIds: filled
    };
    const req$ = editId
      ? this.api.adminUpdatePoll(editId, dto)
      : this.api.adminCreatePoll(dto);

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

  download(poll: PollDto): void { this.export.downloadPoll(poll).catch(e => this.toast.error(this.msg(e))); }

  del(id: string): void {
    if (!confirm('Delete this poll and all its votes?')) return;
    this.api.adminDeletePoll(id).subscribe({
      next: () => {
        this.polls.update(l => l.filter(p => p.id !== id));
        this.selectedIds.update(s => { const n = new Set(s); n.delete(id); return n; });
        this.toast.success('Poll deleted');
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected polls and all their votes?`)) return;
    this.bulkDelete(ids, id => this.api.adminDeletePoll(id)).subscribe(deleted => {
      this.polls.update(l => l.filter(p => !deleted.includes(p.id)));
      this.selectedIds.update(s => { const n = new Set(s); deleted.forEach(id => n.delete(id)); return n; });
      this.toast.success(`Deleted ${deleted.length}${deleted.length < ids.length ? '/' + ids.length + ' (some failed)' : ''} polls`);
    });
  }

  delAll(): void {
    const items = this.polls();
    if (!items.length) return;
    if (!confirm(`Delete all ${items.length} polls and all their votes? This cannot be undone.`)) return;
    this.bulkDelete(items.map(p => p.id), id => this.api.adminDeletePoll(id)).subscribe(deleted => {
      this.polls.update(l => l.filter(p => !deleted.includes(p.id)));
      this.selectedIds.set(new Set());
      this.toast.success(`Deleted ${deleted.length}${deleted.length < items.length ? '/' + items.length + ' (some failed)' : ''} polls`);
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
