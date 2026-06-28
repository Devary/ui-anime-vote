import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormControl, FormGroup, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { SelectModule } from 'primeng/select';

// ── Shared types ──────────────────────────────────────────────────────────────
export interface CharOption { id: string; displayName: string; imageUrl: string; }

// ── Per-group validator (exported so container can use it in the factory) ─────
export function groupPeriodValidator(serverNow: Date): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const startNow = group.get('startNow')?.value as boolean;
    const startVal = group.get('startDate')?.value as string;
    const endVal   = group.get('endDate')?.value   as string;
    const errors: ValidationErrors = {};
    const now = serverNow;
    let resolvedStart: Date | null = null;

    if (startNow) {
      resolvedStart = now;
    } else if (startVal) {
      resolvedStart = new Date(startVal);
      if (resolvedStart < new Date(now.getTime() - 60_000)) errors['startInPast'] = true;
    } else {
      errors['startDateRequired'] = true;
    }

    if (!endVal) {
      errors['endDateRequired'] = true;
    } else if (resolvedStart) {
      const end = new Date(endVal);
      if (end <= resolvedStart) {
        errors['endBeforeStart'] = true;
      } else if (end > new Date(resolvedStart.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        errors['endBeyond90Days'] = true;
      }
    }

    return Object.keys(errors).length ? errors : null;
  };
}

// ── Factory: creates a single group FormGroup with per-group validation ────────
export interface GroupFormConfig {
  isEdit?:    boolean;
  showPeriod?: boolean;
  serverNow?: Date;
}

