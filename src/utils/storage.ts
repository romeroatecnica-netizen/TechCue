import type {ModuleId} from '../i18n/types';

export interface ModuleProgress {
  solved: number;
  attempts: number;
}

export interface UserProfile {
  id: string;
  name: string;
  xp: number;
  dailyStreak: number;
  lastActiveDate: string;
  challengesSolved: number;
  bestBlitzStreak: number;
  modules: Record<ModuleId, ModuleProgress>;
  createdAt: string;
}

export interface ProfileStore {
  version: 1;
  activeProfileId: string;
  profiles: UserProfile[];
}

const STORAGE_KEY = 'techcue_profiles_v1';

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createDefaultProfile(name = 'Engineer 1'): UserProfile {
  return {
    id: `prof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    xp: 0,
    dailyStreak: 1,
    lastActiveDate: todayIsoDate(),
    challengesSolved: 0,
    bestBlitzStreak: 0,
    modules: {
      gears: {solved: 0, attempts: 0},
      pulleys: {solved: 0, attempts: 0},
      circuits: {solved: 0, attempts: 0},
      blitz: {solved: 0, attempts: 0},
      duel: {solved: 0, attempts: 0},
    },
    createdAt: new Date().toISOString(),
  };
}

function refreshDailyStreak(profile: UserProfile): UserProfile {
  const today = todayIsoDate();
  if (profile.lastActiveDate === today) {
    return profile;
  }
  const yest = yesterdayIsoDate();
  const nextStreak = profile.lastActiveDate === yest ? profile.dailyStreak + 1 : 1;
  return {
    ...profile,
    dailyStreak: nextStreak,
    lastActiveDate: today,
  };
}

export function loadProfileStore(): ProfileStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = createDefaultProfile('Engineer 1');
      const initial: ProfileStore = {version: 1, activeProfileId: def.id, profiles: [def]};
      saveProfileStore(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (isValidProfileStore(parsed)) {
      const updatedProfiles = parsed.profiles.map((p) => {
        const normalized: UserProfile = {
          ...p,
          modules: {
            ...p.modules,
            duel: p.modules.duel ?? {solved: 0, attempts: 0},
          },
        };
        return normalized.id === parsed.activeProfileId ? refreshDailyStreak(normalized) : normalized;
      });
      const store: ProfileStore = {...parsed, profiles: updatedProfiles};
      saveProfileStore(store);
      return store;
    }
  } catch {
    // Fallback to clean store
  }
  const def = createDefaultProfile('Engineer 1');
  const fallback: ProfileStore = {version: 1, activeProfileId: def.id, profiles: [def]};
  saveProfileStore(fallback);
  return fallback;
}

export function saveProfileStore(store: ProfileStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function isValidProfile(item: unknown): item is UserProfile {
  if (!item || typeof item !== 'object') return false;
  const p = item as Partial<UserProfile>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.xp === 'number' &&
    typeof p.dailyStreak === 'number' &&
    typeof p.lastActiveDate === 'string' &&
    typeof p.challengesSolved === 'number' &&
    typeof p.bestBlitzStreak === 'number' &&
    Boolean(p.modules && p.modules.gears && p.modules.pulleys && p.modules.circuits && p.modules.blitz)
  );
}

export function isValidProfileStore(data: unknown): data is ProfileStore {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<ProfileStore>;
  return (
    d.version === 1 &&
    typeof d.activeProfileId === 'string' &&
    Array.isArray(d.profiles) &&
    d.profiles.length > 0 &&
    d.profiles.every(isValidProfile)
  );
}

export function getLevelFromXp(xp: number): {level: number; rankIndex: number; progressPct: number; nextLevelXp: number} {
  const level = Math.floor(xp / 120) + 1;
  const currentLevelBase = (level - 1) * 120;
  const nextLevelXp = level * 120;
  const progressPct = Math.min(100, Math.round(((xp - currentLevelBase) / 120) * 100));
  const rankIndex = Math.min(4, Math.floor((level - 1) / 2));
  return {level, rankIndex, progressPct, nextLevelXp};
}

export function exportProfileStoreJson(store: ProfileStore): string {
  return JSON.stringify(store, null, 2);
}

export function parseImportedProfileJson(raw: string): ProfileStore | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isValidProfileStore(parsed)) {
      return parsed;
    }
    // Also allow importing a single profile object
    if (isValidProfile(parsed)) {
      return {
        version: 1,
        activeProfileId: parsed.id,
        profiles: [parsed],
      };
    }
    return null;
  } catch {
    return null;
  }
}
