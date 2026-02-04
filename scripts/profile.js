// Profile page functionality with Firebase integration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig } from '../config/firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let currentUserProfile = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    
    // Get user ID from URL parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    const profileUserId = urlParams.get('userId');
    
    // Wait for auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            
            if (profileUserId) {
                // Load specific user's profile (public view)
                console.log('🔍 Loading profile for user:', profileUserId);
                loadUserProfile(profileUserId, false); // false = not own profile
                loadUserWorks(profileUserId);
                loadUserStats(profileUserId);
            } else {
                // Load current user's own profile
                console.log('👤 Loading own profile');
                loadUserProfile(user.uid, true); // true = own profile
                loadUserWorks(user.uid);
                loadUserStats(user.uid);
                // Migrate any stories with local_user authorId
                migrateLocalUserStories(user.uid);
            }
        } else {
            if (profileUserId) {
                // Anonymous viewing of profile - redirect to login
                alert('Please log in to view profiles');
                window.location.href = 'login.html';
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'login.html';
            }
        }
    });
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Profile tabs - Bootstrap tabs are handled automatically, but we can add custom handlers if needed
    // The Bootstrap tab functionality is handled by data-bs-toggle="tab"
    
    // Edit profile button
    const editBtn = document.querySelector('.edit-profile-btn');
    if (editBtn) {
        console.log('Edit profile button found, adding event listener');
        editBtn.addEventListener('click', editProfile);
    } else {
        console.log('Edit profile button not found');
    }
    
    // New work button
    const newWorkBtn = document.querySelector('.btn.btn-danger');
    if (newWorkBtn) newWorkBtn.addEventListener('click', () => {
        window.location.href = 'editor.html';
    });
    
    // Edit avatar button
    const editAvatarBtn = document.querySelector('.btn.btn-danger.position-absolute');
    if (editAvatarBtn) editAvatarBtn.addEventListener('click', editAvatar);
}

/**
 * Switch between profile tabs (Bootstrap handles this automatically)
 * This function is kept for any custom tab switching logic if needed
 */
function switchTab(tabName) {
    // Bootstrap handles tab switching automatically with data-bs-toggle
    // Custom logic can be added here if needed
    
    // Get URL parameters to maintain context
    const urlParams = new URLSearchParams(window.location.search);
    const profileUserId = urlParams.get('userId');
    const isOwnProfile = !profileUserId || profileUserId === currentUser.uid;
    
    // Load tab-specific data
    if (tabName === 'works') {
        loadUserWorks(profileUserId || currentUser.uid, isOwnProfile);
    }
}

/**
 * Helper function to get current profile context
 */
function getCurrentProfileContext() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileUserId = urlParams.get('userId');
    return {
        userId: profileUserId || currentUser.uid,
        isOwnProfile: !profileUserId || (currentUser && profileUserId === currentUser.uid)
    };
}

/**
 * Load user profile from Firestore
 */
async function loadUserProfile(userId, isOwnProfile = true) {
    try {
        console.log('📱 Loading profile for user:', userId, 'isOwnProfile:', isOwnProfile);
        
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            currentUserProfile = userDoc.data();
            console.log('✅ Profile loaded:', currentUserProfile);
        } else if (isOwnProfile) {
            // Create profile if it doesn't exist (only for own profile)
            console.log('📝 Creating new user profile...');
            currentUserProfile = await createUserProfile(userId);
        } else {
            // Profile doesn't exist and it's not the current user's profile
            showError('Profile not found');
            return;
        }
        
        displayUserProfile(isOwnProfile);
        
        // Check follow status if viewing someone else's profile
        if (!isOwnProfile && currentUser) {
            await checkFollowStatus(userId);
        }
    } catch (error) {
        console.error('❌ Error loading user profile:', error);
        showError('Failed to load profile');
    }
}

/**
 * Create new user profile
 */
async function createUserProfile(userId) {
    try {
        const newProfile = {
            uid: userId,
            displayName: currentUser.displayName || 'Anonymous User',
            email: currentUser.email,
            photoURL: currentUser.photoURL || '',
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
        
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, newProfile);
        
        console.log('✅ User profile created');
        return newProfile;
        
    } catch (error) {
        console.error('❌ Error creating user profile:', error);
        throw error;
    }
}

/**
 * Display user profile information
 */
