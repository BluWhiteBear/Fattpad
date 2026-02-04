// Profile page functionality with Firebase integration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
    // Profile tabs - Bootstrap tabs are handled automatically, but we can add custom handlers if needed
    // The Bootstrap tab functionality is handled by data-bs-toggle="tab"
    
    // Edit profile button
    const editBtn = document.querySelector('.col .btn-outline-danger');
    if (editBtn) {
        console.log('Edit profile button found, adding event listener');
        editBtn.addEventListener('click', editProfile);
    } else {
        console.log('Edit profile button not found');
    }
    
    // New work button
    const newWorkBtn = document.querySelector('.btn.btn-danger');
    if (newWorkBtn) newWorkBtn.addEventListener('click', () => {
        window.location.href = '../pages/editor.html';
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
        
        // Update stats display using more specific selectors
        const statsContainer = document.querySelector('.col-12.col-lg-auto .row');
        if (statsContainer) {
            const statColumns = statsContainer.querySelectorAll('.col-3');
            if (statColumns.length >= 4) {
                // Works count (1st column)
                const worksCountElement = statColumns[0].querySelector('.h4');
                if (worksCountElement) worksCountElement.textContent = storiesSnapshot.size;
                
                // Reads count (4th column)
                const readsCountElement = statColumns[3].querySelector('.h4');
                if (readsCountElement) readsCountElement.textContent = formatNumber(totalReads);
            }
        }
        
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
        const worksTab = document.querySelector('#works');
        let worksGrid = null;
        
        if (worksTab) {
            worksGrid = worksTab.querySelector('.row.g-4');
        }
        
        // Clear existing content
        if (worksGrid) {
            worksGrid.innerHTML = '';
        }
        
        if (storiesSnapshot.empty) {
            if (worksGrid) {
                worksGrid.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-pen-nib text-muted display-1 mb-3"></i>
                        <h3 class="text-light mb-3">No works yet</h3>
                        <p class="text-muted mb-4">Start writing your first story!</p>
                        <button class="btn btn-danger" onclick="window.location.href='../pages/editor.html'">Create New Work</button>
                    </div>
                `;
            }
            return;
        }
        
        storiesSnapshot.forEach((doc) => {
            const story = doc.data();
            const workCard = createWorkCard(story, doc.id);
            if (worksGrid) {
                worksGrid.appendChild(workCard);
            }
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
    const cardColumn = document.createElement('div');
    cardColumn.className = 'col-12 col-md-6 col-lg-4 mb-4';
    cardColumn.setAttribute('data-dynamic', 'true'); // Mark as dynamically created
    
    const status = story.isPublished ? 'Published' : 'Draft';
    const statusClass = story.isPublished ? 'bg-success' : 'bg-warning';
    
    cardColumn.innerHTML = `
        <div class="card bg-dark border-0 h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title text-light">${story.title || 'Untitled'}</h5>
                    <span class="badge ${statusClass} text-dark">${status}</span>
                </div>
                <p class="card-text text-muted mb-3">${story.description || 'No description'}</p>
                <div class="d-flex gap-3 mb-3 small text-muted">
                    <span><i class="fas fa-eye text-info"></i> ${formatNumber(story.views || 0)}</span>
                    <span><i class="fas fa-heart text-danger"></i> ${formatNumber(story.likes || 0)}</span>
                    <span><i class="fas fa-book text-warning"></i> ${formatNumber(story.wordCount || 0)} words</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge bg-secondary">${getRatingLabel(story.contentRating)}</span>
                    <small class="text-muted">${formatDate(story.updatedAt)}</small>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-danger btn-sm" onclick="editWork('${storyId}')">Edit</button>
                    <button class="btn btn-outline-info btn-sm" onclick="viewWork('${storyId}')" ${!story.isPublished ? 'disabled' : ''}>View</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="deleteWork('${storyId}', '${story.title}')">Delete</button>
                </div>
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
    window.location.href = `pages/editor.html?id=${storyId}`;
};

window.viewWork = function(storyId) {
    window.location.href = `pages/story.html?id=${storyId}`;
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