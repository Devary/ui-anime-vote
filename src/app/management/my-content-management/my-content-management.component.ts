import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DataRefreshService } from '../../services/data-refresh.service';
import {
  CharacterDto, CharacterCreateDto, PollDto, PollCreateDto,
  MultiPollAdminDto, MultiPollCreateDto, AnimeDto, ContentStatus, DailyLimitDto
} from '../../services/api.types';
import { PollGroupFormComponent, CharOption, createGroupForm } from '../poll-group-form/poll-group-form.component';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { CrudModalComponent } from '../../shared/crud-modal/crud-modal.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

type SubTab = 'characters' | 'polls' | 'multi-polls';

@Component({
  selector: 'app-my-content-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, SelectModule,
    PollGroupFormComponent, ImageUploadComponent, CrudModalComponent, ConfirmModalComponent
  ],
  template: `
    <div class="my-content">

      <!-- Sub-nav -->
      <div class="sub-nav">
        @for (t of tabs; track t.id) {
          <button class="sub-tab" [class.active]="activeTab() === t.id" (click)="activeTab.set(t.id)">
            {{ t.label }}
            <span class="tab-count">{{ countFor(t.id) }}</span>
          </button>
        }
      </div>

      <!-- Daily limits -->
      @if (limits()) {
        <div class="limits-bar">
          <span class="limit-item">Characters: {{ limits()!.charactersToday }}/5</span>
          <span class="limit-item">Polls: {{ limits()!.pollsToday }}/5</span>
          <span class="limit-item">Multi-Polls: {{ limits()!.multiPollsToday }}/5</span>
        </div>
      }

      <!-- ── Characters ────────────────────────────────────────────────── -->
      @if (activeTab() === 'characters') {
        <div class="section">
          <div class="section-header">
            <span class="section-title">My Characters</span>
            <button class="btn-primary" (click)="openNewChar()">+ New Character</button>
          </div>
          <div class="content-list">
            @if (loadingChars()) { <div class="loading">Loading…</div> }
            @for (c of myChars(); track c.id) {
              <div class="content-row">
                <div class="row-info">
                  @if (c.imageUrl) { <img class="thumb" [src]="c.imageUrl" [alt]="c.name" /> }
                  <div class="row-details">
                    <span class="row-title">{{ c.name }}</span>
                    @if (c.anime) { <span class="row-sub">{{ c.anime }}</span> }
                  </div>
                </div>
                <div class="row-actions">
                  <span class="status-badge" [class]="'badge-' + (c.status ?? 'APPROVED')">{{ c.status ?? 'APPROVED' }}</span>
                  <button class="btn-icon" (click)="editChar(c)" title="Edit"><i class="pi pi-pencil"></i></button>
                  <button class="btn-icon danger" (click)="deleteChar(c.id)" title="Delete"><i class="pi pi-trash"></i></button>
                </div>
              </div>
            }
            @if (!loadingChars() && !myChars().length) {
              <div class="empty">No characters yet. Create your first one!</div>
            }
          </div>
        </div>
      }

      <!-- ── Polls ─────────────────────────────────────────────────────── -->
      @if (activeTab() === 'polls') {
        <div class="section">
          <div class="section-header">
            <span class="section-title">My Polls</span>
            <button class="btn-primary" (click)="openNewPoll()">+ New Poll</button>
          </div>
          <div class="content-list">
            @if (loadingPolls()) { <div class="loading">Loading…</div> }
            @for (p of myPolls(); track p.id) {
              <div class="content-row">
                <div class="row-info">
                  <div class="row-details">
                    <span class="row-title">{{ p.question }}</span>
                    <span class="row-sub">{{ p.anime || '—' }} · {{ (p.fighters ?? []).length }} fighters</span>
                  </div>
                </div>
                <div class="row-actions">
                  @if (p.isPrivate) { <span class="priv-badge">PRIVATE</span> }
                  @if (p.deletePending) { <span class="status-badge badge-PENDING">DELETE PENDING</span> }
                  @else { <span class="status-badge" [class]="'badge-' + (p.status ?? 'APPROVED')">{{ p.status ?? 'APPROVED' }}</span> }
                  <button class="btn-icon" (click)="editPoll(p)" title="Edit" [disabled]="p.deletePending"><i class="pi pi-pencil"></i></button>
                  <button class="btn-icon danger" (click)="deletePoll(p)" title="Delete" [disabled]="p.deletePending"><i class="pi pi-trash"></i></button>
                </div>
              </div>
            }
            @if (!loadingPolls() && !myPolls().length) {
              <div class="empty">No polls yet. Create your first one!</div>
            }
          </div>
        </div>
      }

      <!-- ── Multi-Polls ────────────────────────────────────────────────── -->
      @if (activeTab() === 'multi-polls') {
        <div class="section">
          <div class="section-header">
            <span class="section-title">My Multi-Polls</span>
            <button class="btn-primary" (click)="openNewMp()">+ New Multi-Poll</button>
          </div>
          <div class="content-list">
            @if (loadingMps()) { <div class="loading">Loading…</div> }
            @for (mp of myMps(); track mp.id) {
              <div class="content-row">
                <div class="row-info">
                  <div class="row-details">
                    <span class="row-title">{{ mp.question }}</span>
                    <span class="row-sub">{{ mp.anime || '—' }} · {{ (mp.groups ?? []).length }} groups</span>
                  </div>
                </div>
                <div class="row-actions">
                  @if (mp.isPrivate) { <span class="priv-badge">PRIVATE</span> }
                  @if (mp.deletePending) { <span class="status-badge badge-PENDING">DELETE PENDING</span> }
                  @else { <span class="status-badge" [class]="'badge-' + (mp.status ?? 'APPROVED')">{{ mp.status ?? 'APPROVED' }}</span> }
                  <button class="btn-icon" (click)="editMp(mp)" title="Edit" [disabled]="mp.deletePending"><i class="pi pi-pencil"></i></button>
                  <button class="btn-icon danger" (click)="deleteMp(mp)" title="Delete" [disabled]="mp.deletePending"><i class="pi pi-trash"></i></button>
                </div>
              </div>
            }
            @if (!loadingMps() && !myMps().length) {
              <div class="empty">No multi-polls yet. Create your first one!</div>
            }
          </div>
        </div>
      }

      <!-- ─────────── Character form modal ─────────── -->
      @if (showCharForm()) {
        <app-crud-modal [title]="editingChar() ? 'Edit Character' : 'New Character'" (closeRequest)="closeCharForm()">
          <div class="form-grid">
            <label class="field span-2">
              <span>Name *</span>
              <input class="input" [(ngModel)]="charForm.name" (ngModelChange)="charDirty = true" placeholder="Character name" />
            </label>
            <label class="field">
              <span>Anime</span>
              <input class="input" [(ngModel)]="charForm.anime" (ngModelChange)="charDirty = true" placeholder="Series name" />
            </label>
            <label class="field">
              <span>Title / Role</span>
              <input class="input" [(ngModel)]="charForm.title" (ngModelChange)="charDirty = true" placeholder="Protagonist, Villain…" />
            </label>
            <label class="field span-2">
              <span>Image</span>
              <app-image-upload [(imageUrl)]="charForm.imageUrl"
                (imageUrlChange)="charDirty = true" />
            </label>
            @if (charError()) { <div class="error-msg span-2">{{ charError() }}</div> }
            <div class="form-actions span-2">
              <button class="btn-ghost" (click)="closeCharForm()">Cancel</button>
              <button class="btn-primary" [disabled]="savingChar()" (click)="saveChar()">
                {{ savingChar() ? 'Saving…' : (editingChar() ? 'Update' : 'Submit for approval') }}
              </button>
            </div>
          </div>
        </app-crud-modal>
      }

      <!-- ─────────── Poll form modal ─────────── -->
      @if (showPollForm()) {
        <app-crud-modal [title]="editingPoll() ? 'Edit Poll' : 'New Poll'" (closeRequest)="closePollForm()">
          <form (ngSubmit)="savePoll()">
            <div class="form-grid">
              <label class="field span-2">
                <span>Question *</span>
                <input class="input" [(ngModel)]="pollForm.question" name="q" (ngModelChange)="pollDirty = true" placeholder="Who would win?" />
              </label>
              <label class="field">
                <span>Anime</span>
                <p-select [options]="animeList()" [(ngModel)]="pollForm.anime" name="anime"
                  optionLabel="name" optionValue="name" [filter]="true" filterBy="name"
                  [editable]="true" [showClear]="true" placeholder="Select or type…" appendTo="body"
                  (onChange)="pollDirty = true" />
              </label>
              <label class="field private-toggle">
                <input type="checkbox" [(ngModel)]="pollForm.isPrivate" name="priv" (ngModelChange)="pollDirty = true" />
                <span>Private <small>(not visible in main feed, no approval needed)</small></span>
              </label>
            </div>
            <span class="field-label">Fighters *</span>
            <app-poll-group-form
              [group]="pollFightersGroup"
              [charOptions]="charOptions()"
              [showLabel]="false" [showPeriod]="false" [canRemove]="false"
              candidatePlaceholder="Select fighter…" candidateLabel="Fighter" />
            @if (pollError()) { <div class="error-msg">{{ pollError() }}</div> }
            <div class="form-actions">
              <button class="btn-ghost" type="button" (click)="closePollForm()">Cancel</button>
              <button class="btn-primary" type="submit" [disabled]="savingPoll()">
                {{ savingPoll() ? 'Saving…' : (editingPoll() ? 'Update' : (pollForm.isPrivate ? 'Create' : 'Submit for approval')) }}
              </button>
            </div>
          </form>
        </app-crud-modal>
      }

      <!-- ─────────── Multi-Poll form modal ─────────── -->
      @if (showMpForm()) {
        <app-crud-modal [title]="editingMp() ? 'Edit Multi-Poll (candidates)' : 'New Multi-Poll'" (closeRequest)="closeMpForm()">
          <form (ngSubmit)="saveMp()">
            <div class="form-grid">
              <label class="field span-2">
                <span>Question *</span>
                <input class="input" [(ngModel)]="mpForm.question" name="q" (ngModelChange)="mpDirty = true" placeholder="Who is the best?" />
              </label>
              @if (!editingMp()) {
                <label class="field">
                  <span>Anime</span>
                  <p-select [options]="animeList()" [(ngModel)]="mpForm.anime" name="anime"
                    optionLabel="name" optionValue="name" [filter]="true" filterBy="name"
                    [editable]="true" [showClear]="true" placeholder="Select or type…" appendTo="body"
                    (onChange)="mpDirty = true" />
                </label>
                <label class="field private-toggle">
                  <input type="checkbox" [(ngModel)]="mpForm.isPrivate" name="priv" (ngModelChange)="mpDirty = true" />
                  <span>Private <small>(no approval needed)</small></span>
                </label>
              }
            </div>
            <div class="groups-header">
              <span class="groups-label">Groups <small>(min 2)</small></span>
              @if (!editingMp()) { <button type="button" class="btn-ghost-sm" (click)="addMpGroup()">+ Group</button> }
            </div>
            @for (ctrl of mpGroupsArray.controls; track ctrl; let i = $index) {
              <app-poll-group-form
                [group]="getMpGroup(i)"
                [charOptions]="charOptions()"
                [showLabel]="true" [showPeriod]="!editingMp()" [isEdit]="!!editingMp()"
                [canRemove]="mpGroupsArray.length > 2 && !editingMp()"
                (remove)="removeMpGroup(i)" />
            }
            @if (mpError()) { <div class="error-msg">{{ mpError() }}</div> }
            <div class="form-actions">
              <button class="btn-ghost" type="button" (click)="closeMpForm()">Cancel</button>
              <button class="btn-primary" type="submit" [disabled]="savingMp()">
                {{ savingMp() ? 'Saving…' : (editingMp() ? 'Update' : (mpForm.isPrivate ? 'Create' : 'Submit for approval')) }}
              </button>
            </div>
          </form>
        </app-crud-modal>
      }

      <!-- Confirm modal -->
      @if (showConfirm()) {
        <app-confirm-modal
          [title]="confirmTitle()" [message]="confirmMsg()" [danger]="isDanger()"
          (confirmed)="onConfirmed()" (cancelled)="showConfirm.set(false)" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .my-content { display: flex; flex-direction: column; gap: 1rem; }
    .sub-nav { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--rz-border); padding-bottom: 0.5rem; }
    .sub-tab { background: none; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
                padding: 0.3rem 0.75rem; cursor: pointer; color: var(--rz-ink-muted); font-size: 0.8rem;
                display: flex; align-items: center; gap: 0.4rem; }
    .sub-tab.active { background: var(--rz-primary); color: #fff; border-color: var(--rz-primary); }
    .tab-count { background: rgba(255,255,255,0.25); border-radius: 99px; padding: 0 0.35rem; font-size: 0.7rem; }
    .limits-bar { display: flex; gap: 1rem; padding: 0.4rem 0.75rem; background: var(--rz-glass-bg);
                   border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-sm); font-size: 0.75rem; }
    .limit-item { color: var(--rz-ink-muted); }
    .section { display: flex; flex-direction: column; gap: 0.75rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-size: 0.9rem; font-weight: 600; color: var(--rz-ink); }
    .content-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .content-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
                    padding: 0.6rem 0.75rem; background: var(--rz-glass-bg);
                    border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-sm); }
    .row-info { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
    .thumb { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .row-details { display: flex; flex-direction: column; min-width: 0; }
    .row-title { font-size: 0.85rem; font-weight: 600; color: var(--rz-ink); overflow: hidden;
                  text-overflow: ellipsis; white-space: nowrap; }
    .row-sub { font-size: 0.75rem; color: var(--rz-ink-muted); }
    .row-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .status-badge { font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 99px;
                     text-transform: uppercase; letter-spacing: 0.03em; }
    .badge-PENDING  { background: rgba(251,192,45,0.15); color: #f59e0b; }
    .badge-APPROVED { background: rgba(34,197,94,0.12); color: #16a34a; }
    .badge-REJECTED { background: rgba(239,68,68,0.12); color: #dc2626; }
    .priv-badge { font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.45rem; border-radius: 99px;
                   background: rgba(99,102,241,0.12); color: #6366f1; text-transform: uppercase; }
    .loading, .empty { font-size: 0.8rem; color: var(--rz-ink-muted); padding: 1rem 0; text-align: center; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .span-2 { grid-column: span 2; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .private-toggle { flex-direction: row; align-items: center; gap: 0.5rem; font-size: 0.8rem;
                       color: var(--rz-ink); cursor: pointer; }
    .private-toggle input { accent-color: var(--rz-primary); }
    .private-toggle small { color: var(--rz-ink-muted); font-size: 0.72rem; }
    .field-label { font-size: 0.8rem; color: var(--rz-ink-muted); font-weight: 500; }
    .groups-header { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
    .groups-label { font-size: 0.8rem; font-weight: 600; color: var(--rz-ink-muted); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }
    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.25rem; }
    .btn-primary { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm); border: none;
                    background: var(--rz-primary); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; } .btn-primary:disabled { opacity: 0.5; cursor: default; }
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
    .btn-icon:hover:not(:disabled) { background: var(--rz-surface-hover); color: var(--rz-ink); }
    .btn-icon.danger:hover:not(:disabled) { background: var(--rz-danger-bg); color: var(--rz-danger); }
    .btn-icon:disabled { opacity: 0.4; cursor: default; }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
  `]
})
export class MyContentManagementComponent implements OnInit {
  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);

  readonly activeTab   = signal<SubTab>('characters');
  readonly myChars     = signal<CharacterDto[]>([]);
  readonly myPolls     = signal<PollDto[]>([]);
  readonly myMps       = signal<MultiPollAdminDto[]>([]);
  readonly animeList   = signal<AnimeDto[]>([]);
  readonly limits      = signal<DailyLimitDto | null>(null);
  readonly loadingChars = signal(false);
  readonly loadingPolls = signal(false);
  readonly loadingMps   = signal(false);

  private _charOptions: CharOption[] = [];

  readonly tabs = [
    { id: 'characters' as SubTab, label: 'Characters' },
    { id: 'polls' as SubTab,      label: 'Polls' },
    { id: 'multi-polls' as SubTab, label: 'Multi-Polls' },
  ];

  countFor(tab: SubTab): number {
    if (tab === 'characters') return this.myChars().length;
    if (tab === 'polls') return this.myPolls().length;
    return this.myMps().length;
  }

  // ── Confirm modal ──────────────────────────────────────────────────────────
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

  // ── Character form ─────────────────────────────────────────────────────────
  readonly showCharForm  = signal(false);
  readonly editingChar   = signal<CharacterDto | null>(null);
  readonly savingChar    = signal(false);
  readonly charError     = signal<string | null>(null);
  charDirty = false;
  charForm: CharacterCreateDto = { name: '', title: '', anime: '', imageUrl: '' };

  openNewChar(): void {
    this.editingChar.set(null); this.charDirty = false; this.charError.set(null);
    this.charForm = { name: '', title: '', anime: '', imageUrl: '' };
    this.showCharForm.set(true);
  }
  editChar(c: CharacterDto): void {
    this.editingChar.set(c); this.charDirty = false; this.charError.set(null);
    this.charForm = { name: c.name, title: c.title ?? '', anime: c.anime ?? '', imageUrl: c.imageUrl ?? '' };
    this.showCharForm.set(true);
  }
  closeCharForm(): void {
    if (this.charDirty) {
      this.askConfirm('Discard changes?', 'Discard unsaved changes?', () => this.showCharForm.set(false), false);
    } else { this.showCharForm.set(false); }
  }
  saveChar(): void {
    if (!this.charForm.name?.trim()) { this.charError.set('Name is required'); return; }
    this.askConfirm(this.editingChar() ? 'Save character?' : 'Submit character?',
      this.editingChar() ? 'Save these changes?' : 'Submit for admin approval?',
      () => this.doSaveChar(), false);
  }
  private doSaveChar(): void {
    this.savingChar.set(true);
    const id = this.editingChar()?.id;
    const req$ = id ? this.api.updateMyCharacter(id, this.charForm) : this.api.createMyCharacter(this.charForm);
    req$.subscribe({
      next: () => { this.toast.success(id ? 'Character updated' : 'Character submitted for approval'); this.savingChar.set(false); this.showCharForm.set(false); this.loadChars(); },
      error: e => { this.savingChar.set(false); this.charError.set(this.msg(e)); }
    });
  }
  deleteChar(id: string): void {
    this.askConfirm('Delete character?', 'Delete this character permanently?',
      () => this.api.deleteMyCharacter(id).subscribe({ next: () => { this.toast.success('Character deleted'); this.loadChars(); }, error: e => this.toast.error(this.msg(e)) }));
  }

  // ── Poll form ──────────────────────────────────────────────────────────────
  readonly showPollForm  = signal(false);
  readonly editingPoll   = signal<PollDto | null>(null);
  readonly savingPoll    = signal(false);
  readonly pollError     = signal<string | null>(null);
  pollDirty = false;
  pollForm = { question: '', anime: '', isPrivate: false };
  pollFightersGroup = createGroupForm({ showPeriod: false });

  openNewPoll(): void {
    this.editingPoll.set(null); this.pollDirty = false; this.pollError.set(null);
    this.pollForm = { question: '', anime: '', isPrivate: false };
    this.pollFightersGroup = createGroupForm({ showPeriod: false });
    this.showPollForm.set(true);
  }
  editPoll(p: PollDto): void {
    this.editingPoll.set(p); this.pollDirty = false; this.pollError.set(null);
    this.pollForm = { question: p.question, anime: p.anime ?? '', isPrivate: p.isPrivate ?? false };
    this.pollFightersGroup = createGroupForm({ showPeriod: false });
    const cArr = this.pollFightersGroup.get('candidates') as FormArray;
    cArr.clear();
    const ids = (p.fighters ?? []).map(f => f.id);
    while (ids.length < 2) ids.push('');
    ids.forEach(id => cArr.push(new FormControl(id)));
    this.showPollForm.set(true);
  }
  closePollForm(): void {
    if (this.pollDirty) {
      this.askConfirm('Discard changes?', 'Discard unsaved changes?', () => this.showPollForm.set(false), false);
    } else { this.showPollForm.set(false); }
  }
  savePoll(): void {
    if (!this.pollForm.question?.trim()) { this.pollError.set('Question is required'); return; }
    const cArr = this.pollFightersGroup.get('candidates') as FormArray;
    const filled = cArr.controls.map(c => c.value as string).filter(Boolean);
    if (filled.length < 2) { this.pollError.set('Select at least 2 fighters'); return; }
    const label = this.editingPoll() ? 'Save changes?' : (this.pollForm.isPrivate ? 'Create poll?' : 'Submit poll for approval?');
    this.askConfirm(label, '', () => this.doSavePoll(), false);
  }
  private doSavePoll(): void {
    this.savingPoll.set(true);
    const cArr = this.pollFightersGroup.get('candidates') as FormArray;
    const filled = cArr.controls.map(c => c.value as string).filter(Boolean);
    const req: PollCreateDto = { anime: this.pollForm.anime, question: this.pollForm.question, fighterIds: filled, isPrivate: this.pollForm.isPrivate };
    const id = this.editingPoll()?.id;
    const req$ = id ? this.api.updateMyPoll(id, req) : this.api.createMyPoll(req);
    req$.subscribe({
      next: () => { this.toast.success(id ? 'Poll updated' : 'Poll submitted'); this.savingPoll.set(false); this.showPollForm.set(false); this.loadPolls(); this.refresh.notify(); },
      error: e => { this.savingPoll.set(false); this.pollError.set(this.msg(e)); }
    });
  }
  deletePoll(p: PollDto): void {
    const msg = (p.status === 'APPROVED' && !p.isPrivate)
      ? 'This poll is public and approved — a deletion request will be sent to the admin.'
      : 'Delete this poll permanently?';
    this.askConfirm('Delete poll?', msg, () => this.doDeletePoll(p.id));
  }
  private doDeletePoll(id: string): void {
    this.api.deleteMyPoll(id).subscribe({ next: () => { this.toast.success('Poll deleted / deletion requested'); this.loadPolls(); this.refresh.notify(); }, error: e => this.toast.error(this.msg(e)) });
  }

  // ── Multi-poll form ────────────────────────────────────────────────────────
  readonly showMpForm  = signal(false);
  readonly editingMp   = signal<MultiPollAdminDto | null>(null);
  readonly savingMp    = signal(false);
  readonly mpError     = signal<string | null>(null);
  mpDirty = false;
  mpForm = { question: '', anime: '', isPrivate: false };
  mpForm_groups!: FormGroup;

  get mpGroupsArray(): FormArray { return this.mpForm_groups.get('groups') as FormArray; }
  getMpGroup(i: number): FormGroup { return this.mpGroupsArray.at(i) as FormGroup; }

  private initMpForm(): void {
    this.mpForm_groups = new FormGroup({ groups: new FormArray([createGroupForm({ showPeriod: true }), createGroupForm({ showPeriod: true })]) });
  }

  addMpGroup(): void { this.mpGroupsArray.push(createGroupForm({ showPeriod: true })); }
  removeMpGroup(i: number): void { if (this.mpGroupsArray.length > 2) this.mpGroupsArray.removeAt(i); }

  openNewMp(): void {
    this.editingMp.set(null); this.mpDirty = false; this.mpError.set(null);
    this.mpForm = { question: '', anime: '', isPrivate: false };
    this.initMpForm();
    this.showMpForm.set(true);
  }
  editMp(mp: MultiPollAdminDto): void {
    this.editingMp.set(mp); this.mpDirty = false; this.mpError.set(null);
    this.mpForm = { question: mp.question, anime: mp.anime ?? '', isPrivate: mp.isPrivate ?? false };
    this.initMpForm();
    const ga = this.mpGroupsArray;
    ga.clear();
    (mp.groups ?? []).forEach(g => {
      const gf = createGroupForm({ isEdit: true, showPeriod: false });
      gf.patchValue({ label: g.label });
      const cArr = gf.get('candidates') as FormArray;
      cArr.clear();
      const ids = g.candidates.map(c => c.id);
      while (ids.length < 2) ids.push('');
      ids.forEach(id => cArr.push(new FormControl(id)));
      ga.push(gf);
    });
    this.showMpForm.set(true);
  }
  closeMpForm(): void {
    if (this.mpDirty) {
      this.askConfirm('Discard changes?', 'Discard unsaved changes?', () => this.showMpForm.set(false), false);
    } else { this.showMpForm.set(false); }
  }
  saveMp(): void {
    if (!this.mpForm.question?.trim()) { this.mpError.set('Question is required'); return; }
    for (let i = 0; i < this.mpGroupsArray.length; i++) {
      const cArr = this.getMpGroup(i).get('candidates') as FormArray;
      const filled = cArr.controls.map(c => c.value as string).filter(Boolean);
      if (filled.length < 2) { this.mpError.set(`Group ${i + 1} needs at least 2 fighters`); return; }
    }
    const label = this.editingMp() ? 'Save changes?' : (this.mpForm.isPrivate ? 'Create multi-poll?' : 'Submit for approval?');
    this.askConfirm(label, '', () => this.doSaveMp(), false);
  }
  private doSaveMp(): void {
    this.savingMp.set(true);
    const isEdit = !!this.editingMp();
    const groups = this.mpGroupsArray.controls.map(ctrl => {
      const g = ctrl as FormGroup;
      const cArr = g.get('candidates') as FormArray;
      return { label: g.get('label')?.value ?? '', characterIds: cArr.controls.map(c => c.value as string).filter(Boolean), startNow: g.get('startNow')?.value ?? false, startDate: g.get('startDate')?.value || null, endDate: g.get('endDate')?.value || null };
    });
    const req: MultiPollCreateDto = { anime: this.mpForm.anime, question: this.mpForm.question, isPrivate: this.mpForm.isPrivate, groups };
    const id = this.editingMp()?.id;
    const req$ = id ? this.api.updateMyMultiPoll(id, req) : this.api.createMyMultiPoll(req);
    req$.subscribe({
      next: () => { this.toast.success(id ? 'Multi-poll updated' : 'Multi-poll submitted'); this.savingMp.set(false); this.showMpForm.set(false); this.loadMps(); this.refresh.notify(); },
      error: e => { this.savingMp.set(false); this.mpError.set(this.msg(e)); }
    });
  }
  deleteMp(mp: MultiPollAdminDto): void {
    const msg = (mp.status === 'APPROVED' && !mp.isPrivate)
      ? 'This multi-poll is public and approved — a deletion request will be sent to the admin.'
      : 'Delete this multi-poll permanently?';
    this.askConfirm('Delete multi-poll?', msg, () => this.doDeleteMp(mp.id));
  }
  private doDeleteMp(id: string): void {
    this.api.deleteMyMultiPoll(id).subscribe({ next: () => { this.toast.success('Multi-poll deleted / deletion requested'); this.loadMps(); this.refresh.notify(); }, error: e => this.toast.error(this.msg(e)) });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.initMpForm();
    this.loadChars(); this.loadPolls(); this.loadMps();
    this.api.adminGetAnimeList().subscribe({ next: l => this.animeList.set(l) });
    this.api.adminGetAllCharacters().subscribe({ next: l => this._charOptions = l.map(c => ({ id: c.id, displayName: c.anime ? `${c.name} (${c.anime})` : c.name, imageUrl: c.imageUrl })) });
    this.api.getUserLimits().subscribe({ next: l => this.limits.set(l) });
  }

  charOptions = computed(() => this._charOptions);

  private loadChars(): void { this.loadingChars.set(true); this.api.myCharacters().subscribe({ next: l => { this.myChars.set(l); this.loadingChars.set(false); }, error: () => this.loadingChars.set(false) }); }
  private loadPolls(): void { this.loadingPolls.set(true); this.api.myPolls().subscribe({ next: l => { this.myPolls.set(l); this.loadingPolls.set(false); }, error: () => this.loadingPolls.set(false) }); }
  private loadMps(): void   { this.loadingMps.set(true);   this.api.myMultiPolls().subscribe({ next: l => { this.myMps.set(l); this.loadingMps.set(false); }, error: () => this.loadingMps.set(false) }); }

  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
