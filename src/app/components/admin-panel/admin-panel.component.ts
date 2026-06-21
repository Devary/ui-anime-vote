import { Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnimeApiService } from '../../services/anime-api.service';
import { PollDto, MultiPollAdminDto, CharacterDto, PollCreateDto, MultiPollCreateDto, GroupCreateDto } from '../../services/api.types';
import { CHARACTERS } from '../../anime-data';

type Tab = 'polls' | 'multi';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent implements OnInit {
  readonly close = output<void>();
  private readonly api = inject(AnimeApiService);

  readonly activeTab  = signal<Tab>('polls');
  readonly loading    = signal(false);
  readonly error      = signal<string | null>(null);

  // ── Character list (from local static data) ───────────────────────────────
  readonly allChars: CharacterDto[] = CHARACTERS.map(c => ({
    id: c.id, name: c.name, title: c.title, anime: c.anime, imageUrl: c.image
  }));

  // ── Polls ──────────────────────────────────────────────────────────────────
  polls = signal<PollDto[]>([]);
  showPollForm = signal(false);
  newPoll: PollCreateDto = { anime: '', question: '', fighter1Id: '', fighter2Id: '' };

  // ── Multi-Polls ────────────────────────────────────────────────────────────
  multiPolls   = signal<MultiPollAdminDto[]>([]);
  showMultiForm = signal(false);
  newMulti: MultiPollCreateDto = { anime: '', question: '', groups: [this.emptyGroup(), this.emptyGroup()] };

  // ── Anime list for grouping selects ───────────────────────────────────────
  readonly animeList: string[] = [...new Set(CHARACTERS.map(c => c.anime))].sort();

  ngOnInit(): void {
    this.loadPolls();
    this.loadMultiPolls();
  }

  switchTab(t: Tab): void { this.activeTab.set(t); this.error.set(null); }

  // ── Polls CRUD ────────────────────────────────────────────────────────────

  loadPolls(): void {
    this.api.adminGetPolls().subscribe({
      next: list => this.polls.set(list),
      error: e => this.error.set(this.msg(e))
    });
  }

  submitPoll(): void {
    if (!this.newPoll.anime || !this.newPoll.question || !this.newPoll.fighter1Id || !this.newPoll.fighter2Id) {
      this.error.set('Fill in all poll fields'); return;
    }
    this.loading.set(true);
    this.api.adminCreatePoll(this.newPoll).subscribe({
      next: p => {
        this.polls.update(arr => [p, ...arr]);
        this.newPoll = { anime: '', question: '', fighter1Id: '', fighter2Id: '' };
        this.showPollForm.set(false);
        this.loading.set(false);
      },
      error: e => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  deletePoll(id: string): void {
    if (!confirm('Delete this poll and all its votes?')) return;
    this.api.adminDeletePoll(id).subscribe({
      next: () => this.polls.update(arr => arr.filter(p => p.id !== id)),
      error: e => this.error.set(this.msg(e))
    });
  }

  // ── Multi-Poll CRUD ───────────────────────────────────────────────────────

  loadMultiPolls(): void {
    this.api.adminGetMultiPolls().subscribe({
      next: list => this.multiPolls.set(list),
      error: e => this.error.set(this.msg(e))
    });
  }

  addGroup(): void {
    this.newMulti.groups = [...this.newMulti.groups, this.emptyGroup()];
  }

  removeGroup(idx: number): void {
    this.newMulti.groups = this.newMulti.groups.filter((_, i) => i !== idx);
  }

  charsForGroup(idx: number): CharacterDto[] { return this.allChars; }

  toggleCandidate(group: GroupCreateDto, charId: string): void {
    const i = group.characterIds.indexOf(charId);
    if (i >= 0) group.characterIds.splice(i, 1);
    else group.characterIds.push(charId);
  }

  isSelected(group: GroupCreateDto, charId: string): boolean {
    return group.characterIds.includes(charId);
  }

  submitMulti(): void {
    if (!this.newMulti.anime || !this.newMulti.question || this.newMulti.groups.length < 2) {
      this.error.set('Provide anime, question and at least 2 groups'); return;
    }
    if (this.newMulti.groups.some(g => !g.label || g.characterIds.length < 2)) {
      this.error.set('Each group needs a label and at least 2 characters'); return;
    }
    this.loading.set(true);
    this.api.adminCreateMultiPoll(this.newMulti).subscribe({
      next: mp => {
        this.multiPolls.update(arr => [mp as any, ...arr]);
        this.newMulti = { anime: '', question: '', groups: [this.emptyGroup(), this.emptyGroup()] };
        this.showMultiForm.set(false);
        this.loading.set(false);
      },
      error: e => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  deleteMulti(id: string): void {
    if (!confirm('Delete this multi-poll and all its votes?')) return;
    this.api.adminDeleteMultiPoll(id).subscribe({
      next: () => this.multiPolls.update(arr => arr.filter(p => p.id !== id)),
      error: e => this.error.set(this.msg(e))
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  countCandidates(mp: MultiPollAdminDto): number {
    return (mp.groups ?? []).reduce((s, g) => s + (g.candidates?.length ?? 0), 0);
  }

  private emptyGroup(): GroupCreateDto { return { label: '', characterIds: [] }; }

  private msg(e: any): string {
    return e?.error?.message ?? e?.error ?? e?.message ?? 'Request failed';
  }

  charName(id: string): string {
    return this.allChars.find(c => c.id === id)?.name ?? id;
  }
}