function displayUserProfile(isOwnProfile = true) {
    if (!currentUserProfile) return;
    
    // Update profile picture
    const profilePicture = document.getElementById('profile-picture');
    if (isOwnProfile) {
        // For own profile, check both profile and auth photoURL
        profilePicture.src = currentUserProfile.photoURL || currentUser.photoURL || 'img/pfp-default.png';
    } else {
        // For other users' profiles, only check their profile photoURL
        profilePicture.src = currentUserProfile.photoURL || 'img/pfp-default.png';
    }
    profilePicture.alt = currentUserProfile.displayName;
    
    // Update profile info
    document.getElementById('profile-name').textContent = currentUserProfile.displayName;
    document.getElementById('profile-email').textContent = currentUserProfile.email;
    document.getElementById('profile-bio').textContent = currentUserProfile.bio || (isOwnProfile ? 'No bio yet. Click Edit Profile to add one!' : 'This user hasn\'t written a bio yet.');
    
    // Show/hide edit controls based on whether it's the user's own profile
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const followBtn = document.querySelector('.follow-btn');
    const editAvatarBtn = document.querySelector('.btn.btn-danger.position-absolute');
    const newWorkBtn = document.querySelector('.btn.btn-danger');
    
    if (editProfileBtn) {
        editProfileBtn.style.display = isOwnProfile ? 'inline-block' : 'none';
    }
    if (followBtn) {
        followBtn.style.display = isOwnProfile ? 'none' : 'inline-block';
        if (!isOwnProfile) {
            followBtn.addEventListener('click', () => toggleFollow(currentUserProfile.uid));
        }
    }
    if (editAvatarBtn) {
        editAvatarBtn.style.display = isOwnProfile ? 'flex' : 'none';
    }
    if (newWorkBtn) {
        newWorkBtn.style.display = isOwnProfile ? 'inline-block' : 'none';
    }
    
    // Update page title
    const title = isOwnProfile ? 'My Profile - Fattpad' : `${currentUserProfile.displayName} - Fattpad`;
    document.title = title;
}

/**
 * Load and display user statistics
 */
async function loadUserStats(userId = null) {
    try {
        const targetUserId = userId || currentUser.uid;
        
        // Get user profile to access followers/following stats
        const userDocRef = doc(db, 'users', targetUserId);
        const userDoc = await getDoc(userDocRef);
        const userStats = userDoc.exists() ? userDoc.data().stats : {};
        
        // Get user's published stories count and stats
        const storiesRef = collection(db, 'stories');
        const userStoriesQuery = query(
            storiesRef, 
            where('authorId', '==', targetUserId),
            where('isPublished', '==', true)
        );
        
        const storiesSnapshot = await getDocs(userStoriesQuery);
        let totalReads = 0;
        let totalLikes = 0;
        
        storiesSnapshot.forEach((doc) => {
            const story = doc.data();
            totalReads += story.views || 0;
            totalLikes += story.likes || 0;
        });
        
        // Update stats display using more specific selectors
        const statsContainer = document.querySelector('.col-12.col-lg-auto .row');
        if (statsContainer) {
            const statColumns = statsContainer.querySelectorAll('.col-3');
            if (statColumns.length >= 4) {
                // Works count (1st column)
                const worksCountElement = statColumns[0].querySelector('.h4');
                if (worksCountElement) worksCountElement.textContent = storiesSnapshot.size;
                
                // Followers count (2nd column)
                const followersCountElement = statColumns[1].querySelector('.h4');
                if (followersCountElement) followersCountElement.textContent = formatNumber(userStats.followers || 0);
                
                // Following count (3rd column)
                const followingCountElement = statColumns[2].querySelector('.h4');
                if (followingCountElement) followingCountElement.textContent = formatNumber(userStats.following || 0);
                
                // Reads count (4th column)
                const readsCountElement = statColumns[3].querySelector('.h4');
                if (readsCountElement) readsCountElement.textContent = formatNumber(totalReads);
            }
        }
        
        // Re-setup stat links after stats are updated
        setupStatLinks();
        
        // Update stats in profile document
        if (currentUserProfile) {
            currentUserProfile.stats = {
                ...currentUserProfile.stats,
                worksCount: storiesSnapshot.size,
                totalReads: totalReads,
                totalLikes: totalLikes
            };
            
            // Update Firestore document
            await updateDoc(doc(db, 'users', currentUser.uid), {
                'stats.worksCount': storiesSnapshot.size,
                'stats.totalReads': totalReads,
                'stats.totalLikes': totalLikes
            });
        }
        
    } catch (error) {
        console.error('❌ Error loading user stats:', error);
    }
}

