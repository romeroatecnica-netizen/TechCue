import {Anchor, Cog, Cpu, Zap} from 'lucide-react';
import {useMemo, useState} from 'react';
import {AdSlot} from './components/AdSlot';
import {AffiliateKits} from './components/AffiliateKits';
import {BlitzModule} from './components/BlitzModule';
import {CircuitsModule} from './components/CircuitsModule';
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
  const [activeTab, setActiveTab] = useState<ModuleId>('gears');
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
          solved: p.modules[moduleId].solved + 1,
          attempts: p.modules[moduleId].attempts + 1,
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
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
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
        {/* Hero & 4-Column Tabular KPI Strip */}
        <section className="mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl text-balance">
              {t.hero.title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">{t.hero.subtitle}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-slate-500">{t.hero.statXp}</p>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-[#2563EB]">
                {activeProfile.xp}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-slate-500">{t.hero.statStreak}</p>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-[#D97706]">
                {activeProfile.dailyStreak} {t.hero.daysUnit}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-slate-500">{t.hero.statSolved}</p>
              <p className="font-mono-tabular mt-1 text-xl font-bold text-[#059669]">
                {activeProfile.challengesSolved}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-medium text-slate-500">{t.hero.statRank}</p>
              <p className="mt-1 truncate text-base font-bold text-slate-900">
                {t.common.level} {levelInfo.level} · {t.ranks[levelInfo.rankIndex]}
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Trainer Workspace */}
        <section id="trainer" className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          {/* Segmented Module Selector */}
          <div
            role="tablist"
            aria-label={t.nav.trainer}
            className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-1.5 sm:grid-cols-4"
          >
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
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
                      ? 'bg-[#2563EB] text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'gears' && (
            <GearsModule t={t} onAwardXp={(xp) => handleAwardModuleXp('gears', xp)} />
          )}
          {activeTab === 'pulleys' && (
            <PulleysModule t={t} onAwardXp={(xp) => handleAwardModuleXp('pulleys', xp)} />
          )}
          {activeTab === 'circuits' && (
            <CircuitsModule t={t} onAwardXp={(xp) => handleAwardModuleXp('circuits', xp)} />
          )}
          {activeTab === 'blitz' && (
            <BlitzModule
              t={t}
              bestBlitzStreak={activeProfile.bestBlitzStreak}
              onRecordBlitzResult={handleRecordBlitzResult}
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
