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
import { DataRefreshService } from '../../services/data-refresh.service';
import { PollExportService } from '../../services/poll-export.service';
import { AnimeDto, CharacterDto, MultiPollAdminDto, MultiPollCreateDto, GroupCreateDto } from '../../services/api.types';
import { PollGroupFormComponent, CharOption, createGroupForm, groupPeriodValidator } from '../poll-group-form/poll-group-form.component';
import { CrudModalComponent } from '../../shared/crud-modal/crud-modal.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-multi-poll-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, SelectModule, PollGroupFormComponent, CrudModalComponent, ConfirmModalComponent],
  template: `
    <div class="section">

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
            <div class="caption-actions">
              <button class="btn-danger" type="button"
                      [disabled]="!selectedIds().size"
                      (click)="delSelected()">
                Remove Selected{{ selectedIds().size ? ' (' + selectedIds().size + ')' : '' }}
              </button>
              <button class="btn-danger" type="button"
                      [disabled]="!multiPolls().length"
                      (click)="delAll()">
                Remove All
              </button>
              <button class="btn-primary" type="button" (click)="openNew()">
                + New Multi-Poll
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
            <th style="width:90px">Groups</th>
            <th style="width:110px">Candidates</th>
            <th style="width:100px">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-mp>
          <tr [class.row-selected]="selectedIds().has(mp.id)">
            <td>
              <input type="checkbox" class="row-check"
                     [checked]="selectedIds().has(mp.id)"
                     (change)="toggleRow(mp.id)" />
            </td>
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

      <!-- Form modal -->
      @if (showForm()) {
        <app-crud-modal [title]="editing() ? 'Edit Multi-Poll (candidates only)' : 'New Multi-Poll'" (closeRequest)="onCloseRequest()">
          <form [formGroup]="form" (ngSubmit)="requestSave()">
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
                Groups
                @if (!editing()) {
                  <span class="optional"> — build levels with "Add Level ↑"</span>
                }
              </span>
              <div class="groups-actions">
                @if (!editing() && maxLevel > 0) {
                  <button type="button" class="btn-ghost-sm btn-danger-outline" (click)="removeLevel()">
                    ↓ Remove {{ levelLabel(maxLevel) }}
                  </button>
                }
                @if (!editing()) {
                  <button type="button" class="btn-ghost-sm" (click)="addLevel()"
                          [disabled]="groupsAtMaxLevel().length < 2">
                    Add Level ↑
                  </button>
                }
                <button type="button" class="btn-ghost-sm" (click)="addGroup()"
                        [disabled]="!editing() && maxLevel > 0"
                        [title]="!editing() && maxLevel > 0 ? 'Remove higher levels before adding QF groups' : ''">
                  + Group
                </button>
              </div>
            </div>

            @if (submitted && !editing()) {
              @if (groupsArray.errors?.['noGroupStartsNow']) {
                <div class="cross-error">At least one Quarter-Final group must have "Start now" checked</div>
              }
              @if (groupsArray.errors?.['groupsOutOfOrder']) {
                <div class="cross-error">Groups must be in chronological order</div>
              }
            }

            @for (ctrl of groupsArray.controls; track ctrl; let i = $index) {

              @if (isFirstOfLevel(i)) {
                <div class="level-header">
                  <span class="level-badge">{{ levelLabel(groupLevels[i] ?? 0) }}</span>
                  @if ((groupLevels[i] ?? 0) > 0) {
                    <span class="level-hint">Schedule and label — fighters resolved from winners</span>
                  }
                </div>
              }

              @if ((groupLevels[i] ?? 0) === 0) {
                <app-poll-group-form
                  [group]="getGroupForm(i)"
                  [charOptions]="charOptions()"
                  [excludeIds]="excludeIdsForGroup(i)"
                  [showLabel]="true"
                  [showPeriod]="!editing()"
                  [isEdit]="!!editing()"
                  [canRemove]="groupsArray.length > 2 && !isGroupReferenced(i) && maxLevel === 0"
                  [submitted]="submitted"
                  (remove)="removeGroup(i)" />
              } @else {
                <!-- Bracket group (level > 0): no fighter selection -->
                <div class="bracket-group">
                  <div [formGroup]="getGroupForm(i)" class="bracket-group-inner">
                    <div class="bg-top-row">
                      <label class="bg-label-field">
                        <span class="field-lbl">Label</span>
                        <input class="input" formControlName="label"
                               [placeholder]="(groupLevels[i] === 1 ? 'Semi-Final' : 'Grand Final') + ' ' + (i + 1)" />
                      </label>
                      <div class="bg-feeder-info">
                        <span class="bg-feeder-label">Feeds from</span>
                        <span class="bg-feeder-value">{{ feederLabels(i) }}</span>
                      </div>
                    </div>
                    @if (!editing()) {
                      <div class="bg-period-row">
                        <label class="bg-period-field">
                          <span class="field-lbl">Start Date</span>
                          <input class="input" type="datetime-local" formControlName="startDate" />
                        </label>
                        <label class="bg-period-field">
                          <span class="field-lbl">End Date</span>
                          <input class="input" type="datetime-local" formControlName="endDate" />
                        </label>
                      </div>
                    }
                  </div>
                </div>
              }
            }

            @if (error()) { <div class="error-msg-block">{{ error() }}</div> }
            @if (dupError()) {
              <div class="dup-banner">⚠ {{ dupError() }}
                <button type="button" class="dup-close" (click)="dupError.set(null)">✕</button>
              </div>
            }

            <div class="form-actions">
              <button class="btn-ghost" type="button" (click)="onCloseRequest()">Cancel</button>
              <button class="btn-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : (editing() ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </app-crud-modal>
      }

      <!-- Confirm modal -->
      @if (showConfirm()) {
        <app-confirm-modal
          [title]="confirmTitle()"
          [message]="confirmMsg()"
          [danger]="isDanger()"
          (confirmed)="onConfirmed()"
          (cancelled)="onCancelled()" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .section { display: flex; flex-direction: column; gap: 1rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .span-2 { grid-column: span 2; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .optional { font-size: 0.72rem; color: var(--rz-ink-faint); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .groups-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .groups-label { font-size: 0.8rem; font-weight: 600; color: var(--rz-ink-muted); }
    .groups-actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
    .cross-error { font-size: 0.78rem; color: var(--rz-danger); background: var(--rz-danger-bg);
                    padding: 0.35rem 0.6rem; border-radius: var(--rz-radius-sm); }
    .error-msg { color: var(--rz-danger); font-size: 0.75rem; }
    .error-msg-block { color: var(--rz-danger); font-size: 0.8rem; }
    .dup-banner { display: flex; align-items: center; gap: 0.5rem; background: var(--rz-danger-bg);
                   color: var(--rz-danger); border-radius: var(--rz-radius-sm); padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .dup-close { background: none; border: none; cursor: pointer; color: var(--rz-danger); font-size: 1rem; padding: 0; }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.25rem; }

    /* Level header */
    .level-header { display: flex; align-items: center; gap: 0.6rem; margin: 0.75rem 0 0.25rem; }
    .level-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
                    background: rgba(124,58,237,0.12); color: #7c3aed;
                    padding: 0.2rem 0.65rem; border-radius: 99px; }
    .level-hint { font-size: 0.72rem; color: var(--rz-ink-faint); font-style: italic; }

    /* Bracket group (level > 0) */
    .bracket-group { background: rgba(124,58,237,0.04); border: 1px dashed rgba(124,58,237,0.3);
                      border-radius: var(--rz-radius-sm); padding: 0.65rem 0.85rem; margin-bottom: 0.4rem; }
    .bracket-group-inner { display: flex; flex-direction: column; gap: 0.55rem; }
    .bg-top-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
    .bg-label-field { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 130px; }
    .bg-feeder-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 2; padding-bottom: 0.2rem; }
    .bg-feeder-label { font-size: 0.7rem; color: var(--rz-ink-faint); }
    .bg-feeder-value { font-size: 0.8rem; color: #7c3aed; font-style: italic; }
    .bg-period-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .bg-period-field { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 160px; }
    .field-lbl { font-size: 0.78rem; color: var(--rz-ink-muted); }

    /* Table */
    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .caption-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .row-check { width: 15px; height: 15px; cursor: pointer; accent-color: var(--rz-primary); }
    .row-selected td { background: rgba(21, 101, 192, 0.08); }
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
    .btn-ghost-sm:hover:not(:disabled) { background: var(--rz-surface-hover); }
    .btn-ghost-sm:disabled { opacity: 0.4; cursor: default; }
    .btn-danger-outline { border-color: var(--rz-danger) !important; color: var(--rz-danger) !important; }
    .btn-danger-outline:hover:not(:disabled) { background: var(--rz-danger-bg) !important; }
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

  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);
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
  readonly selectedIds = signal(new Set<string>());

  readonly allSelected = computed(() =>
    this.multiPolls().length > 0 && this.selectedIds().size === this.multiPolls().length
  );
  readonly someSelected = computed(() =>
    this.selectedIds().size > 0 && this.selectedIds().size < this.multiPolls().length
  );

  readonly charOptions = computed<CharOption[]>(() =>
    this.chars().map(c => ({
      id: c.id,
      displayName: c.anime ? `${c.name} (${c.anime})` : c.name,
      imageUrl: c.imageUrl
    }))
  );

  // ── Confirm modal state ──────────────────────────────────────────────────────
  readonly showConfirm  = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmMsg   = signal('');
  readonly isDanger     = signal(true);
  private confirmCb: () => void = () => {};

  private askConfirm(title: string, msg: string, cb: () => void, danger = true): void {
    this.confirmTitle.set(title); this.confirmMsg.set(msg);
    this.isDanger.set(danger); this.confirmCb = cb;
    this.showConfirm.set(true);
  }
  onConfirmed(): void { this.confirmCb(); this.showConfirm.set(false); }
  onCancelled(): void { this.showConfirm.set(false); }

  private serverNow = new Date();
  submitted = false;
  form!: FormGroup;

  /** Level of each group (0=QF, 1=SF, 2=GF). Parallel to groupsArray. */
  groupLevels: number[] = [0, 0];
  /** Feeder group indices for each group. Parallel to groupsArray. Empty for level-0 groups. */
  groupFeederIndices: number[][] = [[], []];

  // ── Bracket helpers ────────────────────────────────────────────────────────

  get maxLevel(): number {
    return this.groupLevels.length ? Math.max(...this.groupLevels) : 0;
  }

  groupsAtMaxLevel(): number[] {
    const max = this.maxLevel;
    return this.groupLevels.map((l, i) => ({ l, i })).filter(({ l }) => l === max).map(({ i }) => i);
  }

  isFirstOfLevel(i: number): boolean {
    return i === 0 || this.groupLevels[i] !== this.groupLevels[i - 1];
  }

  levelLabel(level: number): string {
    if (level === 0) return 'Quarter-Finals';
    if (level === 1) return 'Semi-Finals';
    if (level === 2) return 'Grand Final';
    return `Level ${level}`;
  }

  feederLabels(i: number): string {
    const feeders = this.groupFeederIndices[i] ?? [];
    if (!feeders.length) return '—';
    return feeders.map(f => {
      const lbl = this.getGroupForm(f)?.get('label')?.value?.trim();
      return lbl || `Group ${f + 1}`;
    }).join(' and ');
  }

  isGroupReferenced(i: number): boolean {
    return this.groupFeederIndices.some(feeders => feeders.includes(i));
  }

  addLevel(): void {
    const idxsAtMax = this.groupsAtMaxLevel();
    if (idxsAtMax.length < 2) {
      this.toast.error('Need at least 2 groups at the current level to add a higher bracket level');
      return;
    }
    const newLevel = this.maxLevel + 1;
    const isEdit = !!this.editing();
    const newCount = Math.ceil(idxsAtMax.length / 2);
    for (let k = 0; k < newCount; k++) {
      const feederA = idxsAtMax[k * 2];
      const feederB = idxsAtMax[k * 2 + 1];
      const feeders = feederB !== undefined ? [feederA, feederB] : [feederA];
      this.groupsArray.push(this.newGroupForm(isEdit));
      this.groupLevels.push(newLevel);
      this.groupFeederIndices.push(feeders);
    }
  }

  removeLevel(): void {
    const maxLvl = this.maxLevel;
    if (maxLvl === 0) return;
    const indices = this.groupLevels
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l === maxLvl)
      .map(({ i }) => i)
      .reverse();
    for (const idx of indices) {
      this.groupsArray.removeAt(idx);
      this.groupLevels.splice(idx, 1);
      this.groupFeederIndices.splice(idx, 1);
    }
  }

  // ── Cross-group validators ─────────────────────────────────────────────────

  private readonly atLeastOneNowValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    const fa = arr as FormArray;
    const hasLevel0 = this.groupLevels.some(l => l === 0);
    if (!hasLevel0) return null;
    return fa.controls.some((g, i) => (this.groupLevels[i] ?? 0) === 0 && g.get('startNow')?.value)
      ? null : { noGroupStartsNow: true };
  };

  private readonly groupsOrderedValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    if (this.groupLevels.some(l => l > 0)) return null; // bracket mode: skip ordering check
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
    this.groupLevels = [0, 0];
    this.groupFeederIndices = [[], []];
  }

  load(): void {
    this.loading.set(true);
    this.api.adminGetMultiPolls().subscribe({
      next: list => { this.multiPolls.set(list); this.loading.set(false); },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  toggleRow(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.multiPolls().map(mp => mp.id)));
    }
  }

  // ── UI actions ─────────────────────────────────────────────────────────────

  openNew(): void {
    this.editing.set(null);
    this.api.getServerTime().subscribe({ next: t => { this.serverNow = new Date(t.now); } });
    this.initForm(false);
    this.groupLevels = [0, 0];
    this.groupFeederIndices = [[], []];
    this.error.set(null);
    this.dupError.set(null);
    this.showForm.set(true);
  }

  startEdit(mp: MultiPollAdminDto): void {
    this.editing.set(mp);
    this.initForm(true);
    const ga = this.groupsArray;
    ga.clear();
    this.groupLevels = [];
    this.groupFeederIndices = [];
    (mp.groups ?? []).forEach(g => {
      const gf = this.newGroupForm(true);
      gf.patchValue({ label: g.label });
      const cArr = gf.get('candidates') as FormArray;
      cArr.clear();
      const ids = g.candidates.map(c => c.id);
      while (ids.length < 2) ids.push('');
      ids.forEach(id => cArr.push(new FormControl(id)));
      ga.push(gf);
      this.groupLevels.push(g.level);
      this.groupFeederIndices.push([]); // feeder structure not editable in edit mode
    });
    if (ga.length < 2) { ga.push(this.newGroupForm(true)); this.groupLevels.push(0); this.groupFeederIndices.push([]); }
    this.form.patchValue({ anime: mp.anime ?? '', question: mp.question });
    this.error.set(null);
    this.dupError.set(null);
    this.showForm.set(true);
  }

  onCloseRequest(): void {
    const dirty = this.form.dirty;
    if (dirty) {
      this.askConfirm('Discard changes?', 'You have unsaved changes. Discard them?',
        () => this.closeForm(), false);
    } else { this.closeForm(); }
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
    this.initForm(false);
    this.groupLevels = [0, 0];
    this.groupFeederIndices = [[], []];
    this.error.set(null);
    this.dupError.set(null);
  }

  addGroup(): void {
    this.groupsArray.push(this.newGroupForm(!!this.editing()));
    this.groupLevels.push(0);
    this.groupFeederIndices.push([]);
  }

  removeGroup(i: number): void {
    if (this.groupsArray.length > 2 && !this.isGroupReferenced(i)) {
      this.groupsArray.removeAt(i);
      this.groupLevels.splice(i, 1);
      this.groupFeederIndices.splice(i, 1);
      // Re-index feeder references after removal
      this.groupFeederIndices = this.groupFeederIndices.map(feeders =>
        feeders.map(f => f > i ? f - 1 : f).filter(f => f !== i)
      );
    }
  }

  /** Returns char IDs already selected in other groups at the same level — passed to each group form. */
  excludeIdsForGroup(i: number): string[] {
    const level = this.groupLevels[i] ?? 0;
    const excluded = new Set<string>();
    this.groupsArray.controls.forEach((ctrl, j) => {
      if (j === i) return;
      if ((this.groupLevels[j] ?? 0) !== level) return;
      const cArr = (ctrl as FormGroup).get('candidates') as FormArray;
      cArr.controls.forEach(c => { if (c.value) excluded.add(c.value as string); });
    });
    return [...excluded];
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  requestSave(): void {
    this.submitted = true;
    this.error.set(null);
    this.dupError.set(null);
    const isEdit = !!this.editing();

    for (let i = 0; i < this.groupsArray.length; i++) {
      const level = this.groupLevels[i] ?? 0;
      const gf    = this.getGroupForm(i);
      const label = gf.get('label')?.value?.trim() ?? '';
      if (!label) { this.error.set(`Group ${i + 1} needs a label`); return; }

      if (level === 0) {
        const cArr   = gf.get('candidates') as FormArray;
        const filled = cArr.controls.map(c => c.value as string).filter(id => id);
        if (filled.length < 2) { this.error.set('Each group needs at least 2 fighters'); return; }
        if (new Set(filled).size < filled.length) {
          this.error.set(`Group "${label}" has duplicate fighters`);
          return;
        }
      }
    }

    if (!isEdit && this.form.invalid) return;

    const questionVal: string = this.form.get('question')?.value ?? '';
    if (!questionVal.trim()) { this.error.set('Question is required'); return; }

    const editId = this.editing()?.id;
    this.askConfirm(
      editId ? 'Save changes?' : 'Create multi-poll?',
      editId ? 'Save the changes to this multi-poll?' : 'Create this new multi-poll?',
      () => this.doSave(), false
    );
  }

  private doSave(): void {
    this.saving.set(true);
    const isEdit = !!this.editing();
    const groups = this.buildGroupDtos(isEdit);
    const dto: MultiPollCreateDto = {
      anime:    this.form.get('anime')?.value ?? '',
      question: this.form.get('question')?.value ?? '',
      groups
    };

    const editId = this.editing()?.id;
    const req$ = editId
      ? this.api.adminUpdateMultiPoll(editId, dto)
      : this.api.adminCreateMultiPoll(dto);

    req$.subscribe({
      next: () => {
        this.toast.success(editId ? 'Multi-poll updated' : 'Multi-poll created');
        this.saving.set(false);
        this.closeForm();
        this.load();
        this.refresh.notify();
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
      const g      = ctrl as FormGroup;
      const level  = this.groupLevels[i] ?? 0;
      const feederIndices = this.groupFeederIndices[i] ?? [];
      const cArr   = g.get('candidates') as FormArray;
      const characterIds = level === 0
        ? cArr.controls.map(c => c.value as string).filter(id => id)
        : [];

      if (isEdit) {
        return { label: g.get('label')?.value ?? '', characterIds, startNow: false, level, feederIndices };
      }

      const startNow: boolean = level === 0 && !!g.get('startNow')?.value;
      const startDateRaw = g.get('startDate')?.value ?? '';
      const endDateRaw   = g.get('endDate')?.value   ?? '';
      return {
        label: g.get('label')?.value ?? '',
        characterIds,
        startNow,
        startDate: (!startNow && startDateRaw) ? this.toIso(startDateRaw) : null,
        endDate:   endDateRaw ? this.toIso(endDateRaw) : null,
        level,
        feederIndices
      };
    });
  }

  download(mp: MultiPollAdminDto): void { this.export.downloadMultiPoll(mp).catch(e => this.toast.error(this.msg(e))); }

  del(id: string): void {
    this.askConfirm('Delete multi-poll?', 'This will delete the multi-poll and all its votes. This action cannot be undone.',
      () => this.doDelete(id));
  }

  private doDelete(id: string): void {
    this.api.adminDeleteMultiPoll(id).subscribe({
      next: () => {
        this.toast.success('Multi-poll deleted');
        this.load();
        this.refresh.notify();
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.askConfirm(`Delete ${ids.length} multi-polls?`, 'This will delete the selected multi-polls and all their votes. This action cannot be undone.',
      () => this.doBulkDelete(ids));
  }

  delAll(): void {
    const items = this.multiPolls();
    if (!items.length) return;
    this.askConfirm(`Delete all ${items.length} multi-polls?`, 'This will delete all multi-polls and their votes. This action cannot be undone.',
      () => this.doBulkDelete(items.map(mp => mp.id)));
  }

  private doBulkDelete(ids: string[]): void {
    this.bulkDelete(ids, id => this.api.adminDeleteMultiPoll(id)).subscribe(deleted => {
      this.toast.success(`Deleted ${deleted.length}${deleted.length < ids.length ? '/' + ids.length + ' (some failed)' : ''} multi-polls`);
      this.selectedIds.set(new Set());
      this.load();
      this.refresh.notify();
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
