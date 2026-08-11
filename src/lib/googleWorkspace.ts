import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import app from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// Add the scopes requested by the user
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read'
];

SCOPES.forEach(scope => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_access_token'); // cache token in-memory, but allow local storage restore for seamless preview reload

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If there's a Firebase user but no token in cache, they may need to re-login to get the access token
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('google_access_token');
};

/**
 * Loads the Google API client (gapi) and Picker libraries dynamically
 */
export const loadGooglePickerScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).gapi && (window as any).google && (window as any).google.picker) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('picker', {
        callback: () => {
          // Load the Identity client script as well
          const gisScript = document.createElement('script');
          gisScript.src = 'https://accounts.google.com/gsi/client';
          gisScript.onload = () => resolve();
          gisScript.onerror = (e) => reject(e);
          document.body.appendChild(gisScript);
        },
        onerror: (e: any) => reject(e)
      });
    };
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
};

/**
 * Displays the Google Picker to select a file or folder from Google Drive
 */
export const showGooglePicker = async (
  accessToken: string,
  viewType: 'all' | 'images' | 'folders',
  onSelect: (selectedItem: { id: string; name: string; url: string; mimeType: string }) => void
): Promise<void> => {
  try {
    console.log('[GooglePicker] Initializing Google Picker. AccessToken length:', accessToken?.length);
    await loadGooglePickerScript();

    // Critical fix: pickerOrigin must match exactly the origin of the active window/iframe hosting the Picker
    // to allow successful postMessage communication back from the popup window.
    const pickerOrigin = window.location.origin;
    console.log('[GooglePicker] Setting Picker origin to:', pickerOrigin);

    let viewId = (window as any).google.picker.ViewId.DOCS;
    if (viewType === 'folders') {
      viewId = (window as any).google.picker.ViewId.FOLDERS;
    }

    const docsView = new (window as any).google.picker.DocsView(viewId);
    if (viewType === 'images') {
      docsView.setMimeTypes('image/png,image/jpeg,image/gif,image/webp');
    } else if (viewType === 'folders') {
      docsView.setSelectFolderEnabled(true);
      docsView.setMimeTypes('application/vnd.google-apps.folder');
    }

    // Initialize Picker with necessary Developer Key (API Key) and App ID
    const pickerBuilder = new (window as any).google.picker.PickerBuilder()
      .addView(docsView)
      .setOAuthToken(accessToken)
      .setOrigin(pickerOrigin);

    // Apply Developer Key (API Key) if available in config
    if (firebaseConfig.apiKey) {
      console.log('[GooglePicker] Applying Developer Key from Firebase Applet config');
      pickerBuilder.setDeveloperKey(firebaseConfig.apiKey);
    } else {
      console.warn('[GooglePicker] No developer key (API Key) found in Firebase configuration!');
    }

    // Apply App ID (Project ID) if available
    if (firebaseConfig.projectId) {
      console.log('[GooglePicker] Applying App ID:', firebaseConfig.projectId);
      pickerBuilder.setAppId(firebaseConfig.projectId);
    }

    const picker = pickerBuilder
      .setCallback((data: any) => {
        console.log('[GooglePicker] Callback received event:', data.action, data);
        if (data.action === (window as any).google.picker.Action.PICKED) {
          const doc = data.docs[0];
          console.log('[GooglePicker] Selected item:', doc);
          onSelect({
            id: doc.id,
            name: doc.name,
            url: doc.url,
            mimeType: doc.mimeType
          });
        }
      })
      .build();

    picker.setVisible(true);
    console.log('[GooglePicker] Picker dialog launched successfully.');
  } catch (error: any) {
    console.error('[GooglePicker] Error launching Google Picker:', error);
    alert('Erro ao carregar o Google Picker: ' + (error.message || error) + '. Certifique-se de que o bloqueador de popups está desativado.');
  }
};

/**
 * GOOGLE DOCS API: Creates a Google Doc with template content
 */
export const createGoogleDoc = async (
  title: string,
  content: string,
  accessToken: string
): Promise<{ documentId: string; url: string }> => {
  // 1. Create a blank document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Doc: ${errText}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. Insert content into the document
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to update Google Doc content: ${errText}`);
  }

  return {
    documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`
  };
};

/**
 * PEOPLE API (CONTACTS): Fetches contacts from user's Google Account
 */
export interface GoogleContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export const fetchGoogleContacts = async (accessToken: string): Promise<GoogleContact[]> => {
  const res = await fetch(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses&pageSize=150',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Google Contacts: ${errText}`);
  }

  const data = await res.json();
  const connections = data.connections || [];

  return connections.map((conn: any) => {
    const id = conn.resourceName || Math.random().toString();
    const name = conn.names?.[0]?.displayName || 'Contato Sem Nome';
    const phone = conn.phoneNumbers?.[0]?.value || '';
    const email = conn.emailAddresses?.[0]?.value || '';

    return { id, name, phone, email };
  });
};

/**
 * PEOPLE API (CONTACTS): Creates a new contact in Google Account
 */
export const createGoogleContact = async (
  name: string,
  phone: string,
  email: string,
  accessToken: string
): Promise<any> => {
  const body = {
    names: [{ givenName: name }],
    phoneNumbers: phone ? [{ value: phone, type: 'mobile' }] : [],
    emailAddresses: email ? [{ value: email, type: 'home' }] : []
  };

  const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Google Contact: ${errText}`);
  }

  return await res.json();
};
