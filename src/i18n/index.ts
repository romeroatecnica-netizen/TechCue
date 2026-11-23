import {isSupportedLang, type LocaleCode} from '../config/seo';
import {ar, hi, ru} from './ar_hi_ru';
import {en, es} from './en_es';
import {de, fr, pt} from './fr_de_pt';
import type {TranslationsMap} from './types';
import {ja, zh} from './zh_ja';

export const TRANSLATIONS: TranslationsMap = {
  en,
  es,
  fr,
  de,
  pt,
  ar,
  hi,
  ru,
  zh,
  ja,
};

const LANG_STORAGE_KEY = 'techcue_lang_v1';

export function detectInitialLanguage(): LocaleCode {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get('lang')?.toLowerCase();
    if (isSupportedLang(queryLang)) {
      return queryLang;
    }

    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (isSupportedLang(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }

    const navLangs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const raw of navLangs) {
      if (!raw) continue;
      const base = raw.toLowerCase().split('-')[0];
      if (isSupportedLang(base)) {
        return base;
      }
    }
  }
  return 'en';
}

export function persistLanguage(lang: LocaleCode): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (lang === 'en') {
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', lang);
    }
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }
}
