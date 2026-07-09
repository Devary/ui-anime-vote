import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { AnimeDto, MultiPollAdminDto, MultiPollCreateDto, GroupCreateDto, Visibility } from '../../services/api.types';
import { PollGroupFormComponent, CharOption, createGroupForm } from '../../management/poll-group-form/poll-group-form.component';
import { VisibilityFieldComponent } from '../visibility-field/visibility-field.component';

export type MultiPollWizardMode = 'admin' | 'user';

/**
 * 3-step multi-poll creation/edit wizard: Properties → Groups & characters → Summary.
 * Shared by the admin Multi-Polls screen and the My Content screen — `mode` controls
 * the few behavioral differences between them (bracket levels, structural edits while editing).
 */
@Component({
  selector: 'app-multi-poll-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SelectModule, PollGroupFormComponent, VisibilityFieldComponent],
  template: `
    <div class="wizard">
      <div class="wizard-steps">
        <button type="button" class="step-dot" [class.active]="step === 1" [class.done]="step > 1" (click)="goTo(1)">
          <span class="dot-num">{{ step > 1 ? '✓' : 1 }}</span>
          <span class="dot-label">{{ i18n_properties }}</span>
        </button>
        <div class="step-line" [class.done]="step > 1"></div>
        <button type="button" class="step-dot" [class.active]="step === 2" [class.done]="step > 2"
                [disabled]="unlockedStep < 2" (click)="goTo(2)">
          <span class="dot-num">{{ step > 2 ? '✓' : 2 }}</span>
          <span class="dot-label">{{ i18n_groups }}</span>
        </button>
        <div class="step-line" [class.done]="step > 2"></div>
        <button type="button" class="step-dot" [class.active]="step === 3"
                [disabled]="unlockedStep < 3" (click)="goTo(3)">
          <span class="dot-num">3</span>
          <span class="dot-label">{{ i18n_summary }}</span>
        </button>
      </div>

      <div class="wizard-body">

        <!-- ── Step 1: Properties ─────────────────────────────────────────── -->
        @if (step === 1) {
          <div class="form-grid">
            <label class="field span-2">
              <span>Question *</span>
              <input class="input" [formControl]="questionCtrl" maxlength="254" placeholder="Who is the best?" />
              @if (stepSubmitted[1] && questionCtrl.invalid) {
                <small class="error-msg">Question is required</small>
              }
            </label>
            @if (!isEditing) {
              <label class="field">
                <span>Anime <span class="optional">(optional)</span></span>
                <p-select
                  [options]="animeList" [(ngModel)]="anime"
                  optionLabel="name" optionValue="name"
                  [filter]="true" filterBy="name" [editable]="true" [showClear]="true"
                  placeholder="Select or type…" appendTo="body" />
              </label>
              <app-visibility-field
                [(visibility)]="visForm.visibility"
                [(allowedUserIds)]="visForm.allowedUserIds" />
              <label class="field vbg-toggle span-2">
                <input type="checkbox" [(ngModel)]="votingByGroup" name="vbg" />
                <span>Vote by group <small>(voters pick a whole group instead of a character — cannot be changed later)</small></span>
              </label>
              @if (stepSubmitted[1] && visForm.visibility === 'RESTRICTED' && !visForm.allowedUserIds.length) {
                <small class="error-msg span-2">Select at least one allowed user</small>
              }
            } @else {
              <div class="readonly-chips span-2">
                <span class="ro-chip">{{ anime || 'No anime' }}</span>
                <span class="ro-chip">{{ visForm.visibility }}</span>
                <span class="ro-chip">{{ votingByGroup ? 'Vote by group' : 'Vote by character' }}</span>
                <small class="ro-hint">Anime, visibility and voting mode can't be changed after creation.</small>
              </div>
            }
          </div>
        }

        <!-- ── Step 2: Groups & characters ────────────────────────────────── -->
        @if (step === 2) {
          <div class="groups-header">
            <span class="groups-label">
              Groups
              @if (mode === 'admin' && !isEditing) {
                <span class="optional"> — build levels with "Add Level ↑"</span>
              }
            </span>
            <div class="groups-actions">
              @if (mode === 'admin' && !isEditing && maxLevel > 0) {
                <button type="button" class="btn-ghost-sm btn-danger-outline" (click)="removeLevel()">
                  ↓ Remove {{ levelLabel(maxLevel) }}
                </button>
              }
              @if (mode === 'admin' && !isEditing) {
                <button type="button" class="btn-ghost-sm" (click)="addLevel()" [disabled]="groupsAtMaxLevel().length < 2">
                  Add Level ↑
                </button>
              }
              @if (showAddGroupButton) {
                <button type="button" class="btn-ghost-sm" (click)="addGroup()" [disabled]="addGroupDisabled"
                        [title]="addGroupDisabled ? 'Remove higher levels before adding groups' : ''">
                  + Group
                </button>
              }
            </div>
          </div>

          @if (stepSubmitted[2] && !isEditing) {
            @if (groupsArray.errors?.['noGroupStartsNow']) {
              <div class="cross-error">At least one group must have "Start now" checked</div>
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
                [charOptions]="charOptions"
                [excludeIds]="excludeIdsForGroup(i)"
                [showLabel]="true"
                [showPeriod]="!isEditing"
                [isEdit]="isEditing"
                [canRemove]="canRemoveGroup(i)"
                [submitted]="stepSubmitted[2]"
                (remove)="removeGroup(i)" />
            } @else {
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
                  @if (!isEditing) {
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

          @if (stepError) { <div class="error-msg-block">{{ stepError }}</div> }
        }

        <!-- ── Step 3: Summary ─────────────────────────────────────────────── -->
        @if (step === 3) {
          <div class="summary">
            <div class="summary-row">
              <span class="summary-label">Question</span>
              <span class="summary-value">{{ questionCtrl.value || '—' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Anime</span>
              <span class="summary-value">{{ anime || '—' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Visibility</span>
              <span class="summary-value">
                {{ visForm.visibility }}
                @if (visForm.visibility === 'RESTRICTED') {
                  <small> · {{ visForm.allowedUserIds.length }} user(s)</small>
                }
              </span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Voting mode</span>
              <span class="summary-value">{{ votingByGroup ? 'Vote by group' : 'Vote by character' }}</span>
            </div>

            <div class="summary-groups">
              @for (ctrl of groupsArray.controls; track ctrl; let i = $index) {
                <div class="summary-group-card">
                  <div class="sg-head">
                    <span class="sg-label">{{ getGroupForm(i).get('label')?.value || 'Group ' + (i + 1) }}</span>
                    @if ((groupLevels[i] ?? 0) > 0) {
                      <span class="level-badge">{{ levelLabel(groupLevels[i]) }}</span>
                    }
                  </div>
                  @if ((groupLevels[i] ?? 0) === 0) {
                    <div class="sg-candidates">
                      @for (c of candidateNamesFor(i); track c) { <span class="sg-chip">{{ c }}</span> }
                    </div>
                  } @else {
                    <div class="sg-feeders">Feeds from {{ feederLabels(i) }}</div>
                  }
                </div>
              }
            </div>
          </div>
        }

        @if (error) { <div class="error-msg-block">{{ error }}</div> }
        @if (dupError) {
          <div class="dup-banner">⚠ {{ dupError }}
            <button type="button" class="dup-close" (click)="dupErrorDismiss.emit()">✕</button>
          </div>
        }
      </div>

      <div class="wizard-actions">
        @if (step > 1) { <button class="btn-ghost" type="button" (click)="prev()">← Back</button> }
        <div class="spacer"></div>
        <button class="btn-ghost" type="button" (click)="cancelRequest.emit()">Cancel</button>
        @if (step < 3) {
          <button class="btn-primary" type="button" (click)="next()">Next →</button>
        } @else {
          <button class="btn-primary" type="button" (click)="submitFinal()" [disabled]="saving">
            {{ saving ? 'Saving…' : submitLabel }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wizard { display: flex; flex-direction: column; gap: 1rem; }

    /* Stepper */
    .wizard-steps { display: flex; align-items: center; gap: 0.4rem; }
    .step-dot { display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
                 background: none; border: none; cursor: pointer; padding: 0.2rem; flex-shrink: 0; }
    .step-dot:disabled { cursor: default; opacity: 0.5; }
    .dot-num { width: 1.8rem; height: 1.8rem; border-radius: 50%; display: grid; place-items: center;
                font-size: 0.8rem; font-weight: 700; background: var(--rz-surface-hover);
                border: 1px solid var(--rz-border); color: var(--rz-ink-muted); }
    .step-dot.active .dot-num { background: var(--rz-primary); border-color: var(--rz-primary); color: #fff; }
    .step-dot.done .dot-num { background: rgba(34,197,94,0.15); border-color: #16a34a; color: #16a34a; }
    .dot-label { font-size: 0.68rem; font-weight: 600; color: var(--rz-ink-muted); white-space: nowrap; }
    .step-dot.active .dot-label { color: var(--rz-ink); }
    .step-line { flex: 1; height: 2px; background: var(--rz-border); margin-bottom: 1.1rem; }
    .step-line.done { background: #16a34a; }

    .wizard-body { min-height: 12rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .wizard-actions { display: flex; align-items: center; gap: 0.5rem; }
    .spacer { flex: 1; }

    /* Step 1 */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .span-2 { grid-column: span 2; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .optional { font-size: 0.72rem; color: var(--rz-ink-faint); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .vbg-toggle { flex-direction: row; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--rz-ink); }
    .vbg-toggle input { accent-color: var(--rz-primary); width: 15px; height: 15px; }
    .vbg-toggle small { display: block; color: var(--rz-ink-faint); font-weight: 400; }
    .readonly-chips { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .ro-chip { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 99px;
                background: var(--rz-surface-hover); color: var(--rz-ink-muted); border: 1px solid var(--rz-border-faint); }
    .ro-hint { flex-basis: 100%; font-size: 0.72rem; color: var(--rz-ink-faint); }

    /* Step 2 groups */
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

    .level-header { display: flex; align-items: center; gap: 0.6rem; margin: 0.75rem 0 0.25rem; }
    .level-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
                    background: rgba(124,58,237,0.12); color: #7c3aed;
                    padding: 0.2rem 0.65rem; border-radius: 99px; }
    .level-hint { font-size: 0.72rem; color: var(--rz-ink-faint); font-style: italic; }

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

    /* Step 3 summary */
    .summary { display: flex; flex-direction: column; gap: 0.6rem; }
    .summary-row { display: flex; gap: 0.75rem; font-size: 0.85rem; }
    .summary-label { width: 7rem; flex-shrink: 0; color: var(--rz-ink-muted); font-weight: 600; }
    .summary-value { color: var(--rz-ink); font-weight: 600; }
    .summary-groups { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.4rem; }
    .summary-group-card { border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-sm);
                            background: var(--rz-surface-hover); padding: 0.6rem 0.75rem; }
    .sg-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
    .sg-label { font-weight: 700; font-size: 0.85rem; color: var(--rz-ink); }
    .sg-candidates { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .sg-chip { font-size: 0.72rem; padding: 0.15rem 0.55rem; border-radius: 99px;
                background: var(--rz-glass-bg); border: 1px solid var(--rz-border-faint); color: var(--rz-ink-muted); }
    .sg-feeders { font-size: 0.78rem; color: #7c3aed; font-style: italic; }

    /* Buttons */
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

    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; }
      .dot-label { display: none; }
    }
  `],
})
export class MultiPollWizardComponent implements OnInit {
  @Input({ required: true }) mode!: MultiPollWizardMode;
  @Input() animeList: AnimeDto[] = [];
  @Input() charOptions: CharOption[] = [];
  @Input() editing: MultiPollAdminDto | null = null;
  @Input() serverNow: Date = new Date();
  @Input() saving = false;
  @Input() error: string | null = null;
  @Input() dupError: string | null = null;

