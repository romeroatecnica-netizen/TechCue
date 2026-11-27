import {Globe, User, Volume2, VolumeX} from 'lucide-react';
import {LANGUAGE_OPTIONS, type LocaleCode} from '../config/seo';
import type {TranslationDict} from '../i18n/types';

interface HeaderProps {
  t: TranslationDict;
  lang: LocaleCode;
  onChangeLang: (lang: LocaleCode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeProfileName: string;
  onOpenProfile: () => void;
}

export function Header({
  t,
  lang,
  onChangeLang,
  soundEnabled,
  onToggleSound,
  activeProfileName,
  onOpenProfile,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0F172A]/95 backdrop-blur-sm no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#trainer"
          className="font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        >
          Tech<span className="text-[#FB923C]">Cue</span>
        </a>

        {/* Zone 2: Clean typographic navigation links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          <a
            href="#trainer"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.trainer}
          </a>
          <a
            href="#guide"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.guide}
          </a>
          <a
            href="#kits"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.kits}
          </a>
          <a
            href="#faq"
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.faq}
          </a>
        </nav>

        {/* Zone 3: Language, Sound & Profile action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative flex items-center">
            <Globe className="pointer-events-none absolute start-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => onChangeLang(e.target.value as LocaleCode)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-800 ps-8 pe-3 text-xs font-semibold text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-orange-400 cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code} className="bg-slate-900 text-white">
                  {opt.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? t.nav.soundOn : t.nav.soundOff}
            title={soundEnabled ? t.nav.soundOn : t.nav.soundOff}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-orange-400 transition-colors shrink-0 cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#EA580C] px-3.5 text-xs font-bold text-white hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <User className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[96px] truncate">{activeProfileName}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
