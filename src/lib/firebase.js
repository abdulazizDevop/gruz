import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBaVT1wtUr30hf_kWzM99uX2o7iNyW0Nco',
  authDomain: 'gruz-azhab.firebaseapp.com',
  projectId: 'gruz-azhab',
  storageBucket: 'gruz-azhab.firebasestorage.app',
  messagingSenderId: '417648175698',
  appId: '1:417648175698:web:f5683ecce50c2c6ec90d8b',
  measurementId: 'G-Y43CCY3HW8',
};

export const VAPID_KEY = 'BLe-gLKxeqm6rS_f56Hz_lnzDkFvoedFz8SYuhfX51rHTl_40G7Jb2z1lCLFgzkO50muRCCFBqPD1ZsEwIq-79o';

export const app = initializeApp(firebaseConfig);

let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (err) {
  console.warn('[firebase] persistent cache unavailable, falling back to memory:', err);
  db = getFirestore(app);
}

export { db };
