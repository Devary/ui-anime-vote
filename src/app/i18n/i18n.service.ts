import { Injectable, computed, signal } from '@angular/core';
import { LANGS, Lang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'anime_lang';

/**
 * Lightweight runtime i18n: EN (default), FR, AR.
 * Arabic flips the document direction to RTL.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly LANGS = LANGS;

  private readonly _lang = signal<Lang>(this.initialLang());
  readonly lang = this._lang.asReadonly();
  readonly isRtl = computed(() => this._lang() === 'ar');

  constructor() { this.applyToDocument(this._lang()); }

  /** Translate a key in the current language; falls back to EN, then to the key itself. */
  t(key: string): string {
    const lang = this._lang();
    return TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
  }

  setLang(lang: Lang): void {
    this._lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.applyToDocument(lang);
  }

  /** EN → FR → AR → EN, used by the header toggle. */
  cycle(): void {
    const codes = LANGS.map(l => l.code);
    const next = codes[(codes.indexOf(this._lang()) + 1) % codes.length];
    this.setLang(next);
  }

  private initialLang(): Lang {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'fr' || stored === 'ar' ? stored : 'en';
  }

  private applyToDocument(lang: Lang): void {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }
}
