import {CANONICAL_ORIGIN, LANGUAGE_OPTIONS, type LocaleCode} from '../config/seo';
import type {TranslationDict} from '../i18n/types';

interface FooterProps {
  t: TranslationDict;
  lang: LocaleCode;
  onChangeLang: (lang: LocaleCode) => void;
}

export function Footer({t, lang, onChangeLang}: FooterProps) {
  return (
    <footer className="border-t border-slate-800 bg-[#0F172A] py-8 text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-white">{t.footer.copyright}</p>
          <p className="mt-1 text-xs text-slate-400">
            <a href={`${CANONICAL_ORIGIN}/`} className="hover:text-white hover:underline">
              {t.footer.canonicalNote}
            </a>
            <span aria-hidden="true"> · </span>
            <span>{t.footer.privacyNote}</span>
          </p>
        </div>

        <nav aria-label="Language switcher" className="flex flex-wrap gap-x-3 gap-y-2 text-xs">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => onChangeLang(opt.code)}
              className={`hover:underline cursor-pointer ${
                lang === opt.code ? 'font-bold text-[#FB923C]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.nativeName}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  );
}