export function createGroupForm(config: GroupFormConfig = {}): FormGroup {
  const { isEdit = false, showPeriod = true, serverNow = new Date() } = config;
  const validators: ValidatorFn[] = (!isEdit && showPeriod) ? [groupPeriodValidator(serverNow)] : [];
  return new FormGroup({
    label:      new FormControl(''),
    startNow:   new FormControl(false),
    startDate:  new FormControl(''),
    endDate:    new FormControl(''),
    candidates: new FormArray([new FormControl(''), new FormControl('')])
  }, { validators });
}

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-poll-group-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule],
  template: `
    <div class="group-card">
      <div class="group-header">
        @if (showLabel) {
          @if (!isEdit) {
            <input class="input group-label-input" [formControl]="labelCtrl"
                   [placeholder]="labelPlaceholder" />
          } @else {
            <span class="group-label-text">{{ labelCtrl.value || labelPlaceholder }}</span>
          }
        }
        @if (canRemove) {
          <button type="button" class="btn-icon danger" (click)="remove.emit()" title="Remove">
            <i class="pi pi-trash"></i>
          </button>
        }
      </div>

      @if (showPeriod && !isEdit) {
        <div class="period-row">
          <label class="period-check">
            <input type="checkbox" [formControl]="startNowCtrl" />
            <span>Start now</span>
          </label>
          @if (!startNow) {
            <label class="field period-field">
              <span>Start date *</span>
              <input type="datetime-local" class="input" [formControl]="startDateCtrl" [min]="minDateTime" />
            </label>
          }
          <label class="field period-field">
            <span>End date *</span>
            <input type="datetime-local" class="input" [formControl]="endDateCtrl" [min]="minDateTime" />
          </label>
        </div>
        @if (submitted && group.errors) {
          <div class="period-errors">
            @if (group.errors['startDateRequired']) {
              <small class="error-msg">Start date is required when "Start now" is unchecked</small>
            }
            @if (group.errors['startInPast']) {
              <small class="error-msg">Start date cannot be in the past</small>
            }
            @if (group.errors['endDateRequired']) {
              <small class="error-msg">End date is required</small>
            }
            @if (group.errors['endBeforeStart']) {
              <small class="error-msg">End date must be after start date</small>
            }
            @if (group.errors['endBeyond90Days']) {
              <small class="error-msg">End date cannot exceed 90 days from start</small>
            }
          </div>
        }
      }

      <div class="candidates-section">
        @for (ctrl of candidatesArray.controls; track ctrl; let j = $index) {
          <div class="candidate-slot">
            <span class="slot-num">{{ j + 1 }}</span>
            <p-select
              [formControl]="getCandidateCtrl(j)"
              [options]="charOptions"
              optionLabel="displayName"
              optionValue="id"
              [filter]="true"
              filterBy="displayName"
              [showClear]="true"
              [placeholder]="candidatePlaceholder"
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
            @if (candidatesArray.length > 2) {
              <button type="button" class="btn-icon danger" (click)="removeCandidate(j)" title="Remove">
                <i class="pi pi-times"></i>
              </button>
            }
          </div>
        }
        @if (candidatesArray.length < 10) {
          <button type="button" class="btn-ghost-sm add-cand" (click)="addCandidate()">
            + Add {{ candidateLabel }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .group-card { background: var(--rz-surface-hover); border: 1px solid var(--rz-border-faint);
                   border-radius: var(--rz-radius-sm); padding: 0.75rem; display: flex;
                   flex-direction: column; gap: 0.5rem; }
    .group-header { display: flex; gap: 0.5rem; align-items: center; min-height: 2rem; }
    .group-label-input { flex: 1; }
    .group-label-text { flex: 1; font-size: 0.82rem; font-weight: 600; color: var(--rz-ink); }
    .period-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem;
                   padding: 0.5rem; background: var(--rz-glass-bg); border-radius: var(--rz-radius-sm);
                   border: 1px solid var(--rz-border-faint); }
    .period-check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem;
                     color: var(--rz-ink-muted); cursor: pointer; user-select: none; white-space: nowrap; }
    .period-check input[type="checkbox"] { accent-color: var(--rz-primary); width: 14px; height: 14px; }
    .period-field { flex: 1; min-width: 180px; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .period-errors { display: flex; flex-direction: column; gap: 0.15rem; }
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
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .error-msg { color: var(--rz-danger); font-size: 0.75rem; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.3rem 0.4rem;
                 border-radius: var(--rz-radius-sm); color: var(--rz-ink-muted); }
    .btn-icon:hover { background: var(--rz-surface-hover); color: var(--rz-ink); }
    .btn-icon.danger:hover { background: var(--rz-danger-bg); color: var(--rz-danger); }
    .btn-ghost-sm { padding: 0.25rem 0.75rem; border-radius: var(--rz-radius-sm);
                     border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink);
                     font-size: 0.78rem; cursor: pointer; }
    .btn-ghost-sm:hover { background: var(--rz-surface-hover); }
  `]
})
export class PollGroupFormComponent {
  @Input({ required: true }) group!: FormGroup;
  @Input() charOptions: CharOption[] = [];
  @Input() showLabel = true;
  @Input() showPeriod = true;
  @Input() isEdit = false;
  @Input() canRemove = true;
  @Input() submitted = false;
  @Input() labelPlaceholder = 'Group label e.g. Round 1';
  @Input() candidatePlaceholder = 'Select fighter…';
  @Input() candidateLabel = 'Fighter';
  @Output() remove = new EventEmitter<void>();

  get labelCtrl():     FormControl { return this.group.get('label')     as FormControl; }
  get startNowCtrl():  FormControl { return this.group.get('startNow')  as FormControl; }
  get startDateCtrl(): FormControl { return this.group.get('startDate') as FormControl; }
  get endDateCtrl():   FormControl { return this.group.get('endDate')   as FormControl; }
  get candidatesArray(): FormArray { return this.group.get('candidates') as FormArray; }
  getCandidateCtrl(j: number): FormControl { return this.candidatesArray.at(j) as FormControl; }
  get startNow(): boolean { return this.group.get('startNow')?.value === true; }

  get minDateTime(): string {
    const d = new Date();
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  addCandidate(): void {
    if (this.candidatesArray.length < 10) this.candidatesArray.push(new FormControl(''));
  }

  removeCandidate(j: number): void {
    if (this.candidatesArray.length > 2) this.candidatesArray.removeAt(j);
  }

  onImgErr(event: Event): void { (event.target as HTMLImageElement).style.display = 'none'; }
}
