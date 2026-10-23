/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CHAPTERS, EBOOK_METADATA } from './data/chaptersData';
import { INITIAL_VALIDATION_CHECKLIST, DETAILED_CASE_STUDIES } from './data/checklistAndCaseStudies';
import {
  Chapter,
  ReadingPreferences,
  HighlightItem,
  UserStats,
  ChecklistItem,
  DetailedCaseStudy
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Reader } from './components/Reader';
import { NotesDrawer } from './components/NotesDrawer';
import { SearchModal } from './components/SearchModal';
import { AIMentorModal } from './components/AIMentorModal';
import { AudioPlayer } from './components/AudioPlayer';
import { GoogleDriveHubModal } from './components/GoogleDriveHubModal';
import { ValidationChecklistModal } from './components/ValidationChecklistModal';
import { CaseStudiesModal } from './components/CaseStudiesModal';
import { UserStatsModal } from './components/UserStatsModal';
import { FounderProfileModal } from './components/FounderProfileModal';

import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  testFirestoreConnection,
  signInWithGoogle,
  logOut,
  syncUserProfile,
  subscribeToUserHighlights,
  saveHighlightToFirestore,
  removeHighlightFromFirestore,
  subscribeToUserProgress,
  saveProgressToFirestore
} from './services/firebase';
import {
  FounderProfile,
  clearFounderProfile,
  createFounderProfile,
  getFounderProfile,
  saveFounderProfile
} from './services/offlineProfile';

const STORAGE_KEYS = {
  PREFS: 'startup_ebook_preferences_v1',
  HIGHLIGHTS: 'startup_ebook_highlights_v1',
  STATS: 'startup_ebook_stats_v1',
  CURRENT_CHAPTER: 'startup_ebook_current_chapter_v1',
  CHECKLIST: 'startup_ebook_checklist_v1'
};

const DEFAULT_PREFERENCES: ReadingPreferences = {
  theme: 'deepblue',
  fontFamily: 'serif',
  fontSize: 'base',
  lineHeight: 'relaxed',
  contentWidth: 'medium',
  autoScroll: false
};

const DEFAULT_STATS: UserStats = {
  completedChapters: [],
  totalReadingSeconds: 0,
  quizScores: {},
  streakDays: 1,
  lastReadDate: new Date().toISOString(),
  dailyReadingGoalMinutes: 15,
  todayReadingSeconds: 0,
  todayDate: new Date().toISOString().split('T')[0],
  historyDates: {}
};

