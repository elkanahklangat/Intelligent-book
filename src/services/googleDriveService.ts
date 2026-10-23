import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { HighlightItem } from '../types';

import firebaseConfig from '../../firebase-applet-config.json';

const hasFirebaseConfig = Boolean(
  firebaseConfig &&
    (firebaseConfig as any)?.apiKey &&
    (firebaseConfig as any)?.projectId
);

let app: any = null;
let authInstance: any = null;
let dbInstance: any = null;

if (hasFirebaseConfig) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } catch (error) {
    console.warn('Firebase initialization failed in offline mode:', error);
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) {
    return false;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or waiting for network connection.');
    } else {
      console.log('Firebase initialized (security rules active).');
    }
    return false;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Google sign-in is unavailable in offline mode. Create a local founder profile instead.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-in failed:', error?.message || error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  if (!auth) {
    return;
  }

  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw error;
  }
}

export async function syncUserProfile(user: User): Promise<void> {
  if (!db) {
    return;
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Founder',
      photoURL: user.photoURL || '',
      lastActiveAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Error updating user profile in Firestore:', err);
  }
}

export function subscribeToUserHighlights(
  userId: string,
  onUpdate: (highlights: HighlightItem[]) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const highlightsRef = collection(db, 'users', userId, 'highlights');
  const q = query(highlightsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const items: HighlightItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        chapterId: data.chapterId,
        paragraphIndex: data.paragraphIndex ?? 0,
        text: data.text || '',
        color: data.color || 'green',
        note: data.note,
        createdAt: data.createdAt || Date.now()
      });
    });
    onUpdate(items);
  }, (err) => {
    console.warn('Firestore highlights subscription warning:', err);
  });
}

export async function saveHighlightToFirestore(userId: string, item: HighlightItem): Promise<void> {
  if (!db) {
    return;
  }

  try {
    const docRef = doc(db, 'users', userId, 'highlights', item.id);
    await setDoc(docRef, {
      ...item,
      userId
    });
  } catch (err) {
    console.warn('Failed to save highlight to Firestore:', err);
  }
}

export async function removeHighlightFromFirestore(userId: string, highlightId: string): Promise<void> {
  if (!db) {
    return;
  }

  try {
    const docRef = doc(db, 'users', userId, 'highlights', highlightId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to remove highlight from Firestore:', err);
  }
}

export function subscribeToUserProgress(
  userId: string,
  onUpdate: (completedChapterIds: string[]) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const progressRef = collection(db, 'users', userId, 'progress');

  return onSnapshot(progressRef, (snapshot) => {
    const completed: string[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.completed) {
        completed.push(data.chapterId || docSnap.id);
      }
    });
    onUpdate(completed);
  }, (err) => {
    console.warn('Firestore progress subscription warning:', err);
  });
}

export async function saveProgressToFirestore(
  userId: string,
  chapterId: string,
  completed: boolean
): Promise<void> {
  if (!db) {
    return;
  }

  try {
    const docRef = doc(db, 'users', userId, 'progress', chapterId);
    await setDoc(docRef, {
      chapterId,
      completed,
      userId,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to save progress to Firestore:', err);
  }
}

export { onAuthStateChanged };
