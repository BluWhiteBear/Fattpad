// Firebase Auth Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Google Sign In Handler
function handleGoogleSignIn() {
    signInWithPopup(auth, provider)
        .then(async (result) => {
            const user = result.user;
            console.log('User signed in:', user);
            
            // Ensure user profile exists
            await ensureUserProfile(user);
            
            // Show success message and redirect
            showLoginSuccess(user.displayName);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        })
        .catch((error) => {
            console.error('Error signing in:', error);
            showLoginError(error.message);
        });
}

// Make function available globally for Google button
window.handleGoogleSignIn = handleGoogleSignIn;

// Traditional login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Sign in with Firebase Auth
        signInWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                const user = userCredential.user;
                console.log('User signed in:', user);
                
                // Ensure user profile exists
                await ensureUserProfile(user);
                
                showLoginSuccess(user.displayName || user.email);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            })
            .catch((error) => {
                console.error('Error signing in:', error);
                showLoginError('Invalid email or password');
            });
    });
});

/**
 * Ensure user profile exists in Firestore
 */
async function ensureUserProfile(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            console.log('📝 Creating user profile for:', user.email);
            
            const newProfile = {
                uid: user.uid,
                displayName: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL || '',
                bio: '',
                createdAt: new Date(),
                updatedAt: new Date(),
                stats: {
                    worksCount: 0,
                    totalReads: 0,
                    totalLikes: 0,
                    followers: 0,
                    following: 0
                }
            };
            
            await setDoc(userDocRef, newProfile);
            console.log('✅ User profile created successfully');
        } else {
            console.log('✅ User profile already exists');
        }
    } catch (error) {
        console.error('❌ Error ensuring user profile:', error);
    }
}

function showLoginSuccess(userName) {
    const successDiv = document.getElementById('loginSuccess');
    const successText = document.getElementById('successText');
    successText.textContent = `Welcome back, ${userName}!`;
    successDiv.style.display = 'block';
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is already signed in, redirect to home
            window.location.href = 'index.html';
        }
    });
});