export default function App() {
  const [currentChapterId, setCurrentChapterId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAPTER) || CHAPTERS[0].id;
    } catch {
      return CHAPTERS[0].id;
    }
  });

  const [preferences, setPreferences] = useState<ReadingPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREFS);
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [highlights, setHighlights] = useState<HighlightItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
      return saved ? JSON.parse(saved) : INITIAL_VALIDATION_CHECKLIST;
    } catch {
      return INITIAL_VALIDATION_CHECKLIST;
    }
  });

  const [caseStudies] = useState<DetailedCaseStudy[]>(DETAILED_CASE_STUDIES);

  const [userStats, setUserStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : DEFAULT_STATS;
    } catch {
      return DEFAULT_STATS;
    }
  });

  const [founderProfile, setFounderProfile] = useState<FounderProfile | null>(() => getFounderProfile());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFounderProfileOpen, setIsFounderProfileOpen] = useState<boolean>(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAIMentorOpen, setIsAIMentorOpen] = useState<boolean>(false);
  const [isAudioOpen, setIsAudioOpen] = useState<boolean>(false);
  const [isDriveOpen, setIsDriveOpen] = useState<boolean>(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
  const [isCaseStudiesOpen, setIsCaseStudiesOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [currentAudioParagraphIndex, setCurrentAudioParagraphIndex] = useState<number>(0);

  const effectiveUser = useMemo(() => {
    if (currentUser) {
      return currentUser;
    }

    if (!founderProfile) {
      return null;
    }

    return {
      uid: founderProfile.uid,
      email: founderProfile.email || 'founder@offline.local',
      displayName: founderProfile.displayName || founderProfile.startupName || 'Founder',
      photoURL: ''
    } as any;
  }, [currentUser, founderProfile]);

  useEffect(() => {
    try {
      if (founderProfile) {
        saveFounderProfile(founderProfile);
      } else {
        clearFounderProfile();
      }
    } catch {
      // ignore storage issues in restricted browser contexts
    }
  }, [founderProfile]);

  useEffect(() => {
    testFirestoreConnection();

    let unsubscribeHighlights: (() => void) | null = null;
    let unsubscribeProgress: (() => void) | null = null;

    if (!auth) {
      setCurrentUser(null);
      return () => {};
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        syncUserProfile(user);

        unsubscribeHighlights = subscribeToUserHighlights(user.uid, (firestoreHighlights) => {
          if (firestoreHighlights && firestoreHighlights.length > 0) {
            setHighlights(firestoreHighlights);
          }
        });

        unsubscribeProgress = subscribeToUserProgress(user.uid, (completedChapterIds) => {
          if (completedChapterIds && completedChapterIds.length > 0) {
            setUserStats(prev => ({
              ...prev,
              completedChapters: Array.from(new Set([...prev.completedChapters, ...completedChapterIds]))
            }));
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeHighlights) unsubscribeHighlights();
      if (unsubscribeProgress) unsubscribeProgress();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CHAPTER, currentChapterId);
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentAudioParagraphIndex(0);
  }, [currentChapterId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(preferences));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(highlights));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [highlights]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(checklist));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [checklist]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(userStats));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [userStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setUserStats(prev => {
        const currentDateStr = new Date().toISOString().split('T')[0];
        const prevDateStr = prev.todayDate || currentDateStr;

        let newTodaySeconds = (prev.todayReadingSeconds || 0) + 1;
        let newHistory = { ...(prev.historyDates || {}) };
        let newStreak = prev.streakDays || 1;

        if (prevDateStr !== currentDateStr) {
          newHistory[prevDateStr] = prev.todayReadingSeconds || 0;
          newTodaySeconds = 1;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (prevDateStr === yesterdayStr) {
            newStreak = (prev.streakDays || 1) + 1;
          } else {
            newStreak = 1;
          }
        }

        return {
          ...prev,
          totalReadingSeconds: (prev.totalReadingSeconds || 0) + 1,
          todayReadingSeconds: newTodaySeconds,
          todayDate: currentDateStr,
          streakDays: newStreak,
          lastReadDate: new Date().toISOString(),
          historyDates: newHistory
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsAIMentorOpen(false);
        setIsNotesOpen(false);
        setIsDriveOpen(false);
        setIsChecklistOpen(false);
        setIsCaseStudiesOpen(false);
        setIsStatsOpen(false);
        setIsFounderProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const isDark = preferences.theme === 'deepblue' || preferences.theme === 'dark' || preferences.theme === 'midnight';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', preferences.theme);
  }, [preferences.theme]);

  const currentChapterIndex = useMemo(() => {
    const idx = CHAPTERS.findIndex(c => c.id === currentChapterId);
    return idx !== -1 ? idx : 0;
  }, [currentChapterId]);

  const currentChapter = CHAPTERS[currentChapterIndex];
  const previousChapter = currentChapterIndex > 0 ? CHAPTERS[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < CHAPTERS.length - 1 ? CHAPTERS[currentChapterIndex + 1] : null;

  const allParagraphsInCurrentChapter = useMemo(() => {
    const list: string[] = [];
    currentChapter.sections.forEach(sec => {
      sec.paragraphs.forEach(p => list.push(p));
    });
    return list;
  }, [currentChapter]);

  const handleUpdatePreferences = (updated: Partial<ReadingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updated }));
  };

  const handleSignIn = async () => {
    try {
      if (!auth) {
        setIsFounderProfileOpen(true);
        return;
      }

      await signInWithGoogle();
    } catch (err) {
      console.warn('Google sign-in cancelled or failed:', err);
      setIsFounderProfileOpen(true);
    }
  };

  const handleSignOutUser = async () => {
    try {
      if (currentUser) {
        await logOut();
      }
      setCurrentUser(null);
      setFounderProfile(null);
      clearFounderProfile();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const handleAddHighlight = (item: Omit<HighlightItem, 'id' | 'createdAt'>) => {
    const newItem: HighlightItem = {
      ...item,
      id: `hl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString()
    };
    setHighlights(prev => [newItem, ...prev]);

    if (currentUser) {
      saveHighlightToFirestore(currentUser.uid, newItem);
    }
  };

  const handleDeleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));

    if (currentUser) {
      removeHighlightFromFirestore(currentUser.uid, id);
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleUpdateChecklistNotes = (id: string, notes: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, notes } : item))
    );
  };

  const handleResetChecklist = () => {
    if (window.confirm('Are you sure you want to reset all checklist progress?')) {
      setChecklist(INITIAL_VALIDATION_CHECKLIST);
    }
  };

  const handleToggleComplete = (chapterId: string) => {
    setUserStats(prev => {
      const isAlready = prev.completedChapters.includes(chapterId);
      const nextList = isAlready
        ? prev.completedChapters.filter(id => id !== chapterId)
        : [...prev.completedChapters, chapterId];

      if (currentUser) {
        saveProgressToFirestore(currentUser.uid, chapterId, !isAlready);
      }

      return {
        ...prev,
        completedChapters: nextList
      };
    });
  };

  const handleJumpToHighlight = (chapterId: string, paragraphIndex: number) => {
    setCurrentChapterId(chapterId);
  };

  const handleUpdateDailyGoal = (minutes: number) => {
    setUserStats(prev => ({
      ...prev,
      dailyReadingGoalMinutes: Math.max(1, minutes)
    }));
  };

  const themeClass = preferences.theme === 'deepblue'
    ? 'theme-deepblue dark bg-[#070d1e] text-white'
    : preferences.theme === 'sepia'
    ? 'theme-sepia bg-[#f5efe6] text-[#33271d]'
    : preferences.theme === 'dark'
    ? 'theme-dark dark bg-[#090d16] text-white'
    : preferences.theme === 'midnight'
    ? 'theme-midnight dark bg-[#000000] text-white'
    : 'theme-light bg-[#ffffff] text-slate-900';

  return (
    <div id="startup-ebook-app-root" className={`min-h-screen flex flex-col transition-colors duration-200 ${themeClass}`}>
      <Header
        chapterTitle={currentChapter.title}
        chapterNumber={currentChapter.number}
        totalChapters={CHAPTERS.length}
        completedChaptersCount={userStats.completedChapters.length}
        userStats={userStats}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotes={() => setIsNotesOpen(true)}
        onOpenAIMentor={() => setIsAIMentorOpen(true)}
        onOpenAudio={() => setIsAudioOpen(true)}
        onOpenDrive={() => setIsDriveOpen(true)}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        onOpenCaseStudies={() => setIsCaseStudiesOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        notesCount={highlights.length}
        currentUser={effectiveUser as any}
        onSignInWithGoogle={handleSignIn}
        onSignOut={handleSignOutUser}
      />

      <div className="flex-1 flex w-full">
        <Sidebar
          chapters={CHAPTERS}
          currentChapterId={currentChapterId}
          onSelectChapter={(id) => setCurrentChapterId(id)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          userStats={userStats}
          onOpenNotes={() => setIsNotesOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAIMentor={() => setIsAIMentorOpen(true)}
          onOpenAudio={() => setIsAudioOpen(true)}
          onOpenDrive={() => setIsDriveOpen(true)}
          onOpenChecklist={() => setIsChecklistOpen(true)}
          onOpenCaseStudies={() => setIsCaseStudiesOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onUpdateGoal={handleUpdateDailyGoal}
        />

        <main className="flex-1 lg:pl-80 w-full overflow-x-hidden min-h-[calc(100vh-4rem)]">
          <Reader
            chapter={currentChapter}
            previousChapter={previousChapter}
            nextChapter={nextChapter}
            onNavigateChapter={(id) => setCurrentChapterId(id)}
            preferences={preferences}
            highlights={highlights}
            onAddHighlight={handleAddHighlight}
            isCompleted={userStats.completedChapters.includes(currentChapter.id)}
            onToggleComplete={handleToggleComplete}
            onOpenAIMentor={() => setIsAIMentorOpen(true)}
            onOpenStats={() => setIsStatsOpen(true)}
            userStats={userStats}
            currentAudioParagraphIndex={isAudioOpen ? currentAudioParagraphIndex : -1}
          />
        </main>
      </div>

      <UserStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        userStats={userStats}
        chapters={CHAPTERS}
        notesCount={highlights.length}
        onUpdateGoal={handleUpdateDailyGoal}
        onSelectChapter={(chapterId) => {
          setCurrentChapterId(chapterId);
          setIsStatsOpen(false);
        }}
      />

      <GoogleDriveHubModal
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        chapters={CHAPTERS}
        currentChapter={currentChapter}
        highlights={highlights}
        checklist={checklist}
        caseStudies={caseStudies}
      />

      <ValidationChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        checklist={checklist}
        onToggleItem={handleToggleChecklistItem}
        onUpdateNotes={handleUpdateChecklistNotes}
        onResetChecklist={handleResetChecklist}
        onExportToDrive={() => {
          setIsChecklistOpen(false);
          setIsDriveOpen(true);
        }}
      />

      <CaseStudiesModal
        isOpen={isCaseStudiesOpen}
        onClose={() => setIsCaseStudiesOpen(false)}
        caseStudies={caseStudies}
        onExportToDrive={() => {
          setIsCaseStudiesOpen(false);
          setIsDriveOpen(true);
        }}
      />

      <AudioPlayer
        textToRead={allParagraphsInCurrentChapter}
        currentParagraphIndex={currentAudioParagraphIndex}
        chapterTitle={currentChapter.title}
        onParagraphChange={(idx) => setCurrentAudioParagraphIndex(idx)}
        isOpen={isAudioOpen}
        onClose={() => setIsAudioOpen(false)}
      />

      <SearchModal
        chapters={CHAPTERS}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(chapterId) => setCurrentChapterId(chapterId)}
      />

      <NotesDrawer
        highlights={highlights}
        chapters={CHAPTERS}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onDeleteHighlight={handleDeleteHighlight}
        onJumpToHighlight={handleJumpToHighlight}
        onAddNote={handleAddHighlight}
        currentChapterId={currentChapterId}
      />

      <AIMentorModal
        chapter={currentChapter}
        isOpen={isAIMentorOpen}
        onClose={() => setIsAIMentorOpen(false)}
        onSaveAsNote={(noteText) => {
          handleAddHighlight({
            chapterId: currentChapter.id,
            paragraphIndex: 0,
            text: `[AI Advisor Note] ${currentChapter.title}`,
            color: 'amber',
            note: noteText
          });
        }}
      />

      <FounderProfileModal
        isOpen={isFounderProfileOpen}
        initialProfile={founderProfile}
        onClose={() => setIsFounderProfileOpen(false)}
        onSave={(profile) => {
          setFounderProfile(profile);
          setIsFounderProfileOpen(false);
        }}
      />
    </div>
  );
}





























































































































































































































































































































































































































































































n















































































































































































































































n














n













n































































n



















n

















n

























n
































n






























n

































n





"}]}           // end of files list            is not valid JSON, because we accidentally included a giant stray string after the JSON. I need to fix the payload and resend. Let's carefully compose the final JSON content without the accidental trailing content.          