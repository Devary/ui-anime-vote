import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl,
  Validators, AbstractControl, ValidationErrors, ValidatorFn
} from '@angular/forms';
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
  imports: [CommonModule, ReactiveFormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule],
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
            <span class="groups-label">Groups <span class="optional">(min 2, each with ≥2 fighters)</span></span>
            <button type="button" class="btn-ghost-sm" (click)="addGroup()">+ Group</button>
          </div>

          @if (submitted && !editing()) {
            @if (groupsArray.errors?.['noGroupStartsNow']) {
              <div class="cross-error">At least one group must have "Start now" checked</div>
            }
            @if (groupsArray.errors?.['groupsOutOfOrder']) {
              <div class="cross-error">Groups must be in chronological order (each start date ≥ previous)</div>
            }
          }

          <div formArrayName="groups">
            @for (ctrl of groupsArray.controls; track ctrl; let i = $index) {
              <div class="group-card" [formGroupName]="i">

                <div class="group-header">
                  @if (!editing()) {
                    <input class="input group-label-input" formControlName="label"
                           placeholder="Group label e.g. Round 1" />
                  } @else {
                    <span class="group-label-text">{{ getGroupForm(i).get('label')?.value || ('Group ' + (i + 1)) }}</span>
                  }
                  <button type="button" class="btn-icon danger" (click)="removeGroup(i)"
                          [disabled]="groupsArray.length <= 2" title="Remove group">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>

                @if (!editing()) {
                  <div class="period-row">
                    <label class="period-check">
                      <input type="checkbox" formControlName="startNow" />
                      <span>Start now</span>
                    </label>
                    @if (!getStartNow(i)) {
                      <label class="field period-field">
                        <span>Start date *</span>
                        <input type="datetime-local" class="input" formControlName="startDate" [min]="minDateTime" />
                      </label>
                    }
                    <label class="field period-field">
                      <span>End date *</span>
                      <input type="datetime-local" class="input" formControlName="endDate" [min]="minDateTime" />
                    </label>
                  </div>
                  @if (submitted && getGroupForm(i).errors) {
                    <div class="period-errors">
                      @if (getGroupForm(i).errors?.['startDateRequired']) {
                        <small class="error-msg">Start date is required when "Start now" is unchecked</small>
                      }
                      @if (getGroupForm(i).errors?.['startInPast']) {
                        <small class="error-msg">Start date cannot be in the past</small>
                      }
                      @if (getGroupForm(i).errors?.['endDateRequired']) {
                        <small class="error-msg">End date is required</small>
                      }
                      @if (getGroupForm(i).errors?.['endBeforeStart']) {
                        <small class="error-msg">End date must be after start date</small>
                      }
                      @if (getGroupForm(i).errors?.['endBeyond90Days']) {
                        <small class="error-msg">End date cannot exceed 90 days from start</small>
                      }
                    </div>
                  }
                }

                <div class="candidates-section">
                  @for (candCtrl of getCandidatesArray(i).controls; track candCtrl; let cIdx = $index) {
                    <div class="candidate-slot">
                      <span class="slot-num">{{ cIdx + 1 }}</span>
                      <p-select
                        [formControl]="getCandidateControl(i, cIdx)"
                        [options]="charOptions()"
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
                      @if (getCandidatesArray(i).length > 2) {
                        <button type="button" class="btn-icon danger" (click)="removeCandidate(i, cIdx)" title="Remove fighter">
                          <i class="pi pi-times"></i>
                        </button>
                      }
                    </div>
                  }
                  @if (getCandidatesArray(i).length < 10) {
                    <button type="button" class="btn-ghost-sm add-cand" (click)="addCandidate(i)">+ Add Fighter</button>
                  }
                </div>

              </div>
            }
          </div>

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
              <button class="btn-icon" (click)="startEdit(mp)" title="Edit candidates">
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
    .group-label-text { flex: 1; font-size: 0.82rem; font-weight: 600; color: var(--rz-ink); }
    .period-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem;
                   padding: 0.5rem; background: var(--rz-glass-bg); border-radius: var(--rz-radius-sm);
                   border: 1px solid var(--rz-border-faint); }
    .period-check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem;
                     color: var(--rz-ink-muted); cursor: pointer; user-select: none; white-space: nowrap; }
    .period-check input[type="checkbox"] { accent-color: var(--rz-primary); width: 14px; height: 14px; }
    .period-field { flex: 1; min-width: 180px; }
    .period-errors { display: flex; flex-direction: column; gap: 0.15rem; }
    .cross-error { font-size: 0.78rem; color: var(--rz-danger); background: var(--rz-danger-bg);
                    padding: 0.35rem 0.6rem; border-radius: var(--rz-radius-sm); }
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
    .error-msg { color: var(--rz-danger); font-size: 0.75rem; }
    .error-msg-block { color: var(--rz-danger); font-size: 0.8rem; }
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

  private readonly api  = inject(AnimeApiService);
  private readonly toast = inject(ToastService);
  private readonly fb   = inject(FormBuilder);

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

  // Server time fetched once per form open; used for 90-day + past checks
  private serverNow = new Date();
  submitted = false;

  form!: FormGroup;

  // ── Form accessors ─────────────────────────────────────────────────────────

  get groupsArray(): FormArray { return this.form.get('groups') as FormArray; }

  getGroupForm(i: number): FormGroup { return this.groupsArray.at(i) as FormGroup; }

  getCandidatesArray(i: number): FormArray {
    return this.getGroupForm(i).get('candidates') as FormArray;
  }

  getCandidateControl(i: number, j: number): FormControl {
    return this.getCandidatesArray(i).at(j) as FormControl;
  }

  getStartNow(i: number): boolean {
    return this.getGroupForm(i).get('startNow')?.value === true;
  }

  get minDateTime(): string { return this.toDatetimeLocal(new Date().toISOString()); }

  // ── Validators ─────────────────────────────────────────────────────────────

  private readonly groupPeriodValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const startNow = group.get('startNow')?.value;
    const startVal = group.get('startDate')?.value;
    const endVal   = group.get('endDate')?.value;
    const errors: ValidationErrors = {};
    const now = this.serverNow;

    let resolvedStart: Date | null = null;
    if (startNow) {
      resolvedStart = now;
    } else if (startVal) {
      resolvedStart = new Date(startVal);
      const threshold = new Date(now.getTime() - 60_000); // 1-min tolerance
      if (resolvedStart < threshold) errors['startInPast'] = true;
    } else {
      errors['startDateRequired'] = true;
    }

    if (!endVal) {
      errors['endDateRequired'] = true;
    } else if (resolvedStart) {
      const end = new Date(endVal);
      if (end <= resolvedStart) {
        errors['endBeforeStart'] = true;
      } else {
        const max90 = new Date(resolvedStart.getTime() + 90 * 24 * 60 * 60 * 1000);
        if (end > max90) errors['endBeyond90Days'] = true;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  private readonly atLeastOneNowValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    const fa = arr as FormArray;
    return fa.controls.some(g => g.get('startNow')?.value) ? null : { noGroupStartsNow: true };
  };

  private readonly groupsOrderedValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    const fa = arr as FormArray;
    const now = this.serverNow;
    let prev: Date | null = null;
    for (let i = 1; i < fa.length; i++) {
      const g = fa.at(i);
      const isNow = g.get('startNow')?.value;
      const val   = g.get('startDate')?.value;
      const curr  = isNow ? now : (val ? new Date(val) : null);
      if (prev && curr && curr < prev) return { groupsOutOfOrder: { groupIndex: i } };
      if (curr) prev = curr;
    }
    return null;
  };

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

  // ── Form init ──────────────────────────────────────────────────────────────

  private initForm(isEdit: boolean): void {
    const groupArrayValidators: ValidatorFn[] = isEdit
      ? []
      : [this.atLeastOneNowValidator, this.groupsOrderedValidator];

    this.form = this.fb.group({
      anime:    [''],
      question: ['', Validators.required],
      groups:   this.fb.array(
        [this.newGroupForm(isEdit), this.newGroupForm(isEdit)],
        groupArrayValidators
      )
    });
    this.submitted = false;
  }

  private newGroupForm(isEdit: boolean): FormGroup {
    return this.fb.group({
      label:     [''],
      startNow:  [false],
      startDate: [''],
      endDate:   [''],
      candidates: this.fb.array([this.fb.control(''), this.fb.control('')])
    }, isEdit ? {} : { validators: this.groupPeriodValidator });
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

    const groupForms = (mp.groups ?? []).map(g => {
      const ids = g.candidates.map(c => c.id);
      while (ids.length < 2) ids.push('');
      const gf = this.newGroupForm(true);
      gf.patchValue({ label: g.label });
      const cArr = gf.get('candidates') as FormArray;
      cArr.clear();
      ids.forEach(id => cArr.push(this.fb.control(id)));
      return gf;
    });
    while (groupForms.length < 2) groupForms.push(this.newGroupForm(true));

    const ga = this.form.get('groups') as FormArray;
    ga.clear();
    groupForms.forEach(gf => ga.push(gf));

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

  addGroup(): void {
    const isEdit = !!this.editing();
    this.groupsArray.push(this.newGroupForm(isEdit));
  }

  removeGroup(i: number): void {
    if (this.groupsArray.length > 2) this.groupsArray.removeAt(i);
  }

  addCandidate(i: number): void {
    const arr = this.getCandidatesArray(i);
    if (arr.length < 10) arr.push(this.fb.control(''));
  }

  removeCandidate(i: number, j: number): void {
    const arr = this.getCandidatesArray(i);
    if (arr.length > 2) arr.removeAt(j);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  save(): void {
    this.submitted = true;
    this.error.set(null);
    this.dupError.set(null);

    const isEdit = !!this.editing();

    // Candidate validation (both modes)
    for (let i = 0; i < this.groupsArray.length; i++) {
      const filled = this.getCandidatesArray(i).controls.map(c => c.value as string).filter(id => id);
      if (filled.length < 2) { this.error.set('Each group needs at least 2 fighters'); return; }
      if (new Set(filled).size < filled.length) {
        const label = this.getGroupForm(i).get('label')?.value || `Group ${i + 1}`;
        this.error.set(`Group "${label}" has duplicate fighters`);
        return;
      }
    }

    // Date validation (create only)
    if (!isEdit && this.form.invalid) return;

    const editId = this.editing()?.id;
    const questionVal: string = this.form.get('question')?.value ?? '';
    if (!questionVal.trim()) { this.error.set('Question is required'); return; }

    const groups = this.buildGroupDtos(isEdit);
    const dto: MultiPollCreateDto = {
      anime:    this.form.get('anime')?.value ?? '',
      question: questionVal,
      groups
    };

    this.saving.set(true);
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
    return this.groupsArray.controls.map((ctrl, i) => {
      const g = ctrl as FormGroup;
      const characterIds = (g.get('candidates') as FormArray).controls
        .map(c => c.value as string)
        .filter(id => id);

      if (isEdit) {
        return { label: g.get('label')?.value ?? '', characterIds, startNow: false };
      }

      const startNow: boolean = g.get('startNow')?.value;
      const startDateRaw: string = g.get('startDate')?.value ?? '';
      const endDateRaw: string   = g.get('endDate')?.value ?? '';
      return {
        label: g.get('label')?.value ?? '',
        characterIds,
        startNow,
        startDate: (!startNow && startDateRaw) ? this.toIso(startDateRaw) : null,
        endDate:   endDateRaw ? this.toIso(endDateRaw) : null
      };
    });
  }

  del(id: string): void {
    if (!confirm('Delete this multi-poll and all its votes?')) return;
    this.api.adminDeleteMultiPoll(id).subscribe({
      next: () => { this.multiPolls.update(l => l.filter(mp => mp.id !== id)); this.toast.success('Multi-poll deleted'); },
      error: e => this.toast.error(this.msg(e))
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  totalCandidates(mp: MultiPollAdminDto): number {
    return (mp.groups ?? []).reduce((s, g) => s + (g.candidates?.length ?? 0), 0);
  }

  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }

  private toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private toIso(dtLocal: string): string { return new Date(dtLocal).toISOString(); }

  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
