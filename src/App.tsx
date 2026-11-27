import {Anchor, Cog, Cpu, Gauge, Link2, Zap} from 'lucide-react';
import {useMemo, useState} from 'react';
import {AdSlot} from './components/AdSlot';
import {AffiliateKits} from './components/AffiliateKits';
import {BlitzModule} from './components/BlitzModule';
import {CircuitsModule} from './components/CircuitsModule';
import {DuelArena} from './components/DuelArena';
import {EditorialSeoSection} from './components/EditorialSeoSection';
import {Footer} from './components/Footer';
import {GearsModule} from './components/GearsModule';
import {Header} from './components/Header';
import {ProfileModal} from './components/ProfileModal';
import {PulleysModule} from './components/PulleysModule';
import type {LocaleCode} from './config/seo';
import {useSeoHead} from './hooks/useSeoHead';
import {detectInitialLanguage, persistLanguage, TRANSLATIONS} from './i18n';
import type {ModuleId} from './i18n/types';
import {
  clearDuelFromUrl,
  getDifficultyXpMultiplier,
  loadDifficultyPreference,
  readInitialDuelFromUrl,
  saveDifficultyPreference,
  type DifficultyLevel,
  type DuelPayload,
} from './utils/challengeEngine';
import {loadSoundPreference, playClick, setSoundEnabled} from './utils/sound';
import {
  createDefaultProfile,
  getLevelFromXp,
  loadProfileStore,
  saveProfileStore,
  type ProfileStore,
} from './utils/storage';

