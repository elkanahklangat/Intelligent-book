export interface FounderProfile {
  uid: string;
  displayName: string;
  email: string;
  startupName: string;
  businessStage: string;
  focusArea: string;
  goals: string;
  createdAt: string;
  lastActiveAt: string;
  favoriteChapterIds: string[];
  noteSummaries: string[];
}

const PROFILE_STORAGE_KEY = 'startup_ebook_founder_profile_v1';

export function normalizeFounderProfile(profile?: Partial<FounderProfile> | null): FounderProfile {
  const now = new Date().toISOString();
  const base: FounderProfile = {
    uid: `founder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    displayName: 'Founder',
    email: 'founder@offline.local',
    startupName: 'Your Startup',
    businessStage: 'Idea stage',
    focusArea: 'Customer discovery',
    goals: 'Validate the problem, build the MVP, and reach repeatable traction.',
    createdAt: now,
    lastActiveAt: now,
    favoriteChapterIds: [],
    noteSummaries: []
  };

  return {
    ...base,
    ...profile,
    favoriteChapterIds: Array.from(new Set(profile?.favoriteChapterIds ?? base.favoriteChapterIds ?? [])),
    noteSummaries: Array.from(new Set(profile?.noteSummaries ?? base.noteSummaries ?? [])),
    lastActiveAt: new Date().toISOString()
  };
}

export function createFounderProfile(overrides: Partial<FounderProfile> = {}): FounderProfile {
  return normalizeFounderProfile(overrides);
}

export function getFounderProfile(): FounderProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FounderProfile;
    if (!parsed || !parsed.uid) return null;
    return normalizeFounderProfile(parsed);
  } catch {
    return null;
  }
}

export function saveFounderProfile(profile: FounderProfile): FounderProfile {
  const normalized = normalizeFounderProfile(profile);
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('Unable to save founder profile offline:', error);
  }
  return normalized;
}

export function clearFounderProfile(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear founder profile offline:', error);
  }
}

export function downloadFounderProfile(profile: FounderProfile): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    founder: normalizeFounderProfile(profile)
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(profile.startupName || 'founder-profile').replace(/\s+/g, '-').toLowerCase() || 'founder-profile'}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function importFounderProfileFromJSON(rawText: string): FounderProfile | null {
  try {
    const parsed = JSON.parse(rawText);
    const candidate = parsed?.founder ?? parsed;
    if (!candidate || !candidate.uid) return null;
    return normalizeFounderProfile(candidate);
  } catch (error) {
    console.warn('Unable to import founder profile backup:', error);
    return null;
  }
}
