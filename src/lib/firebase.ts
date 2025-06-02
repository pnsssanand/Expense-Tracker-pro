
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyArR0f9bN77XyIqOdZXli2QOHpFIgH8wuI",
  authDomain: "expense-tracker-7d006.firebaseapp.com",
  projectId: "expense-tracker-7d006",
  storageBucket: "expense-tracker-7d006.firebasestorage.app",
  messagingSenderId: "52242435264",
  appId: "1:52242435264:web:e432ac2427b1e20f48b125",
  measurementId: "G-SCT60XKHNB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
