/**
 * Authentication State Manager
 * Centralized authentication state management for the Fattpad application
 * Handles user authentication, profile loading, and state synchronization across all pages
 */

import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    setDoc,
    updateDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

/**
 * Authentication Manager Class
 * Single source of truth for all authentication-related operations
 */
class AuthenticationManager {
    constructor() {
        this.currentUser = null;
        this.currentUserProfile = null;
        this.authListeners = [];
        this.profileListeners = [];
        this.isInitialized = false;
        this.initPromise = null;
        
        // Initialize auth state listener
        this.init();
    }

    /**
     * Initialize the authentication manager
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve) => {
            // Set up auth state listener
            this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
                const previousUser = this.currentUser;
                this.currentUser = user;
                
                if (user) {
                    // User is signed in, load their profile
                    try {
                        this.currentUserProfile = await this.loadUserProfile(user.uid);
                        console.log('✅ User authenticated and profile loaded:', {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName
                        });
                    } catch (error) {
                        console.warn('⚠️ Failed to load user profile:', error);
                        this.currentUserProfile = null;
                    }
                } else {
                    // User is signed out
                    this.currentUserProfile = null;
                    console.log('👋 User signed out');
                }

                // Notify all auth listeners
                this.notifyAuthListeners(user, previousUser);
                
                // Resolve initialization promise on first auth state change
                if (!this.isInitialized) {
                    this.isInitialized = true;
                    resolve();
                }
            });
        });

        return this.initPromise;
    }

    /**
     * Get current user (guaranteed to be available after init)
     * @returns {Object|null} - Current user object or null if not authenticated
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user profile (guaranteed to be available after init)
     * @returns {Object|null} - Current user profile object or null if not available
     */
    getCurrentUserProfile() {
        return this.currentUserProfile;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - True if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Load user profile from database
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} - User profile object or null
     */
    async loadUserProfile(userId) {
        if (!userId) return null;

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            
            if (userDoc.exists()) {
                const profile = userDoc.data();
                console.log(`✅ Profile loaded for user ${userId}`);
                return profile;
            } else {
                console.log(`📝 Creating new profile for user ${userId}`);
                return await this.createUserProfile(userId);
            }
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            throw error;
        }
    }

    /**
     * Create a new user profile in the database
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Created user profile
     */
    async createUserProfile(userId) {
        if (!this.currentUser) {
            throw new Error('Cannot create profile: no authenticated user');
        }

        const profileData = {
            uid: userId,
            displayName: this.currentUser.displayName || 'Anonymous User',
            email: this.currentUser.email,
            photoURL: this.currentUser.photoURL || '',
            bio: '',
            joinedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            stats: {
                followers: 0,
                following: 0,
                totalLikes: 0,
                totalViews: 0,
                storiesCount: 0
            },
            preferences: {
                theme: 'dark',
                notifications: true,
                publicProfile: true
            }
        };

        try {
            await setDoc(doc(db, 'users', userId), profileData);
            console.log('✅ New user profile created:', profileData);
            return profileData;
        } catch (error) {
            console.error('❌ Error creating user profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile in the database
     * @param {string} userId - User ID
     * @param {Object} updates - Profile updates
     * @returns {Promise<Object>} - Updated profile
     */
    async updateUserProfile(userId, updates) {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                ...updates,
                lastUpdatedAt: serverTimestamp()
            });
            
            // Update local cache if this is the current user
            if (userId === this.currentUser?.uid) {
                this.currentUserProfile = {
                    ...this.currentUserProfile,
                    ...updates
                };
                this.notifyProfileListeners(this.currentUserProfile);
            }
            
            console.log('✅ User profile updated:', updates);
            return this.currentUserProfile;
        } catch (error) {
            console.error('❌ Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} - User credential
     */
    async signInWithEmail(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Email sign-in successful');
            return userCredential;
        } catch (error) {
            console.error('❌ Email sign-in failed:', error);
            throw error;
        }
    }

    /**
     * Sign up with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} displayName - User display name
     * @returns {Promise<Object>} - User credential
     */
    async signUpWithEmail(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update the user's display name
            if (displayName) {
                await updateProfile(userCredential.user, {
                    displayName: displayName
                });
            }
            
            console.log('✅ Email sign-up successful');
            return userCredential;
        } catch (error) {
            console.error('❌ Email sign-up failed:', error);
            throw error;
        }
    }

    /**
     * Sign in with Google
     * @returns {Promise<Object>} - User credential
     */
    async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            const userCredential = await signInWithPopup(auth, provider);
            console.log('✅ Google sign-in successful');
            return userCredential;
        } catch (error) {
            console.error('❌ Google sign-in failed:', error);
            throw error;
        }
    }

    /**
     * Sign out the current user
     * @returns {Promise<void>}
     */
    async signOutUser() {
        try {
            await signOut(auth);
            console.log('✅ User signed out successfully');
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            throw error;
        }
    }

    /**
     * Add listener for authentication state changes
     * @param {Function} listener - Callback function (user, previousUser) => void
     * @returns {Function} - Unsubscribe function
     */
    onAuthStateChange(listener) {
        this.authListeners.push(listener);
        
        // Call immediately with current state if initialized
        if (this.isInitialized) {
            listener(this.currentUser, null);
        }
        
        // Return unsubscribe function
        return () => {
            const index = this.authListeners.indexOf(listener);
            if (index > -1) {
                this.authListeners.splice(index, 1);
            }
        };
    }

    /**
     * Add listener for user profile changes
     * @param {Function} listener - Callback function (profile) => void
     * @returns {Function} - Unsubscribe function
     */
    onProfileChange(listener) {
        this.profileListeners.push(listener);
        
        // Call immediately with current state if initialized
        if (this.isInitialized && this.currentUserProfile) {
            listener(this.currentUserProfile);
        }
        
        // Return unsubscribe function
        return () => {
            const index = this.profileListeners.indexOf(listener);
            if (index > -1) {
                this.profileListeners.splice(index, 1);
            }
        };
    }

    /**
     * Wait for authentication to initialize
     * @returns {Promise<Object|null>} - Current user after initialization
     */
    async waitForAuth() {
        await this.init();
        return this.currentUser;
    }

    /**
     * Refresh current user profile from database
     * @returns {Promise<Object|null>} - Refreshed profile
     */
    async refreshUserProfile() {
        if (!this.currentUser) {
            return null;
        }

        try {
            this.currentUserProfile = await this.loadUserProfile(this.currentUser.uid);
            this.notifyProfileListeners(this.currentUserProfile);
            return this.currentUserProfile;
        } catch (error) {
            console.error('❌ Error refreshing user profile:', error);
            return null;
        }
    }

    /**
     * Notify all authentication listeners
     * @private
     */
    notifyAuthListeners(user, previousUser) {
        this.authListeners.forEach(listener => {
            try {
                listener(user, previousUser);
            } catch (error) {
                console.error('❌ Error in auth listener:', error);
            }
        });
    }

    /**
     * Notify all profile listeners
     * @private
     */
    notifyProfileListeners(profile) {
        this.profileListeners.forEach(listener => {
            try {
                listener(profile);
            } catch (error) {
                console.error('❌ Error in profile listener:', error);
            }
        });
    }

    /**
     * Clean up listeners and subscriptions
     */
    destroy() {
        if (this.authUnsubscribe) {
            this.authUnsubscribe();
        }
        this.authListeners = [];
        this.profileListeners = [];
        this.currentUser = null;
        this.currentUserProfile = null;
        this.isInitialized = false;
    }
}

// Create and export singleton instance
const authManager = new AuthenticationManager();

// Export the instance and class
export default authManager;
export { AuthenticationManager };

// Legacy global compatibility
window.authManager = authManager;

// Common utility functions for backwards compatibility
export const getCurrentUser = () => authManager.getCurrentUser();
export const getCurrentUserProfile = () => authManager.getCurrentUserProfile();
export const isAuthenticated = () => authManager.isAuthenticated();
export const waitForAuth = () => authManager.waitForAuth();

console.log('🔐 Authentication Manager initialized');