export default function App() {
  const [lang, setLang] = useState<LocaleCode>(() => detectInitialLanguage());
  const [soundEnabled, setSoundState] = useState<boolean>(() => loadSoundPreference());
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => loadDifficultyPreference());
  const [incomingDuel, setIncomingDuel] = useState<DuelPayload | null>(() => readInitialDuelFromUrl());
  const [activeTab, setActiveTab] = useState<ModuleId>(() =>
    readInitialDuelFromUrl() ? 'duel' : 'gears'
  );
  const [store, setStore] = useState<ProfileStore>(() => loadProfileStore());
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const t = TRANSLATIONS[lang];
  useSeoHead(lang, t);

  const activeProfile = useMemo(
    () => store.profiles.find((p) => p.id === store.activeProfileId) || store.profiles[0],
    [store]
  );

  const levelInfo = useMemo(() => getLevelFromXp(activeProfile.xp), [activeProfile.xp]);

  const handleChangeLang = (nextLang: LocaleCode) => {
    setLang(nextLang);
    persistLanguage(nextLang);
  };

  const handleChangeDifficulty = (next: DifficultyLevel) => {
    playClick();
    setDifficulty(next);
    saveDifficultyPreference(next);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundState(next);
    setSoundEnabled(next);
    if (next) {
      playClick();
    }
  };

  const updateActiveProfile = (updater: (p: typeof activeProfile) => typeof activeProfile) => {
    setStore((prev) => {
      const nextProfiles = prev.profiles.map((p) =>
        p.id === prev.activeProfileId ? updater(p) : p
      );
      const nextStore: ProfileStore = {...prev, profiles: nextProfiles};
      saveProfileStore(nextStore);
      return nextStore;
    });
  };

  const handleAwardModuleXp = (moduleId: ModuleId, xp: number) => {
    updateActiveProfile((p) => ({
      ...p,
      xp: p.xp + xp,
      challengesSolved: p.challengesSolved + 1,
      modules: {
        ...p.modules,
        [moduleId]: {
          solved: (p.modules[moduleId]?.solved ?? 0) + 1,
          attempts: (p.modules[moduleId]?.attempts ?? 0) + 1,
        },
      },
    }));
  };

  const handleRecordBlitzResult = (xp: number, streak: number) => {
    updateActiveProfile((p) => ({
      ...p,
      xp: p.xp + xp,
      challengesSolved: xp > 0 ? p.challengesSolved + 1 : p.challengesSolved,
      bestBlitzStreak: Math.max(p.bestBlitzStreak, streak),
      modules: {
        ...p.modules,
        blitz: {
          solved: p.modules.blitz.solved + (xp > 0 ? 1 : 0),
          attempts: p.modules.blitz.attempts + 1,
        },
      },
    }));
  };

  const handleCompleteDuel = (xp: number, won: boolean) => {
    updateActiveProfile((p) => ({
      ...p,
      xp: p.xp + xp,
      challengesSolved: p.challengesSolved + (won ? 1 : 0),
      modules: {
        ...p.modules,
        duel: {
          solved: (p.modules.duel?.solved ?? 0) + (won ? 1 : 0),
          attempts: (p.modules.duel?.attempts ?? 0) + 1,
        },
      },
    }));
  };

  const handleResetIncomingDuel = () => {
    setIncomingDuel(null);
    clearDuelFromUrl();
  };

  const handleOpenDuelTab = () => {
    playClick();
    setActiveTab('duel');
    document.getElementById('trainer')?.scrollIntoView({behavior: 'smooth'});
  };

  const handleSelectProfile = (id: string) => {
    playClick();
    setStore((prev) => {
      const nextStore: ProfileStore = {...prev, activeProfileId: id};
      saveProfileStore(nextStore);
      return nextStore;
    });
  };

  const handleCreateProfile = (name: string) => {
    playClick();
    const created = createDefaultProfile(name);
    setStore((prev) => {
      const nextStore: ProfileStore = {
        ...prev,
        activeProfileId: created.id,
        profiles: [...prev.profiles, created],
      };
      saveProfileStore(nextStore);
      return nextStore;
    });
  };

  const handleDeleteProfile = (id: string) => {
    playClick();
    setStore((prev) => {
      if (prev.profiles.length <= 1) return prev;
      const remaining = prev.profiles.filter((p) => p.id !== id);
      const nextActive = prev.activeProfileId === id ? remaining[0].id : prev.activeProfileId;
      const nextStore: ProfileStore = {
        ...prev,
        activeProfileId: nextActive,
        profiles: remaining,
      };
      saveProfileStore(nextStore);
      return nextStore;
    });
  };

  const handleImportStore = (nextStore: ProfileStore) => {
    saveProfileStore(nextStore);
    setStore(nextStore);
  };

  const tabItems: Array<{id: ModuleId; label: string; icon: typeof Cog}> = [
    {id: 'gears', label: t.tabs.gears, icon: Cog},
    {id: 'pulleys', label: t.tabs.pulleys, icon: Anchor},
    {id: 'circuits', label: t.tabs.circuits, icon: Cpu},
    {id: 'blitz', label: t.tabs.blitz, icon: Zap},
    {id: 'duel', label: t.tabs.duel, icon: Link2},
  ];

  const difficultyOptions: Array<{id: DifficultyLevel; label: string}> = [
    {id: 'easy', label: t.difficulty.easy},
    {id: 'medium', label: t.difficulty.medium},
    {id: 'hard', label: t.difficulty.hard},
  ];

  return (
    <div className="min-h-screen text-slate-900">
      <Header
        t={t}
        lang={lang}
        onChangeLang={handleChangeLang}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        activeProfileName={activeProfile.name}
        onOpenProfile={() => {
          playClick();
          setProfileModalOpen(true);
        }}
      />

      <main>
        {/* Architectural Dark Graphite Hero + Tabular KPI Strip */}
        <section className="border-b border-slate-800 bg-[#0F172A] text-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-4xl text-balance">
                  {t.hero.title}
                </h1>
                <p className="mt-3 text-base leading-relaxed text-slate-300">{t.hero.subtitle}</p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleOpenDuelTab}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#EA580C] px-5 text-xs font-bold text-white hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t.duel.heroBtn}
                </button>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">{t.hero.statXp}</p>
                <p className="font-mono-tabular mt-1 text-xl font-bold text-sky-400">
                  {activeProfile.xp}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">{t.hero.statStreak}</p>
                <p className="font-mono-tabular mt-1 text-xl font-bold text-amber-400">
                  {activeProfile.dailyStreak} {t.hero.daysUnit}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">{t.hero.statSolved}</p>
                <p className="font-mono-tabular mt-1 text-xl font-bold text-emerald-400">
                  {activeProfile.challengesSolved}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3">
                <p className="text-xs font-medium text-slate-400">{t.hero.statRank}</p>
                <p className="mt-1 truncate text-base font-bold text-white">
                  {t.common.level} {levelInfo.level} · {t.ranks[levelInfo.rankIndex]}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Trainer Workspace */}
        <section id="trainer" className="mx-auto max-w-7xl px-4 pt-6 pb-4 sm:px-6">
          {/* Segmented Module Selector + Global Challenge Difficulty Bar */}
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="tablist"
              aria-label={t.nav.trainer}
              className="grid flex-1 grid-cols-2 gap-1.5 rounded-xl border border-slate-300 bg-white p-1.5 sm:grid-cols-5"
            >
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDuel = tab.id === 'duel';
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => {
                      playClick();
                      setActiveTab(tab.id);
                    }}
                    className={`flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? isDuel
                          ? 'bg-[#EA580C] text-white'
                          : 'bg-[#0F172A] text-white'
                        : isDuel
                          ? 'text-[#EA580C] hover:bg-orange-50'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Difficulty Segmented Control */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-1.5 lg:justify-start">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                <Gauge className="h-4 w-4 text-[#1D4ED8]" aria-hidden="true" />
                <span>{t.difficulty.label}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-[#EA580C]">
                  {getDifficultyXpMultiplier(difficulty)}x
                </span>
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                {difficultyOptions.map((opt) => {
                  const active = difficulty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChangeDifficulty(opt.id)}
                      className={`h-8 rounded-md px-2.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? opt.id === 'hard'
                            ? 'bg-[#DC2626] text-white'
                            : opt.id === 'medium'
                              ? 'bg-[#1D4ED8] text-white'
                              : 'bg-[#047857] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {activeTab === 'gears' && (
            <GearsModule
              t={t}
              difficulty={difficulty}
              onAwardXp={(xp) => handleAwardModuleXp('gears', xp)}
            />
          )}
          {activeTab === 'pulleys' && (
            <PulleysModule
              t={t}
              difficulty={difficulty}
              onAwardXp={(xp) => handleAwardModuleXp('pulleys', xp)}
            />
          )}
          {activeTab === 'circuits' && (
            <CircuitsModule
              t={t}
              difficulty={difficulty}
              onAwardXp={(xp) => handleAwardModuleXp('circuits', xp)}
            />
          )}
          {activeTab === 'blitz' && (
            <BlitzModule
              t={t}
              difficulty={difficulty}
              bestBlitzStreak={activeProfile.bestBlitzStreak}
              onRecordBlitzResult={handleRecordBlitzResult}
            />
          )}
          {activeTab === 'duel' && (
            <DuelArena
              t={t}
              lang={lang}
              difficulty={difficulty}
              onChangeDifficulty={handleChangeDifficulty}
              activeProfileName={activeProfile.name}
              incomingDuel={incomingDuel}
              onResetIncomingDuel={handleResetIncomingDuel}
              onCompleteDuel={handleCompleteDuel}
            />
          )}
        </section>

        {/* Dedicated Media.net Mid-Page Ad Slot */}
        <AdSlot slotId="techcue-medianet-mid" position="mid" t={t} />

        {/* Contextual Affiliate Learning Kits */}
        <AffiliateKits t={t} />

        {/* Editorial SEO Field Guide & Collapsible FAQ */}
        <EditorialSeoSection t={t} />

        {/* Dedicated Media.net Bottom Ad Slot */}
        <AdSlot slotId="techcue-medianet-bottom" position="bottom" t={t} />
      </main>

      <Footer t={t} lang={lang} onChangeLang={handleChangeLang} />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        t={t}
        store={store}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onImportStore={handleImportStore}
      />
    </div>
  );
}
