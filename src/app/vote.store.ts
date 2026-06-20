import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'ui-anime-vote:votes';

export interface VoteMap {
  [characterId: string]: number;
}

@Injectable({ providedIn: 'root' })
export class VoteStore {
  private readonly _votes = signal<VoteMap>(this.load());

  readonly votes = this._votes.asReadonly();

  vote(characterId: string): void {
    const updated = { ...this._votes(), [characterId]: (this._votes()[characterId] ?? 0) + 1 };
    this._votes.set(updated);
    this.persist(updated);
  }

  getCount(characterId: string): number {
    return this._votes()[characterId] ?? 0;
  }

  getPollTotal(id1: string, id2: string): number {
    return this.getCount(id1) + this.getCount(id2);
  }

  getPercent(characterId: string, id1: string, id2: string): number {
    const total = this.getPollTotal(id1, id2);
    if (total === 0) return 50;
    return Math.round((this.getCount(characterId) / total) * 100);
  }

  private load(): VoteMap {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as VoteMap) : {};
    } catch {
      return {};
    }
  }

  private persist(votes: VoteMap): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
    } catch { /* noop */ }
  }
}
