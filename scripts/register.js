// Firebase Auth Configuration for Registration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from '../config/firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Google Sign Up Handler
function handleGoogleSignUp() {
    signInWithPopup(auth, provider)
        .then(async (result) => {
            const user = result.user;
            console.log('User signed up with Google:', user);
            
            // Create user profile in Firestore
            await createUserProfile(user, user.displayName);
            
            // Show success message and redirect
            showRegisterSuccess(user.displayName);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        })
        .catch((error) => {
            console.error('Error signing up with Google:', error);
            showRegisterError(error.message);
        });
}

// Make function available globally for Google button
window.handleGoogleSignUp = handleGoogleSignUp;

// Registration form handler
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    // Real-time password confirmation validation
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    confirmPasswordInput.addEventListener('input', function() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const displayName = document.getElementById('displayName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        // Validation
        if (!displayName) {
            showRegisterError('Please enter a display name');
            return;
        }
        
        if (password !== confirmPassword) {
            showRegisterError('Passwords do not match');
            return;
        }
        
        if (!agreeTerms) {
            showRegisterError('Please agree to the Terms of Service and Privacy Policy');
            return;
        }
        
        try {
            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update the user's display name
            await updateProfile(user, {
                displayName: displayName
            });
            
            // Create user profile in Firestore
            await createUserProfile(user, displayName);
            
            console.log('User registered successfully:', user);
            
            // Show success message and redirect
            showRegisterSuccess(displayName);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle specific Firebase errors
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Try signing in instead.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            }
            
            showRegisterError(errorMessage);
        }
    });
});

// Create user profile in Firestore
async function createUserProfile(user, displayName) {
    try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            photoURL: user.photoURL || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            bio: '',
            location: '',
            website: '',
            followerCount: 0,
            followingCount: 0,
            storyCount: 0
        });
        console.log('User profile created in Firestore');
    } catch (error) {
        console.error('Error creating user profile:', error);
        // Don't show this error to user as registration was successful
    }
}

// Show success message
function showRegisterSuccess(userName) {
    const successDiv = document.getElementById('registerSuccess');
    const successText = document.getElementById('successText');
    successText.textContent = `Welcome to Fattpad, ${userName}! Redirecting...`;
    successDiv.classList.remove('d-none');
}

// Show error message
function showRegisterError(message) {
    const errorDiv = document.getElementById('registerError');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.classList.remove('d-none');
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('d-none');
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