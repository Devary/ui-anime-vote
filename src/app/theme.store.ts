import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly subject = new BehaviorSubject<Theme>(this.detectInitial());

  readonly theme$: Observable<Theme> = this.subject.asObservable().pipe(distinctUntilChanged());

  private readonly _theme = signal<Theme>(this.subject.getValue());
  readonly theme   = this._theme.asReadonly();
  readonly isDark  = computed(() => this._theme() === 'dark');
  readonly isLight = computed(() => this._theme() === 'light');

  constructor() {
    this.theme$.subscribe(theme => {
      this._theme.set(theme);
      document.documentElement.setAttribute('data-theme', theme);
    });
  }

  setTheme(theme: Theme): void {
    this.subject.next(theme);
  }

  toggle(): void {
    this.setTheme(this.subject.getValue() === 'dark' ? 'light' : 'dark');
  }

  private detectInitial(): Theme {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
}
