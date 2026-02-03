// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Your Firebase config (you'll need to replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyA53SaCvEGgQmBkfc47twD3rmjbiegtBeo",
  authDomain: "fattpad-700c6.firebaseapp.com",
  projectId: "fattpad-700c6",
  storageBucket: "fattpad-700c6.firebasestorage.app",
  messagingSenderId: "766165381277",
  appId: "1:766165381277:web:79523e259dbd81c3702474",
  measurementId: "G-ELTHWYDTMH"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});