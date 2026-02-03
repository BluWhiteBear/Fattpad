// Profile page functionality with Firebase integration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig } from '../firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let currentUserProfile = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    
    // Wait for auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserProfile(user.uid);
            // Migrate any stories with local_user authorId
            migrateLocalUserStories(user.uid);
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Profile tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Edit profile button
    document.querySelector('.edit-profile-btn').addEventListener('click', editProfile);
    
    // New work button
    document.querySelector('.new-work-btn').addEventListener('click', () => {
        window.location.href = 'editor.html';
    });
    
    // Edit avatar button
    document.querySelector('.edit-avatar-btn').addEventListener('click', editAvatar);
}

/**
 * Switch between profile tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Load tab-specific data
    if (tabName === 'works') {
        loadUserWorks();
    }
}

/**
 * Load user profile from Firestore
 */
async function loadUserProfile(userId) {
    try {
        console.log('📱 Loading profile for user:', userId);
        
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            currentUserProfile = userDoc.data();
            console.log('✅ Profile loaded:', currentUserProfile);
        } else {
            // Create profile if it doesn't exist
            console.log('📝 Creating new user profile...');
            currentUserProfile = await createUserProfile(userId);
        }
        
        displayUserProfile();
        loadUserStats();
        loadUserWorks();
        
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
function displayUserProfile() {
    if (!currentUserProfile) return;
    
    // Update profile picture
    const profilePicture = document.getElementById('profile-picture');
    profilePicture.src = currentUserProfile.photoURL || currentUser.photoURL || '/img/default-avatar.png';
    profilePicture.alt = currentUserProfile.displayName;
    
    // Update profile info
    document.getElementById('profile-name').textContent = currentUserProfile.displayName;
    document.getElementById('profile-email').textContent = currentUserProfile.email;
    document.getElementById('profile-bio').textContent = currentUserProfile.bio || 'No bio yet. Click Edit Profile to add one!';
    
    // Update page title
    document.title = `${currentUserProfile.displayName} - Fattpad`;
}

/**
 * Load and display user statistics
 */
async function loadUserStats() {
    try {
        // Get user's published stories count and stats
        const storiesRef = collection(db, 'stories');
        const userStoriesQuery = query(
            storiesRef, 
            where('authorId', '==', currentUser.uid),
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
        
        // Update stats display
        document.querySelector('.stat-item:nth-child(1) .stat-number').textContent = storiesSnapshot.size;
        document.querySelector('.stat-item:nth-child(4) .stat-number').textContent = formatNumber(totalReads);
        
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
async function loadUserWorks() {
    try {
        console.log('📚 Loading user works...');
        
        const storiesRef = collection(db, 'stories');
        const userStoriesQuery = query(
            storiesRef,
            where('authorId', '==', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );
        
        const storiesSnapshot = await getDocs(userStoriesQuery);
        const worksGrid = document.querySelector('#works .works-grid');
        
        // Clear existing content
        worksGrid.innerHTML = '';
        
        if (storiesSnapshot.empty) {
            worksGrid.innerHTML = `
                <div class="no-works">
                    <i class="fas fa-pen-nib"></i>
                    <h3>No works yet</h3>
                    <p>Start writing your first story!</p>
                    <button class="btn primary" onclick="window.location.href='editor.html'">Create New Work</button>
                </div>
            `;
            return;
        }
        
        storiesSnapshot.forEach((doc) => {
            const story = doc.data();
            const workCard = createWorkCard(story, doc.id);
            worksGrid.appendChild(workCard);
        });
        
        console.log(`✅ Loaded ${storiesSnapshot.size} works`);
        
    } catch (error) {
        console.error('❌ Error loading user works:', error);
    }
}

/**
 * Create a work card element
 */
function createWorkCard(story, storyId) {
    const card = document.createElement('div');
    card.className = 'profile-work-card';
    
    const status = story.isPublished ? 'Published' : 'Draft';
    const statusClass = story.isPublished ? 'published' : 'draft';
    
    card.innerHTML = `
        <div class="work-header">
            <h3>${story.title || 'Untitled'}</h3>
            <span class="work-status ${statusClass}">${status}</span>
        </div>
        <p class="work-description">${story.description || 'No description'}</p>
        <div class="work-stats">
            <span><i class="fas fa-eye"></i> ${formatNumber(story.views || 0)}</span>
            <span><i class="fas fa-heart"></i> ${formatNumber(story.likes || 0)}</span>
            <span><i class="fas fa-book"></i> ${formatNumber(story.wordCount || 0)} words</span>
        </div>
        <div class="work-meta">
            <span class="work-rating">${getRatingLabel(story.contentRating)}</span>
            <span class="work-date">${formatDate(story.updatedAt)}</span>
        </div>
        <div class="work-actions">
            <button class="edit-work" onclick="editWork('${storyId}')">Edit</button>
            <button class="view-work" onclick="viewWork('${storyId}')" ${!story.isPublished ? 'disabled' : ''}>View</button>
            <button class="delete-work" onclick="deleteWork('${storyId}', '${story.title}')">Delete</button>
        </div>
    `;
    
    return card;
}

/**
 * Edit profile functionality
 */
function editProfile() {
    const bio = currentUserProfile?.bio || '';
    const displayName = currentUserProfile?.displayName || '';
    
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