/**
 * Load and display user's works
 */
async function loadUserWorks(userId = null, isOwnProfile = true) {
    try {
        const targetUserId = userId || currentUser.uid;
        console.log('📚 Loading user works for:', targetUserId, 'isOwnProfile:', isOwnProfile);
        
        // Load published/unpublished stories from Firebase
        const storiesRef = collection(db, 'stories');
        const userStoriesQuery = query(
            storiesRef,
            where('authorId', '==', targetUserId),
            // Only show published stories for other users' profiles
            ...(isOwnProfile ? [] : [where('isPublished', '==', true)]),
            orderBy('updatedAt', 'desc')
        );
        
        const storiesSnapshot = await getDocs(userStoriesQuery);
        const worksTab = document.querySelector('#works');
        let worksGrid = null;
        
        if (worksTab) {
            worksGrid = worksTab.querySelector('.row.g-4');
        }
        
        // Clear existing content
        if (worksGrid) {
            worksGrid.innerHTML = '';
        }

        // Collect all works (Firebase + local drafts for own profile)
        const allWorks = [];
        
        // Add Firebase stories
        storiesSnapshot.forEach((doc) => {
            const story = doc.data();
            allWorks.push({
                id: doc.id,
                data: story,
                source: 'firebase'
            });
        });
        
        // Add local drafts if viewing own profile
        if (isOwnProfile && currentUser) {
            const localDrafts = loadLocalDrafts();
            localDrafts.forEach(draft => {
                allWorks.push({
                    id: draft.id,
                    data: draft,
                    source: 'local'
                });
            });
        }
        
        // Sort all works by updated date (most recent first)
        allWorks.sort((a, b) => {
            const dateA = a.data.updatedAt?.toDate?.() || new Date(a.data.updatedAt || 0);
            const dateB = b.data.updatedAt?.toDate?.() || new Date(b.data.updatedAt || 0);
            return dateB - dateA;
        });
        
        if (allWorks.length === 0) {
            if (worksGrid) {
                worksGrid.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-pen-nib text-muted display-1 mb-3"></i>
                        <h3 class="text-light mb-3">No works yet</h3>
                        <p class="text-muted mb-4">Start writing your first story!</p>
                        <button class="btn btn-danger" onclick="window.location.href='editor.html'">Create New Work</button>
                    </div>
                `;
            }
            return;
        }

        // Create work cards
        allWorks.forEach(work => {
            const workCard = createWorkCard(work.data, work.id, isOwnProfile, work.source);
            if (worksGrid) {
                worksGrid.appendChild(workCard);
            }
        });
        
        console.log(`✅ Loaded ${allWorks.length} works (${storiesSnapshot.size} Firebase + ${allWorks.length - storiesSnapshot.size} local)`);
        
    } catch (error) {
        console.error('❌ Error loading user works:', error);
    }
}

/**
 * Load local drafts from localStorage
 */
function loadLocalDrafts() {
    try {
        const localStories = JSON.parse(localStorage.getItem('fattpad_stories') || '[]');
        return localStories.filter(story => story && story.title); // Only include stories with titles
    } catch (error) {
        console.error('❌ Error loading local drafts:', error);
        return [];
    }
}

/**
 * Create a work card element
 */
function createWorkCard(story, storyId, isOwnProfile = true, source = 'firebase') {
    const cardColumn = document.createElement('div');
    cardColumn.className = 'col-12 col-md-6 col-lg-4 mb-4';
    cardColumn.setAttribute('data-dynamic', 'true'); // Mark as dynamically created
    
    // Determine status and styling based on source and published state
    let status, statusClass, viewFunction;
    
    if (source === 'local') {
        status = 'Local Draft';
        statusClass = 'bg-info';
        viewFunction = `viewLocalWork('${storyId}')`;
    } else {
        status = story.isPublished ? 'Published' : 'Draft';
        statusClass = story.isPublished ? 'bg-success' : 'bg-warning';
        viewFunction = `viewWork('${storyId}')`;
    }
    
    // Action buttons - different for own profile vs others
    const actionButtons = isOwnProfile ? `
        <div class="d-flex gap-2">
            <button class="btn btn-outline-danger btn-sm" onclick="${source === 'local' ? `editLocalWork('${storyId}')` : `editWork('${storyId}')`}">Edit</button>
            <button class="btn btn-outline-info btn-sm" onclick="${viewFunction}" ${(!story.isPublished && source !== 'local') ? 'disabled' : ''}>View</button>
            <button class="btn btn-outline-secondary btn-sm" onclick="${source === 'local' ? `deleteLocalWork('${storyId}', '${story.title}')` : `deleteWork('${storyId}', '${story.title}')`}">Delete</button>
        </div>
    ` : `
        <div class="d-flex gap-2">
            <button class="btn btn-outline-info btn-sm" onclick="viewWork('${storyId}')">Read Story</button>
        </div>
    `;
    
    cardColumn.innerHTML = `
        <div class="card bg-dark border-0 h-100 ${source === 'local' ? 'border-info' : ''}" style="${source === 'local' ? 'border: 1px solid #17a2b8 !important;' : ''}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title text-light">${story.title || 'Untitled'}</h5>
                    ${isOwnProfile ? `<span class="badge ${statusClass} text-dark">${status}</span>` : ''}
                </div>
                <p class="card-text text-muted mb-3">${story.description || 'No description'}</p>
                <div class="d-flex gap-3 mb-3 small text-muted">
                    <span><i class="fas fa-eye text-info"></i> ${formatNumber(story.views || 0)}</span>
                    <span><img src="img/bite_1.svg" alt="Bites" class="bite-icon-secondary" style="width: 14px; height: 14px; vertical-align: text-bottom;"> ${formatNumber(story.likes || 0)}</span>
                    <span><i class="fas fa-book text-warning"></i> ${formatNumber(story.wordCount || 0)} words</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge bg-secondary">${getRatingLabel(story.contentRating)}</span>
                    <small class="text-muted">${formatDate(story.updatedAt)}</small>
                </div>
                ${actionButtons}
            </div>
        </div>
    `;
    
    return cardColumn;
}

/**
 * Edit profile functionality
 */
function editProfile() {
    console.log('editProfile function called');
    const bio = currentUserProfile?.bio || '';
    const displayName = currentUserProfile?.displayName || '';
    
    console.log('Creating modal with bio:', bio, 'displayName:', displayName);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Profile</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                <div class="form-group">
                    <label for="edit-display-name">Display Name:</label>
                    <input type="text" id="edit-display-name" value="${displayName}" maxlength="50">
                </div>
                <div class="form-group">
                    <label for="edit-bio">Bio:</label>
                    <textarea id="edit-bio" rows="4" maxlength="500" placeholder="Tell us about yourself...">${bio}</textarea>
                    <div class="char-counter"><span id="bio-counter">${bio.length}</span>/500</div>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn secondary" id="cancel-edit">Cancel</button>
                <button class="btn primary" id="save-profile">Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Modal appended to body:', modal);
    
    // Event listeners for modal
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-edit').addEventListener('click', () => modal.remove());
    modal.querySelector('#save-profile').addEventListener('click', saveProfileChanges);
    
    // Bio character counter
    const bioTextarea = modal.querySelector('#edit-bio');
    const bioCounter = modal.querySelector('#bio-counter');
    bioTextarea.addEventListener('input', () => {
        bioCounter.textContent = bioTextarea.value.length;
    });
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Save profile changes
 */
async function saveProfileChanges() {
    try {
        const displayName = document.getElementById('edit-display-name').value.trim();
        const bio = document.getElementById('edit-bio').value.trim();
        
        if (!displayName) {
            showError('Display name is required');
            return;
        }
        
        // Update Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            displayName: displayName,
            bio: bio,
            updatedAt: new Date()
        });
        
        // Update local profile
        currentUserProfile.displayName = displayName;
        currentUserProfile.bio = bio;
        
        // Refresh display
        displayUserProfile();
        
        // Close modal
        document.querySelector('.modal-overlay').remove();
        
        showSuccess('Profile updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showError('Failed to update profile');
    }
}

/**
 * Edit avatar functionality
 */
function editAvatar() {
    // For now, just show an alert - can be enhanced later
    alert('Avatar editing feature coming soon!');
}

/**
 * Global functions for work actions
 */
window.editWork = function(storyId) {
    window.location.href = `editor.html?id=${storyId}`;
};

window.viewWork = function(storyId) {
    window.location.href = `story.html?id=${storyId}`;
};

window.deleteWork = function(storyId, title) {
    if (confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
        // TODO: Implement delete functionality
        alert('Delete functionality coming soon!');
    }
};

/**
 * Utility functions
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(date) {
    if (!date) return 'Unknown';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getRatingLabel(rating) {
    const ratings = {
        'E': 'Everyone',
        'T': 'Teen',
        'M': 'Mature',
        'A': 'Adult'
    };
    return ratings[rating] || 'Everyone';
}

function showError(message) {
    // TODO: Implement proper notification system
    alert('Error: ' + message);
}

function showSuccess(message) {
    // TODO: Implement proper notification system
    alert(message);
}

/**
 * Migrate stories with local_user authorId to current user
 */
async function migrateLocalUserStories(userId) {
    try {
        console.log('🔄 Checking for stories to migrate...');
        
        const storiesRef = collection(db, 'stories');
        const localStoriesQuery = query(storiesRef, where('authorId', '==', 'local_user'));
        const localStoriesSnapshot = await getDocs(localStoriesQuery);
        
        if (localStoriesSnapshot.empty) {
            console.log('✅ No stories to migrate');
            return;
        }
        
        console.log(`🔄 Found ${localStoriesSnapshot.size} stories to migrate`);
        
        // Update each story
        const updatePromises = localStoriesSnapshot.docs.map(async (storyDoc) => {
            await updateDoc(doc(db, 'stories', storyDoc.id), {
                authorId: userId,
                updatedAt: new Date()
            });
            console.log(`✅ Migrated story: ${storyDoc.data().title}`);
        });
        
        await Promise.all(updatePromises);
        console.log(`✅ Successfully migrated ${localStoriesSnapshot.size} stories`);
        
    } catch (error) {
        console.error('❌ Error migrating stories:', error);
    }
}

/**
 * Set up event listeners for clickable stats
 */
function setupStatLinks() {
    const statLinks = document.querySelectorAll('.stat-link');
    
    statLinks.forEach(link => {
        // Remove any existing listeners to prevent duplicates
        link.replaceWith(link.cloneNode(true));
    });
    
    // Re-query after cloning
    const newStatLinks = document.querySelectorAll('.stat-link');
    
    newStatLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const statType = link.getAttribute('data-stat');
            const urlParams = new URLSearchParams(window.location.search);
            const profileUserId = urlParams.get('userId') || currentUser?.uid;
            
            console.log('Stat link clicked:', { statType, profileUserId, currentUser: currentUser?.uid });
            
            if (!profileUserId) {
                console.error('No profileUserId found');
                return;
            }
            
            if (statType === 'followers') {
                console.log('Navigating to followers page');
                window.location.href = `followers.html?userId=${profileUserId}`;
            } else if (statType === 'following') {
                console.log('Navigating to following page');
                window.location.href = `following.html?userId=${profileUserId}`;
            }
        });
    });
}

/**
 * Create a notification for a user
 */
async function createNotification(userId, type, data) {
    try {
        const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notificationRef = doc(db, 'notifications', notificationId);
        
        const notification = {
            id: notificationId,
            userId: userId, // User who will receive the notification
            type: type, // 'follow', 'like', 'comment', etc.
            data: data, // Additional data specific to notification type
            read: false,
            createdAt: new Date()
        };
        
        await setDoc(notificationRef, notification);
        console.log('✅ Notification created:', notification);
        
    } catch (error) {
        console.error('❌ Error creating notification:', error);
    }
}

/**
 * Check if current user is following the profile user
 */
async function checkFollowStatus(targetUserId) {
    if (!currentUser || !targetUserId) return;
    
    try {
        const followDocId = `${currentUser.uid}_${targetUserId}`;
        const followDocRef = doc(db, 'follows', followDocId);
        const followDoc = await getDoc(followDocRef);
        
        const followBtn = document.querySelector('.follow-btn');
        if (followBtn) {
            if (followDoc.exists()) {
                // User is following
                followBtn.innerHTML = '<i class="fas fa-check"></i> Following';
                followBtn.classList.add('following');
            } else {
                // User is not following
                followBtn.innerHTML = '<i class="fas fa-plus"></i> Follow';
                followBtn.classList.remove('following');
            }
        }
        
    } catch (error) {
        console.error('❌ Error checking follow status:', error);
    }
}

/**
 * Toggle follow/unfollow for a user
 */
async function toggleFollow(targetUserId) {
    if (!currentUser || !targetUserId) return;
    
    const followBtn = document.querySelector('.follow-btn');
    if (!followBtn) return;
    
    try {
        const followDocId = `${currentUser.uid}_${targetUserId}`;
        const followDocRef = doc(db, 'follows', followDocId);
        const followDoc = await getDoc(followDocRef);
        
        const isCurrentlyFollowing = followDoc.exists();
        
        // Disable button during operation
        followBtn.disabled = true;
        followBtn.style.opacity = '0.6';
        
        if (isCurrentlyFollowing) {
            // Unfollow: Remove the follow document
            await deleteDoc(followDocRef);
            
            // Update both users' stats
            await Promise.all([
                // Decrease follower's following count
                updateDoc(doc(db, 'users', currentUser.uid), {
                    'stats.following': increment(-1),
                    updatedAt: new Date()
                }),
                // Decrease target user's followers count
                updateDoc(doc(db, 'users', targetUserId), {
                    'stats.followers': increment(-1),
                    updatedAt: new Date()
                })
            ]);
            
            // Update UI
            followBtn.innerHTML = '<i class="fas fa-plus"></i> Follow';
            followBtn.classList.remove('following');
            console.log(`✅ Unfollowed user: ${targetUserId}`);
            
        } else {
            // Follow: Create the follow document
            await setDoc(followDocRef, {
                followerId: currentUser.uid,
                followingId: targetUserId,
                createdAt: new Date()
            });
            
            // Create notification for the user being followed
            await createNotification(targetUserId, 'follow', {
                followerId: currentUser.uid,
                followerName: currentUser.displayName || currentUser.email || 'Someone',
                followerPhotoURL: currentUser.photoURL || null
            });
            
            // Update both users' stats
            await Promise.all([
                // Increase follower's following count
                updateDoc(doc(db, 'users', currentUser.uid), {
                    'stats.following': increment(1),
                    updatedAt: new Date()
                }),
                // Increase target user's followers count
                updateDoc(doc(db, 'users', targetUserId), {
                    'stats.followers': increment(1),
                    updatedAt: new Date()
                })
            ]);
            
            // Update UI
            followBtn.innerHTML = '<i class="fas fa-check"></i> Following';
            followBtn.classList.add('following');
            console.log(`✅ Followed user: ${targetUserId}`);
        }
        
        // Re-enable button
        followBtn.disabled = false;
        followBtn.style.opacity = '1';
        
        // Refresh stats display
        loadUserStats(targetUserId);
        
    } catch (error) {
        console.error('❌ Error toggling follow:', error);
        
        // Re-enable button on error
        if (followBtn) {
            followBtn.disabled = false;
            followBtn.style.opacity = '1';
        }
        
        // Show error message
        showError('Failed to update follow status. Please try again.');
    }
}

/**
 * Local work management functions
 */
function viewLocalWork(storyId) {
    window.location.href = `story.html?id=${storyId}`;
}

function editLocalWork(storyId) {
    window.location.href = `editor.html?id=${storyId}`;
}

function deleteLocalWork(storyId, storyTitle) {
    if (confirm(`Are you sure you want to delete "${storyTitle}"? This action cannot be undone.`)) {
        try {
            const stories = JSON.parse(localStorage.getItem('fattpad_stories') || '[]');
            const updatedStories = stories.filter(story => story.id !== storyId);
            localStorage.setItem('fattpad_stories', JSON.stringify(updatedStories));
            
            // Refresh the works display
            const urlParams = new URLSearchParams(window.location.search);
            const profileUserId = urlParams.get('userId');
            const isOwnProfile = !profileUserId || (currentUser && profileUserId === currentUser.uid);
            
            if (isOwnProfile) {
                loadUserWorks(currentUser?.uid, true);
            }
            
            console.log(`✅ Deleted local story: ${storyTitle}`);
        } catch (error) {
            console.error('❌ Error deleting local story:', error);
            alert('Failed to delete story. Please try again.');
        }
    }
}

// Make functions available globally
window.viewLocalWork = viewLocalWork;
window.editLocalWork = editLocalWork;
window.deleteLocalWork = deleteLocalWork;