  @Output() save = new EventEmitter<MultiPollCreateDto>();
  @Output() cancelRequest = new EventEmitter<void>();
  @Output() dupErrorDismiss = new EventEmitter<void>();

  readonly i18n_properties = 'Properties';
  readonly i18n_groups = 'Groups';
  readonly i18n_summary = 'Summary';

  step: 1 | 2 | 3 = 1;
  unlockedStep = 1;
  stepSubmitted: Record<number, boolean> = { 1: false, 2: false, 3: false };
  stepError: string | null = null;

  form!: FormGroup;
  anime = '';
  visForm: { visibility: Visibility; allowedUserIds: string[] } = { visibility: 'PUBLIC', allowedUserIds: [] };
  votingByGroup = false;

  groupLevels: number[] = [0, 0];
  groupFeederIndices: number[][] = [[], []];

  get isEditing(): boolean { return !!this.editing; }
  get questionCtrl(): FormControl { return this.form.get('question') as FormControl; }
  get groupsArray(): FormArray { return this.form.get('groups') as FormArray; }
  getGroupForm(i: number): FormGroup { return this.groupsArray.at(i) as FormGroup; }

  get dirty(): boolean { return this.form?.dirty ?? false; }

  get submitLabel(): string {
    if (this.mode === 'admin') return this.isEditing ? 'Update' : 'Create';
    if (this.isEditing) return 'Save changes';
    return (this.visForm.visibility === 'PRIVATE' || this.visForm.visibility === 'RESTRICTED')
      ? 'Create' : 'Submit for approval';
  }

