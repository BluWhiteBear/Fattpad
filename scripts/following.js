// Following page functionality with Firebase integration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig } from '../config/firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let profileUserId = null;

// Initialize following page
document.addEventListener('DOMContentLoaded', function() {
    // Get user ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    profileUserId = urlParams.get('userId');
    
    if (!profileUserId) {
        showError('User ID not provided');
        return;
    }
    
    // Wait for auth state
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadUserProfile();
        loadFollowing();
    });
});

/**
 * Load user profile information for page header
 */
async function loadUserProfile() {
    try {
        const userDocRef = doc(db, 'users', profileUserId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('page-subtitle').textContent = `People ${userData.displayName} is following`;
            document.title = `${userData.displayName}'s Following - Fattpad`;
        }
    } catch (error) {
        console.error('❌ Error loading user profile:', error);
    }
}

/**
 * Load and display following
 */
async function loadFollowing() {
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const usersList = document.getElementById('users-list');
    
    try {
        // Query follows collection for users this profile is following
        const followsRef = collection(db, 'follows');
        const followingQuery = query(
            followsRef,
            where('followerId', '==', profileUserId)
        );
        
        const followingSnapshot = await getDocs(followingQuery);
        
        // Hide loading state
        loadingState.style.display = 'none';
        
        if (followingSnapshot.empty) {
            emptyState.style.display = 'block';
            return;
        }
        
        // Get following user data
        const followingPromises = followingSnapshot.docs.map(async (followDoc) => {
            const followData = followDoc.data();
            const followingUserRef = doc(db, 'users', followData.followingId);
            const followingUserDoc = await getDoc(followingUserRef);
            
            if (followingUserDoc.exists()) {
                return {
                    id: followData.followingId,
                    ...followingUserDoc.data(),
                    followedAt: followData.createdAt
                };
            }
            return null;
        });
        
        const following = (await Promise.all(followingPromises)).filter(Boolean);
        
        // Sort by follow date (newest first)
        following.sort((a, b) => b.followedAt?.toDate?.() - a.followedAt?.toDate?.());
        
        // Display following
        displayFollowing(following);
        
    } catch (error) {
        console.error('❌ Error loading following:', error);
        loadingState.style.display = 'none';
        showError('Failed to load following');
    }
}

/**
 * Display following list
 */
function displayFollowing(following) {
    const usersList = document.getElementById('users-list');
    
    following.forEach(user => {
        const userCard = createUserCard(user);
        usersList.appendChild(userCard);
    });
}

/**
 * Create user card element
 */
function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card d-flex align-items-center p-3 bg-primary rounded-3';
    
    const profilePicUrl = user.photoURL || '../img/pfp-default.png';
    const isOwnProfile = currentUser && currentUser.uid === user.id;
    
    card.innerHTML = `
        <img src="${profilePicUrl}" alt="${user.displayName}" class="user-avatar me-3">
        <div class="user-info flex-grow-1">
            <h6 class="user-name mb-1">${user.displayName}</h6>
            <p class="user-bio text-muted mb-0">${user.bio || 'No bio available'}</p>
        </div>
        <button class="btn btn-outline-danger btn-sm view-profile-btn" onclick="viewProfile('${user.id}')">
            ${isOwnProfile ? 'Your Profile' : 'View Profile'}
        </button>
    `;
    
    return card;
}

/**
 * Navigate to user profile
 */
function viewProfile(userId) {
    if (currentUser && userId === currentUser.uid) {
        window.location.href = 'profile.html';
    } else {
        window.location.href = `profile.html?userId=${userId}`;
    }
}

/**
 * Show error message
 */
function showError(message) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
            <h4 class="text-muted">Error</h4>
            <p class="text-muted">${message}</p>
            <button class="btn btn-outline-danger" onclick="location.reload()">Try Again</button>
        </div>
    `;
}

// Make viewProfile function available globally
window.viewProfile = viewProfile;