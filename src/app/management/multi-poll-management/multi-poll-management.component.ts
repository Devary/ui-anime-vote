import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
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
import { AnimeDto, CharacterDto, MultiPollAdminDto, MultiPollCreateDto, GroupCreateDto } from '../../services/api.types';
import { PollGroupFormComponent, CharOption, createGroupForm, groupPeriodValidator } from '../poll-group-form/poll-group-form.component';

@Component({
  selector: 'app-multi-poll-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, PollGroupFormComponent],
  template: `
    <div class="section">

      @if (showForm()) {
        <form class="form-card" [formGroup]="form" (ngSubmit)="save()">
          <h4 class="form-title">{{ editing() ? 'Edit Multi-Poll (candidates only)' : 'New Multi-Poll' }}</h4>

          <div class="form-grid">
            <label class="field span-2">
              <span>Question *</span>
              <input class="input" formControlName="question" placeholder="Who is the best?" />
              @if (submitted && form.get('question')?.errors?.['required']) {
                <small class="error-msg">Question is required</small>
              }
            </label>
            @if (!editing()) {
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
            }
          </div>

          <div class="groups-header">
            <span class="groups-label">
              Groups <span class="optional">(min 2, each with ≥2 fighters)</span>
            </span>
            <button type="button" class="btn-ghost-sm" (click)="addGroup()">+ Group</button>
          </div>

          @if (submitted && !editing()) {
            @if (groupsArray.errors?.['noGroupStartsNow']) {
              <div class="cross-error">At least one group must have "Start now" checked</div>
            }
            @if (groupsArray.errors?.['groupsOutOfOrder']) {
              <div class="cross-error">Groups must be in chronological order</div>
            }
          }

          @for (ctrl of groupsArray.controls; track ctrl; let i = $index) {
            <app-poll-group-form
              [group]="getGroupForm(i)"
              [charOptions]="charOptions()"
              [showLabel]="true"
              [showPeriod]="!editing()"
              [isEdit]="!!editing()"
              [canRemove]="groupsArray.length > 2"
              [submitted]="submitted"
              (remove)="removeGroup(i)" />
          }

          @if (error()) { <div class="error-msg-block">{{ error() }}</div> }
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
                     placeholder="Search multi-polls…" />
            </p-iconfield>
            <div class="caption-actions">
              <button class="btn-danger" type="button"
                      [disabled]="!selected.length"
                      (click)="delSelected()">
                Remove Selected{{ selected.length ? ' (' + selected.length + ')' : '' }}
              </button>
              <button class="btn-danger" type="button"
                      [disabled]="!multiPolls().length"
                      (click)="delAll()">
                Remove All
              </button>
              <button class="btn-primary" type="button" (click)="toggleForm()">
                {{ showForm() ? '✕ Cancel' : '+ New Multi-Poll' }}
              </button>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem"><p-tableHeaderCheckbox /></th>
            <th pSortableColumn="anime">
              Anime <p-sortIcon field="anime" />
              <p-columnFilter type="text" field="anime" display="menu" />
            </th>
            <th pSortableColumn="question">
              Question <p-sortIcon field="question" />
              <p-columnFilter type="text" field="question" display="menu" />
            </th>
            <th style="width:90px">Groups</th>
            <th style="width:110px">Candidates</th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-mp>
          <tr>
            <td><p-tableCheckbox [value]="mp" /></td>
            <td class="muted-cell">{{ mp.anime || '—' }}</td>
            <td class="name-cell">{{ mp.question }}</td>
            <td class="center-cell">{{ mp.groups?.length ?? 0 }}</td>
            <td class="center-cell">{{ totalCandidates(mp) }}</td>
            <td class="actions-cell">
              <button class="btn-icon" (click)="startEdit(mp)" title="Edit candidates">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="btn-icon" (click)="download(mp)" title="Download hierarchy">
                <i class="pi pi-download"></i>
              </button>
              <button class="btn-icon danger" (click)="del(mp.id)" title="Delete">
                <i class="pi pi-trash"></i>
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6">No multi-polls found.</td></tr>
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
    .cross-error { font-size: 0.78rem; color: var(--rz-danger); background: var(--rz-danger-bg);
                    padding: 0.35rem 0.6rem; border-radius: var(--rz-radius-sm); }
    .error-msg { color: var(--rz-danger); font-size: 0.75rem; }
    .error-msg-block { color: var(--rz-danger); font-size: 0.8rem; }
    .dup-banner { display: flex; align-items: center; gap: 0.5rem; background: var(--rz-danger-bg);
                   color: var(--rz-danger); border-radius: var(--rz-radius-sm); padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .dup-close { background: none; border: none; cursor: pointer; color: var(--rz-danger); font-size: 1rem; padding: 0; }
    .form-actions { display: flex; gap: 0.5rem; }
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .caption-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
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
export class MultiPollManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  private readonly api    = inject(AnimeApiService);
  private readonly toast  = inject(ToastService);
  private readonly export = inject(PollExportService);

  readonly multiPolls = signal<MultiPollAdminDto[]>([]);
  readonly chars      = signal<CharacterDto[]>([]);
  readonly animeList  = signal<AnimeDto[]>([]);
  readonly loading    = signal(false);
  readonly saving     = signal(false);
  readonly showForm   = signal(false);
  readonly editing    = signal<MultiPollAdminDto | null>(null);
  readonly error      = signal<string | null>(null);
  readonly dupError   = signal<string | null>(null);

  readonly charOptions = computed<CharOption[]>(() =>
    this.chars().map(c => ({
      id: c.id,
      displayName: c.anime ? `${c.name} (${c.anime})` : c.name,
      imageUrl: c.imageUrl
    }))
  );

  selected: MultiPollAdminDto[] = [];
  private serverNow = new Date();
  submitted = false;
  form!: FormGroup;

  // ── Cross-group validators ─────────────────────────────────────────────────

  private readonly atLeastOneNowValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    const fa = arr as FormArray;
    return fa.controls.some(g => g.get('startNow')?.value) ? null : { noGroupStartsNow: true };
  };

  private readonly groupsOrderedValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    const fa  = arr as FormArray;
    const now = this.serverNow;
    let prev: Date | null = null;
    for (let i = 1; i < fa.length; i++) {
      const g    = fa.at(i);
      const curr = g.get('startNow')?.value ? now
        : g.get('startDate')?.value ? new Date(g.get('startDate')!.value) : null;
      if (prev && curr && curr < prev) return { groupsOutOfOrder: { groupIndex: i } };
      if (curr) prev = curr;
    }
    return null;
  };

  // ── Form init ──────────────────────────────────────────────────────────────

  get groupsArray(): FormArray { return this.form.get('groups') as FormArray; }
  getGroupForm(i: number): FormGroup { return this.groupsArray.at(i) as FormGroup; }

  private initForm(isEdit: boolean): void {
    const arrayValidators: ValidatorFn[] = isEdit
      ? []
      : [this.atLeastOneNowValidator, this.groupsOrderedValidator];
    this.form = new FormGroup({
      anime:    new FormControl(''),
      question: new FormControl('', Validators.required),
      groups:   new FormArray(
        [this.newGroupForm(isEdit), this.newGroupForm(isEdit)],
        arrayValidators
      )
    });
    this.submitted = false;
  }

  private newGroupForm(isEdit: boolean): FormGroup {
    return createGroupForm({ isEdit, showPeriod: !isEdit, serverNow: this.serverNow });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
    this.api.adminGetAnimeList().subscribe({ next: l => this.animeList.set(l) });
    this.api.adminGetAllCharacters().subscribe({ next: l => this.chars.set(l) });
    this.initForm(false);
  }

  load(): void {
    this.loading.set(true);
    this.api.adminGetMultiPolls().subscribe({
      next: list => { this.multiPolls.set(list); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  // ── UI actions ─────────────────────────────────────────────────────────────

  toggleForm(): void {
    if (this.showForm()) { this.cancelEdit(); } else {
      this.api.getServerTime().subscribe({ next: t => { this.serverNow = new Date(t.now); } });
      this.showForm.set(true);
    }
  }

  startEdit(mp: MultiPollAdminDto): void {
    this.editing.set(mp);
    this.initForm(true);
    const ga = this.groupsArray;
    ga.clear();
    (mp.groups ?? []).forEach(g => {
      const gf = this.newGroupForm(true);
      gf.patchValue({ label: g.label });
      const cArr = gf.get('candidates') as FormArray;
      cArr.clear();
      const ids = g.candidates.map(c => c.id);
      while (ids.length < 2) ids.push('');
      ids.forEach(id => cArr.push(new FormControl(id)));
      ga.push(gf);
    });
    if (ga.length < 2) ga.push(this.newGroupForm(true));
    this.form.patchValue({ anime: mp.anime ?? '', question: mp.question });
    this.showForm.set(true);
    this.error.set(null);
    this.dupError.set(null);
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.initForm(false);
    this.showForm.set(false);
    this.error.set(null);
    this.dupError.set(null);
  }

  addGroup(): void { this.groupsArray.push(this.newGroupForm(!!this.editing())); }
  removeGroup(i: number): void { if (this.groupsArray.length > 2) this.groupsArray.removeAt(i); }

  // ── Submit ─────────────────────────────────────────────────────────────────

  save(): void {
    this.submitted = true;
    this.error.set(null);
    this.dupError.set(null);
    const isEdit = !!this.editing();

    for (let i = 0; i < this.groupsArray.length; i++) {
      const gf     = this.getGroupForm(i);
      const cArr   = gf.get('candidates') as FormArray;
      const filled = cArr.controls.map(c => c.value as string).filter(id => id);
      if (filled.length < 2) { this.error.set('Each group needs at least 2 fighters'); return; }
      if (new Set(filled).size < filled.length) {
        const label = gf.get('label')?.value || `Group ${i + 1}`;
        this.error.set(`Group "${label}" has duplicate fighters`);
        return;
      }
    }

    if (!isEdit && this.form.invalid) return;

    const questionVal: string = this.form.get('question')?.value ?? '';
    if (!questionVal.trim()) { this.error.set('Question is required'); return; }

    const groups = this.buildGroupDtos(isEdit);
    const dto: MultiPollCreateDto = {
      anime:    this.form.get('anime')?.value ?? '',
      question: questionVal,
      groups
    };

    this.saving.set(true);
    const editId = this.editing()?.id;
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

  private buildGroupDtos(isEdit: boolean): GroupCreateDto[] {
    return this.groupsArray.controls.map(ctrl => {
      const g          = ctrl as FormGroup;
      const cArr       = g.get('candidates') as FormArray;
      const characterIds = cArr.controls.map(c => c.value as string).filter(id => id);

      if (isEdit) return { label: g.get('label')?.value ?? '', characterIds, startNow: false };

      const startNow: boolean = g.get('startNow')?.value;
      const startDateRaw = g.get('startDate')?.value ?? '';
      const endDateRaw   = g.get('endDate')?.value   ?? '';
      return {
        label: g.get('label')?.value ?? '',
        characterIds,
        startNow,
        startDate: (!startNow && startDateRaw) ? this.toIso(startDateRaw) : null,
        endDate:   endDateRaw ? this.toIso(endDateRaw) : null
      };
    });
  }

  download(mp: MultiPollAdminDto): void { this.export.downloadMultiPoll(mp).catch(e => this.toast.error(this.msg(e))); }

  del(id: string): void {
    if (!confirm('Delete this multi-poll and all its votes?')) return;
    this.api.adminDeleteMultiPoll(id).subscribe({
      next: () => {
        this.multiPolls.update(l => l.filter(mp => mp.id !== id));
        this.selected = this.selected.filter(mp => mp.id !== id);
        this.toast.success('Multi-poll deleted');
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const sel = [...this.selected];
    if (!sel.length) return;
    if (!confirm(`Delete ${sel.length} selected multi-polls and all their votes?`)) return;
    this.bulkDelete(sel.map(mp => mp.id), id => this.api.adminDeleteMultiPoll(id)).subscribe(deleted => {
      this.multiPolls.update(l => l.filter(mp => !deleted.includes(mp.id)));
      this.selected = [];
      this.toast.success(`Deleted ${deleted.length}${deleted.length < sel.length ? '/' + sel.length + ' (some failed)' : ''} multi-polls`);
    });
  }

  delAll(): void {
    const items = this.multiPolls();
    if (!items.length) return;
    if (!confirm(`Delete all ${items.length} multi-polls and all their votes? This cannot be undone.`)) return;
    this.bulkDelete(items.map(mp => mp.id), id => this.api.adminDeleteMultiPoll(id)).subscribe(deleted => {
      this.multiPolls.update(l => l.filter(mp => !deleted.includes(mp.id)));
      this.selected = [];
      this.toast.success(`Deleted ${deleted.length}${deleted.length < items.length ? '/' + items.length + ' (some failed)' : ''} multi-polls`);
    });
  }

  private bulkDelete(ids: string[], fn: (id: string) => any) {
    return forkJoin(ids.map(id => (fn(id) as any).pipe(
      map(() => id as string | null),
      catchError(() => of(null))
    ))).pipe(map(results => results.filter((r): r is string => r !== null)));
  }

  totalCandidates(mp: MultiPollAdminDto): number {
    return (mp.groups ?? []).reduce((s, g) => s + (g.candidates?.length ?? 0), 0);
  }

  private toIso(dtLocal: string): string { return new Date(dtLocal).toISOString(); }
  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
