import {Check, Download, Plus, Trash2, Upload, X} from 'lucide-react';
import {useRef, useState} from 'react';
import type {ModuleId, TranslationDict} from '../i18n/types';
import {
  exportProfileStoreJson,
  getLevelFromXp,
  parseImportedProfileJson,
  type ProfileStore,
} from '../utils/storage';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationDict;
  store: ProfileStore;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
  onImportStore: (nextStore: ProfileStore) => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  t,
  store,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onImportStore,
}: ProfileModalProps) {
  const [newName, setNewName] = useState('');
  const [importMsg, setImportMsg] = useState<{type: 'ok' | 'err'; text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const active = store.profiles.find((p) => p.id === store.activeProfileId) || store.profiles[0];
  const levelInfo = getLevelFromXp(active.xp);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateProfile(trimmed);
    setNewName('');
  };

  const handleExport = () => {
    const json = exportProfileStoreJson(store);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `techcue-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedProfileJson(text);
      if (parsed) {
        onImportStore(parsed);
        setImportMsg({type: 'ok', text: t.profile.importSuccess});
      } else {
        setImportMsg({type: 'err', text: t.profile.importError});
      }
    } catch {
      setImportMsg({type: 'err', text: t.profile.importError});
    } finally {
      e.target.value = '';
    }
  };

  const moduleEntries: Array<{id: ModuleId; label: string}> = [
    {id: 'gears', label: t.tabs.gears},
    {id: 'pulleys', label: t.tabs.pulleys},
    {id: 'circuits', label: t.tabs.circuits},
    {id: 'blitz', label: t.tabs.blitz},
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 id="profile-modal-title" className="text-lg font-bold text-slate-900">
            {t.profile.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Active Profile Stats */}
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-500">{t.profile.activeProfile}</p>
              <p className="text-base font-bold text-slate-900">{active.name}</p>
            </div>
            <div className="text-end">
              <p className="text-xs font-medium text-slate-500">
                {t.common.level} <span className="font-mono-tabular font-bold text-slate-900">{levelInfo.level}</span> ·{' '}
                {t.ranks[levelInfo.rankIndex]}
              </p>
              <p className="font-mono-tabular text-sm font-bold text-[#2563EB]">{active.xp} XP</p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-[#2563EB] transition-all duration-200"
              style={{width: `${levelInfo.progressPct}%`}}
            />
          </div>
        </div>

        {/* Module Mastery */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900">{t.profile.masteryTitle}</h3>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {moduleEntries.map((m) => {
              const stat = active.modules[m.id];
              const pct = Math.min(100, stat.solved * 10);
              return (
                <div key={m.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span>{m.label}</span>
                    <span className="font-mono-tabular text-slate-600">
                      {stat.solved} {t.profile.challengesCount}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-[#059669]" style={{width: `${pct}%`}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Profile Switcher */}
        <div className="mt-5">
          <div className="flex flex-col gap-2">
            {store.profiles.map((p) => {
              const isCurrent = p.id === active.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                    isCurrent ? 'border-[#2563EB] bg-blue-50/50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectProfile(p.id)}
                    className="flex flex-1 items-center justify-between text-start cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {isCurrent && <Check className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />}
                      {p.name}
                    </span>
                    <span className="font-mono-tabular text-xs font-medium text-slate-600">
                      {p.xp} XP · {p.challengesSolved} {t.profile.challengesCount}
                    </span>
                  </button>
                  {store.profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteProfile(p.id)}
                      aria-label={t.profile.deleteBtn}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-[#DC2626] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCreate} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={24}
              placeholder={t.profile.newProfilePlaceholder}
              className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.profile.createBtn}
            </button>
          </form>
        </div>

        {/* Export / Import JSON */}
        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
              {t.profile.exportJson}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-[#059669]" aria-hidden="true" />
              {t.profile.importJson}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {importMsg && (
            <p
              className={`mt-3 text-xs font-medium ${
                importMsg.type === 'ok' ? 'text-[#059669]' : 'text-[#DC2626]'
              }`}
            >
              {importMsg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
