export const CANONICAL_ORIGIN = 'https://techcue.bastelar.com' as const;

export const SUPPORTED_LANGS = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ar',
  'hi',
  'ru',
  'zh',
  'ja',
] as const;

export type LocaleCode = (typeof SUPPORTED_LANGS)[number];

export interface LanguageOption {
  code: LocaleCode;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {code: 'en', nativeName: 'English', dir: 'ltr'},
  {code: 'es', nativeName: 'Español', dir: 'ltr'},
  {code: 'fr', nativeName: 'Français', dir: 'ltr'},
  {code: 'de', nativeName: 'Deutsch', dir: 'ltr'},
  {code: 'pt', nativeName: 'Português', dir: 'ltr'},
  {code: 'ar', nativeName: 'العربية', dir: 'rtl'},
  {code: 'hi', nativeName: 'हिन्दी', dir: 'ltr'},
  {code: 'ru', nativeName: 'Русский', dir: 'ltr'},
  {code: 'zh', nativeName: '中文', dir: 'ltr'},
  {code: 'ja', nativeName: '日本語', dir: 'ltr'},
];

export function isSupportedLang(value: string | null | undefined): value is LocaleCode {
  return Boolean(value && (SUPPORTED_LANGS as readonly string[]).includes(value));
}

export function getCanonicalUrl(lang: LocaleCode): string {
  return lang === 'en' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}/?lang=${lang}`;
}

export function getLangDirection(lang: LocaleCode): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
