import React, { useEffect, useMemo, useState } from 'react';
import { Download, Mail, Save, Sparkles, Target, UserRound, X, ArrowUpRight, FileUp, ShieldCheck } from 'lucide-react';
import {
  createFounderProfile,
  downloadFounderProfile,
  FounderProfile,
  importFounderProfileFromJSON,
  saveFounderProfile
} from '../services/offlineProfile';

interface FounderProfileModalProps {
  isOpen: boolean;
  initialProfile: FounderProfile | null;
  onClose: () => void;
  onSave: (profile: FounderProfile) => void;
  onGoogleContinue?: () => Promise<void> | void;
}

export const FounderProfileModal: React.FC<FounderProfileModalProps> = ({
  isOpen,
  initialProfile,
  onClose,
  onSave,
  onGoogleContinue
}) => {
  const [form, setForm] = useState<FounderProfile>(initialProfile ?? createFounderProfile());
  const [signupMethod, setSignupMethod] = useState<'google' | 'email' | 'local'>('local');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialProfile ?? createFounderProfile());
      setSignupMethod('local');
    }
  }, [isOpen, initialProfile]);

  const handleFieldChange = (field: keyof FounderProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const normalizedProfile = useMemo(() => {
    return {
      ...createFounderProfile(),
      ...form,
      uid: form.uid || createFounderProfile().uid,
      lastActiveAt: new Date().toISOString(),
      favoriteChapterIds: form.favoriteChapterIds || [],
      noteSummaries: form.noteSummaries || []
    };
  }, [form]);

  const handleSave = () => {
    setIsSubmitting(true);
    const safeProfile = saveFounderProfile(normalizedProfile);
    onSave(safeProfile);
    onClose();
    setIsSubmitting(false);
  };

  const handleGoogleContinue = async () => {
    try {
      if (onGoogleContinue) {
        await onGoogleContinue();
      }
      const finalProfile = saveFounderProfile({
        ...normalizedProfile,
        email: normalizedProfile.email || 'founder@google.local',
        displayName: normalizedProfile.displayName || 'Founder'
      });
      onSave(finalProfile);
      onClose();
    } catch (error) {
      console.warn('Google signup flow skipped:', error);
      const fallback = saveFounderProfile({
        ...normalizedProfile,
        signupMethod: 'google' as any
      });
      onSave(fallback);
      onClose();
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = importFounderProfileFromJSON(text);
      if (!imported) {
        alert('This backup file is not a valid founder profile export.');
        return;
      }
      onSave(saveFounderProfile(imported));
      onClose();
    } catch (error) {
      console.warn('Import failed', error);
      alert('Unable to import this founder profile backup.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDownload = () => {
    downloadFounderProfile(normalizedProfile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Founder startup profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create your founder account and keep your journey offline-first</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close founder profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 p-3 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-blue-950/20 dark:to-violet-950/20">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Founder access
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSignupMethod('google')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${signupMethod === 'google' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}
              >
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => setSignupMethod('email')}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${signupMethod === 'email' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}
              >
                Use email signup
              </button>
            </div>
          </div>

          {signupMethod === 'google' && (
            <button
              type="button"
              onClick={handleGoogleContinue}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-95"
            >
              <ArrowUpRight className="h-4 w-4" />
              Sign up with Google
            </button>
          )}

          {(signupMethod === 'email' || signupMethod === 'local') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="mb-1.5 flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /> Full name</span>
                <input
                  value={form.displayName}
                  onChange={(e) => handleFieldChange('displayName', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="mb-1.5 flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </div>
          )}

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="mb-1.5 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Startup / company</span>
            <input
              value={form.startupName}
              onChange={(e) => handleFieldChange('startupName', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="mb-1.5 flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Business stage</span>
              <input
                value={form.businessStage}
                onChange={(e) => handleFieldChange('businessStage', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>

            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="mb-1.5 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Current focus</span>
              <input
                value={form.focusArea}
                onChange={(e) => handleFieldChange('focusArea', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="mb-1.5 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Founder goals</span>
            <textarea
              rows={4}
              value={form.goals}
              onChange={(e) => handleFieldChange('goals', e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Import backup or save locally</div>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <FileUp className="h-3.5 w-3.5" />
                Import backup
                <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
              </label>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:justify-between">
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Offline profile is saved in local storage, and can sync to Google when available.</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
