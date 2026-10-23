import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with all requested Google Drive scopes
export const googleDriveProvider = new GoogleAuthProvider();

// Add Drive scopes
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.scripts'
];

DRIVE_SCOPES.forEach((scope) => {
  googleDriveProvider.addScope(scope);
});

// Prompt consent to ensure refreshed access tokens with scopes
googleDriveProvider.setCustomParameters({
  prompt: 'consent'
});

// In-memory token cache (strictly following security rules: never in localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (user && !cachedAccessToken) {
      // In Firebase Auth web SDK, the OAuth access token is only returned in credentialFromResult.
      // If we have a user from persistent session but no token in memory, we notify app to prompt or refresh.
      if (onAuthFailure) onAuthFailure();
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleDriveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No access token returned from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const isCancelled =
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/user-cancelled' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request');

    if (isCancelled) {
      console.log('Google Sign In popup was closed or cancelled by the user.');
      return null;
    }

    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('Google Sign In popup was blocked by browser.');
      throw new Error('Sign-in pop-up was blocked by your browser. Please allow pop-ups for this site and try again.');
    }

    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

/**
 * Get or create dedicated app folder in Google Drive: "Startup Lessons Ebook"
 */
export const getOrCreateAppFolder = async (accessToken: string): Promise<string> => {
  const folderName = 'Startup Lessons Ebook';
  
  // Search for existing folder
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Failed to search Google Drive folder: ${errText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Documents, checklists, and notes exported from Startup Lessons Field Manual'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${errText}`);
  }

  const folder = await createRes.json();
  return folder.id;
};

/**
 * Export Markdown/Text/JSON content to Google Drive inside the app folder
 */
export const exportFileToDrive = async ({
  title,
  content,
  mimeType = 'text/markdown',
  asGoogleDoc = false
}: {
  title: string;
  content: string;
  mimeType?: string;
  asGoogleDoc?: boolean;
}): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive. Please sign in first.');
  }

  const folderId = await getOrCreateAppFolder(token);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = {
    name: title,
    parents: [folderId]
  };

  if (asGoogleDoc) {
    metadata.mimeType = 'application/vnd.google-apps.document';
  }

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to export to Google Drive: ${errorText}`);
  }

  const createdFile: DriveFileItem = await response.json();
  return createdFile;
};

/**
 * List files stored in the "Startup Lessons Ebook" folder
 */
export const listAppFolderFiles = async (): Promise<DriveFileItem[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  const folderId = await getOrCreateAppFolder(token);
  const query = `'${folderId}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    console.error('Failed to list Google Drive files', await response.text());
    return [];
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Delete a file in Google Drive (must follow confirmation protocol)
 */
export const deleteDriveFile = async (fileId: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to delete Google Drive file: ${err}`);
  }

  return true;
};
