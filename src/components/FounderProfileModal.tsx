import React, { useEffect, useState } from 'react';
import { Download, Mail, Save, Sparkles, Target, UserRound, X } from 'lucide-react';
import {
  createFounderProfile,
  downloadFounderProfile,
  FounderProfile
} from '../services/offlineProfile';

interface FounderProfileModalProps {
  isOpen: boolean;
  initialProfile: FounderProfile | null;
  onClose: () => void;
  onSave: (profile: FounderProfile) => void;
}

export const FounderProfileModal: React.FC<FounderProfileModalProps> = ({
  isOpen,
  initialProfile,
  onClose,
  onSave
}) => {
  const [form, setForm] = useState<FounderProfile>(initialProfile ?? createFounderProfile());

  useEffect(() => {
    if (isOpen) {
      setForm(initialProfile ?? createFounderProfile());
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) {
    return null;
  }

  const handleFieldChange = (field: keyof FounderProfile, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    const safeProfile = {
      ...createFounderProfile(),
      ...form,
      uid: form.uid || createFounderProfile().uid,
      lastActiveAt: new Date().toISOString()
    };
    onSave(safeProfile);
    onClose();
  };

  const handleDownload = () => {
    downloadFounderProfile({
      ...createFounderProfile(),
      ...form,
      uid: form.uid || createFounderProfile().uid,
      lastActiveAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Founder profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Offline-first identity for your book, notes, and exports</p>
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
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Download backup
          </button>

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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <Save className="h-3.5 w-3.5" />
              Save profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
