import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AnimeApiService } from './anime-api.service';
import { LoginResponse } from './api.types';

const STORAGE_KEY = 'anime_auth';
const REFRESH_BEFORE_EXPIRY_S = 60;

export interface SessionState extends LoginResponse {
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AnimeApiService);
  private readonly _session = signal<SessionState | null>(null);
  private refreshTimer?: ReturnType<typeof setTimeout>;

  readonly currentUser  = this._session.asReadonly();
  readonly isLoggedIn   = computed(() => this._session() !== null);
  readonly isAdmin      = computed(() => this._session()?.roles?.some(r => r.toLowerCase() === 'admin') ?? false);

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const s = JSON.parse(stored) as SessionState;
        if (s.accessToken) {
          this._session.set(s);
          this.scheduleRefresh(s);
        }
      } catch { localStorage.removeItem(STORAGE_KEY); }
    }
  }

  getToken(): string | null { return this._session()?.accessToken ?? null; }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.api.login({ username, password }).pipe(tap(res => this.persist(res)));
  }

  register(username: string, email: string, password: string, confirmPassword: string): Observable<LoginResponse> {
    return this.api.register({ username, email, password, confirmPassword }).pipe(tap(res => this.persist(res)));
  }

  logout(): void {
    clearTimeout(this.refreshTimer);
    this._session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(res: LoginResponse): void {
    const session: SessionState = { ...res, expiresAt: Date.now() + res.expiresIn * 1000 };
    this._session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.scheduleRefresh(session);
  }

  private scheduleRefresh(session: SessionState): void {
    clearTimeout(this.refreshTimer);
    if (!session.refreshToken) return;
    const remainingMs = session.expiresAt - Date.now();
    if (remainingMs <= 0) { this.doRefresh(); return; }
    const delayMs = Math.max(remainingMs - REFRESH_BEFORE_EXPIRY_S * 1000, 5000);
    this.refreshTimer = setTimeout(() => this.doRefresh(), delayMs);
  }

  private doRefresh(): void {
    const session = this._session();
    if (!session?.refreshToken) { this.logout(); return; }
    this.api.refresh({ refreshToken: session.refreshToken }).subscribe({
      next: res => this.persist(res),
      error: () => this.logout()
    });
  }
}
