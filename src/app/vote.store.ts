import { Injectable, signal } from '@angular/core';

type VoteMap = Record<string, number>;

@Injectable({ providedIn: 'root' })
export class VoteStore {
  private readonly _votes = signal<VoteMap>({});
  readonly votes = this._votes.asReadonly();

  vote(characterId: string): void {
    const updated = { ...this._votes(), [characterId]: (this._votes()[characterId] ?? 0) + 1 };
    this._votes.set(updated);
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
}
