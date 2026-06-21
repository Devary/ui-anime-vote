import { Injectable, inject, signal } from '@angular/core';
import { AnimeApiService } from './services/anime-api.service';
import { PollResultDto, MultiPollResultDto } from './services/api.types';

type VoteMap      = Record<string, number>;   // charId → total count
type MyVoteMap    = Record<string, string>;   // pollId → charId the user chose
type TimestampMap = Record<string, number>;   // pollId → Date.now() when voted

function getOrCreateSessionId(): string {
  const key = 'anime_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

@Injectable({ providedIn: 'root' })
export class VoteStore {
  private readonly api = inject(AnimeApiService);

  private readonly _votes      = signal<VoteMap>({});
  private readonly _myVotes    = signal<MyVoteMap>({});
  private readonly _timestamps = signal<TimestampMap>({});

  readonly votes      = this._votes.asReadonly();
  readonly myVotes    = this._myVotes.asReadonly();
  readonly timestamps = this._timestamps.asReadonly();

  readonly sessionId: string = getOrCreateSessionId();

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  loadTodayVotes(): void {
    this.api.getHistory(this.sessionId).subscribe({
      next: items => {
        const myVotes    = { ...this._myVotes() };
        const timestamps = { ...this._timestamps() };
        for (const item of items) {
          myVotes[item.pollId]    = item.myVoteCharId;
          timestamps[item.pollId] = new Date(item.votedAt).getTime();
        }
        this._myVotes.set(myVotes);
        this._timestamps.set(timestamps);
      },
      error: () => {},
    });
  }

  // ── Single-poll actions ───────────────────────────────────────────────────

  vote(characterId: string, pollId: string): void {
    // Optimistic update
    this._votes.set({ ...this._votes(), [characterId]: (this._votes()[characterId] ?? 0) + 1 });
    this._myVotes.set({ ...this._myVotes(), [pollId]: characterId });
    this._timestamps.set({ ...this._timestamps(), [pollId]: Date.now() });

    this.api.castVote(pollId, characterId, this.sessionId).subscribe({
      next: res => this.applyPollResult(res),
      error: () => {},
    });
  }

  changeVote(pollId: string, oldCharId: string, newCharId: string): void {
    // Optimistic update
    const v = { ...this._votes() };
    v[oldCharId] = Math.max(0, (v[oldCharId] ?? 0) - 1);
    v[newCharId] = (v[newCharId] ?? 0) + 1;
    this._votes.set(v);
    this._myVotes.set({ ...this._myVotes(), [pollId]: newCharId });

    this.api.changeVote(pollId, newCharId, this.sessionId).subscribe({
      next: res => this.applyPollResult(res),
      error: () => {},
    });
  }

  refreshPollResult(pollId: string): void {
    this.api.getPollResult(pollId, this.sessionId).subscribe({
      next: res => this.applyPollResult(res),
      error: () => {},
    });
  }

  // ── Multi-poll actions ────────────────────────────────────────────────────

  voteMulti(characterId: string, pollId: string): void {
    // Optimistic update
    this._votes.set({ ...this._votes(), [characterId]: (this._votes()[characterId] ?? 0) + 1 });
    this._myVotes.set({ ...this._myVotes(), [pollId]: characterId });
    this._timestamps.set({ ...this._timestamps(), [pollId]: Date.now() });

    this.api.castMultiVote(pollId, characterId, this.sessionId).subscribe({
      next: res => this.applyMultiPollResult(res),
      error: () => {},
    });
  }

  changeMultiVote(pollId: string, oldCharId: string, newCharId: string): void {
    // Optimistic update
    const v = { ...this._votes() };
    v[oldCharId] = Math.max(0, (v[oldCharId] ?? 0) - 1);
    v[newCharId] = (v[newCharId] ?? 0) + 1;
    this._votes.set(v);
    this._myVotes.set({ ...this._myVotes(), [pollId]: newCharId });

    this.api.changeMultiVote(pollId, newCharId, this.sessionId).subscribe({
      next: res => this.applyMultiPollResult(res),
      error: () => {},
    });
  }

  refreshMultiPollResult(pollId: string): void {
    this.api.getMultiPollResult(pollId, this.sessionId).subscribe({
      next: res => this.applyMultiPollResult(res),
      error: () => {},
    });
  }

  // ── Result applicators ────────────────────────────────────────────────────

  private applyPollResult(res: PollResultDto): void {
    const v = { ...this._votes() };
    v[res.poll.fighter1.id] = res.votes1;
    v[res.poll.fighter2.id] = res.votes2;
    this._votes.set(v);

    if (res.myVoteCharId) {
      this._myVotes.set({ ...this._myVotes(), [res.poll.id]: res.myVoteCharId });
    }
  }

  private applyMultiPollResult(res: MultiPollResultDto): void {
    const v = { ...this._votes() };
    for (const group of res.groups) {
      for (const cand of group.candidates) {
        v[cand.charId] = cand.votes;
      }
    }
    this._votes.set(v);

    if (res.myVoteCharId) {
      this._myVotes.set({ ...this._myVotes(), [res.poll.id]: res.myVoteCharId });
    }
  }

  // ── Getters (unchanged) ───────────────────────────────────────────────────

  getCount(characterId: string): number {
    return this._votes()[characterId] ?? 0;
  }

  getPollTotal(id1: string, id2: string): number {
    return this.getCount(id1) + this.getCount(id2);
  }

  getPercent(characterId: string, otherId: string): number {
    const total = this.getPollTotal(characterId, otherId);
    if (total === 0) return 50;
    return (this.getCount(characterId) / total) * 100;
  }

  hasVoted(id1: string, id2: string): boolean {
    return this.getPollTotal(id1, id2) > 0;
  }

  getMyVote(pollId: string): string | null {
    return this._myVotes()[pollId] ?? null;
  }
}
