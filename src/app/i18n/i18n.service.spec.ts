import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let i18n: I18nService;

  beforeEach(() => {
    localStorage.removeItem('anime_lang');
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => {
    localStorage.removeItem('anime_lang');
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', 'en');
  });

  it('defaults to English', () => {
    expect(i18n.lang()).toBe('en');
    expect(i18n.t('app.login')).toBe('Login');
  });

  it('translates to French and Arabic', () => {
    i18n.setLang('fr');
    expect(i18n.t('app.login')).toBe('Connexion');
    i18n.setLang('ar');
    expect(i18n.t('app.login')).toBe('تسجيل الدخول');
  });

  it('Arabic flips the document to RTL, others back to LTR', () => {
    i18n.setLang('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(i18n.isRtl()).toBe(true);
    i18n.setLang('fr');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(i18n.isRtl()).toBe(false);
  });

  it('cycles EN → FR → AR → EN and persists the choice', () => {
    i18n.cycle();
    expect(i18n.lang()).toBe('fr');
    expect(localStorage.getItem('anime_lang')).toBe('fr');
    i18n.cycle();
    expect(i18n.lang()).toBe('ar');
    i18n.cycle();
    expect(i18n.lang()).toBe('en');
  });

  it('falls back to English, then to the key itself', () => {
    i18n.setLang('fr');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
  });
});
