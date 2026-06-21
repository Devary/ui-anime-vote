import { Injectable, signal } from '@angular/core';

type VoteMap   = Record<string, number>;   // charId → total count
type MyVoteMap = Record<string, string>;   // pollId → charId the user chose

@Injectable({ providedIn: 'root' })
export class VoteStore {
  private readonly _votes   = signal<VoteMap>({});
  private readonly _myVotes = signal<MyVoteMap>({});

  readonly votes   = this._votes.asReadonly();
  readonly myVotes = this._myVotes.asReadonly();

  vote(characterId: string, pollId: string): void {
    this._votes.set({ ...this._votes(),   [characterId]: (this._votes()[characterId] ?? 0) + 1 });
    this._myVotes.set({ ...this._myVotes(), [pollId]: characterId });
  }

  changeVote(pollId: string, oldCharId: string, newCharId: string): void {
    const v = { ...this._votes() };
    v[oldCharId] = Math.max(0, (v[oldCharId] ?? 0) - 1);
    v[newCharId] = (v[newCharId] ?? 0) + 1;
    this._votes.set(v);
    this._myVotes.set({ ...this._myVotes(), [pollId]: newCharId });
  }

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
