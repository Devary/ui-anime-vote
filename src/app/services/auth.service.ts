import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AnimeApiService } from './anime-api.service';
import { AuthResponse } from './api.types';

const STORAGE_KEY = 'anime_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AnimeApiService);
  private readonly _user = signal<AuthResponse | null>(null);

  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn  = computed(() => this._user() !== null);
  readonly isAdmin     = computed(() => this._user()?.role === 'ADMIN');

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { this._user.set(JSON.parse(stored)); } catch { localStorage.removeItem(STORAGE_KEY); }
    }
  }

  getToken(): string | null { return this._user()?.token ?? null; }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.api.login({ username, password }).pipe(tap(res => this.persist(res)));
  }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.api.register({ username, email, password }).pipe(tap(res => this.persist(res)));
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(res: AuthResponse): void {
    this._user.set(res);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
  }
}