  get showAddGroupButton(): boolean {
    return this.mode === 'admin' || !this.isEditing;
  }
  get addGroupDisabled(): boolean {
    return this.mode === 'admin' && !this.isEditing && this.maxLevel > 0;
  }
  canRemoveGroup(i: number): boolean {
    if (this.mode === 'user') return this.groupsArray.length > 2 && !this.isEditing;
    return this.groupsArray.length > 2 && !this.isGroupReferenced(i) && this.maxLevel === 0;
  }

  // ── Bracket helpers (admin mode only in practice) ───────────────────────────

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
    if (idxsAtMax.length < 2) return;
    const newLevel = this.maxLevel + 1;
    const newCount = Math.ceil(idxsAtMax.length / 2);
    for (let k = 0; k < newCount; k++) {
      const feederA = idxsAtMax[k * 2];
      const feederB = idxsAtMax[k * 2 + 1];
      const feeders = feederB !== undefined ? [feederA, feederB] : [feederA];
      this.groupsArray.push(this.newBracketGroupForm());
      this.groupLevels.push(newLevel);
      this.groupFeederIndices.push(feeders);
    }
  }

  removeLevel(): void {
    const maxLvl = this.maxLevel;
    if (maxLvl === 0) return;
    const indices = this.groupLevels
      .map((l, i) => ({ l, i })).filter(({ l }) => l === maxLvl).map(({ i }) => i).reverse();
    for (const idx of indices) {
      this.groupsArray.removeAt(idx);
      this.groupLevels.splice(idx, 1);
      this.groupFeederIndices.splice(idx, 1);
    }
  }

  // ── Cross-group validators ──────────────────────────────────────────────────

  private readonly atLeastOneNowValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    const fa = arr as FormArray;
    const hasLevel0 = this.groupLevels.some(l => l === 0);
    if (!hasLevel0) return null;
    return fa.controls.some((g, i) => (this.groupLevels[i] ?? 0) === 0 && g.get('startNow')?.value)
      ? null : { noGroupStartsNow: true };
  };

  private readonly groupsOrderedValidator: ValidatorFn = (arr: AbstractControl): ValidationErrors | null => {
    if (this.groupLevels.some(l => l > 0)) return null;
    const fa = arr as FormArray;
    const now = this.serverNow;
    let prev: Date | null = null;
    for (let i = 1; i < fa.length; i++) {
      const g = fa.at(i);
      const curr = g.get('startNow')?.value ? now
        : g.get('startDate')?.value ? new Date(g.get('startDate')!.value) : null;
      if (prev && curr && curr < prev) return { groupsOutOfOrder: { groupIndex: i } };
      if (curr) prev = curr;
    }
    return null;
  };

  // ── Form init ────────────────────────────────────────────────────────────────

  private initForm(isEdit: boolean): void {
    const arrayValidators: ValidatorFn[] = isEdit ? [] : [this.atLeastOneNowValidator, this.groupsOrderedValidator];
    this.form = new FormGroup({
      question: new FormControl('', Validators.required),
      groups: new FormArray([this.newGroupForm(isEdit), this.newGroupForm(isEdit)], arrayValidators),
    });
  }

  private newGroupForm(isEdit: boolean): FormGroup {
    return createGroupForm({ isEdit, showPeriod: !isEdit, serverNow: this.serverNow });
  }

  private newBracketGroupForm(): FormGroup {
    return createGroupForm({ isEdit: false, showPeriod: false, serverNow: this.serverNow });
  }

  ngOnInit(): void {
    const mp = this.editing;
    if (!mp) {
      this.visForm = { visibility: 'PUBLIC', allowedUserIds: [] };
      this.votingByGroup = false;
      this.anime = '';
      this.initForm(false);
      this.groupLevels = [0, 0];
      this.groupFeederIndices = [[], []];
      return;
    }

    this.visForm = { visibility: mp.visibility ?? (mp.isPrivate ? 'PRIVATE' : 'PUBLIC'), allowedUserIds: [...(mp.allowedUserIds ?? [])] };
    this.votingByGroup = mp.votingByGroup ?? false;
    this.anime = mp.anime ?? '';
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
      this.groupFeederIndices.push([]);
    });
    if (ga.length < 2) { ga.push(this.newGroupForm(true)); this.groupLevels.push(0); this.groupFeederIndices.push([]); }
    this.form.patchValue({ question: mp.question });
  }

  addGroup(): void {
    this.groupsArray.push(this.newGroupForm(this.isEditing));
    this.groupLevels.push(0);
    this.groupFeederIndices.push([]);
    this.form.markAsDirty();
  }

  removeGroup(i: number): void {
    if (this.groupsArray.length > 2 && !this.isGroupReferenced(i)) {
      this.groupsArray.removeAt(i);
      this.groupLevels.splice(i, 1);
      this.groupFeederIndices.splice(i, 1);
      this.groupFeederIndices = this.groupFeederIndices.map(feeders =>
        feeders.map(f => f > i ? f - 1 : f).filter(f => f !== i));
      this.form.markAsDirty();
    }
  }

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

  candidateNamesFor(i: number): string[] {
    const cArr = this.getGroupForm(i).get('candidates') as FormArray;
    return cArr.controls
      .map(c => c.value as string)
      .filter(Boolean)
      .map(id => this.charOptions.find(o => o.id === id)?.displayName ?? id);
  }

  // ── Step navigation ──────────────────────────────────────────────────────────

  goTo(n: 1 | 2 | 3): void {
    if (n <= this.unlockedStep) this.step = n;
  }

  prev(): void {
    if (this.step > 1) this.step = (this.step - 1) as 1 | 2 | 3;
  }

  next(): void {
    this.stepSubmitted[this.step] = true;
    if (this.step === 1 && !this.validateStep1()) return;
    if (this.step === 2 && !this.validateStep2()) return;
    this.step = (this.step + 1) as 1 | 2 | 3;
    this.unlockedStep = Math.max(this.unlockedStep, this.step);
  }

  private validateStep1(): boolean {
    if (this.questionCtrl.invalid || !this.questionCtrl.value?.trim()) return false;
    if (!this.isEditing && this.visForm.visibility === 'RESTRICTED' && !this.visForm.allowedUserIds.length) return false;
    return true;
  }

  private validateStep2(): boolean {
    this.stepError = null;
    for (let i = 0; i < this.groupsArray.length; i++) {
      const level = this.groupLevels[i] ?? 0;
      const gf = this.getGroupForm(i);
      const label = gf.get('label')?.value?.trim() ?? '';
      if (!label) { this.stepError = `Group ${i + 1} needs a label`; return false; }
      if (level === 0) {
        const cArr = gf.get('candidates') as FormArray;
        const filled = cArr.controls.map(c => c.value as string).filter(id => id);
        if (filled.length < 2) { this.stepError = 'Each group needs at least 2 fighters'; return false; }
        if (new Set(filled).size < filled.length) { this.stepError = `Group "${label}" has duplicate fighters`; return false; }
      }
    }
    if (!this.isEditing && this.groupsArray.invalid) {
      this.stepError = 'Check the group schedules above';
      return false;
    }
    return true;
  }

  submitFinal(): void {
    this.stepSubmitted[3] = true;
    if (!this.validateStep1() || !this.validateStep2()) return;
    this.save.emit(this.buildDto());
  }

  private buildDto(): MultiPollCreateDto {
    const groups = this.buildGroupDtos();
    return {
      anime: this.anime,
      question: this.questionCtrl.value ?? '',
      visibility: this.visForm.visibility,
      allowedUserIds: this.visForm.allowedUserIds,
      votingByGroup: this.votingByGroup,
      groups,
    };
  }

  private buildGroupDtos(): GroupCreateDto[] {
    return this.groupsArray.controls.map((ctrl, i) => {
      const g = ctrl as FormGroup;
      const level = this.groupLevels[i] ?? 0;
      const feederIndices = this.groupFeederIndices[i] ?? [];
      const cArr = g.get('candidates') as FormArray;
      const characterIds = level === 0 ? cArr.controls.map(c => c.value as string).filter(id => id) : [];

      if (this.isEditing) {
        return { label: g.get('label')?.value ?? '', characterIds, startNow: false, level, feederIndices };
      }
      const startNow: boolean = level === 0 && !!g.get('startNow')?.value;
      const startDateRaw = g.get('startDate')?.value ?? '';
      const endDateRaw = g.get('endDate')?.value ?? '';
      return {
        label: g.get('label')?.value ?? '',
        characterIds,
        startNow,
        startDate: (!startNow && startDateRaw) ? this.toIso(startDateRaw) : null,
        endDate: endDateRaw ? this.toIso(endDateRaw) : null,
        level,
        feederIndices,
      };
    });
  }

  private toIso(dtLocal: string): string { return new Date(dtLocal).toISOString(); }
}
