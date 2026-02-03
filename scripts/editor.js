// Story Editor with Firebase Integration
let db = null;
let auth = null;
let currentStory = null;
let autoSaveTimer = null;
let hasUnsavedChanges = false;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Editor DOM loaded, starting initialization...');
    
    // Check if user is already logged in from existing auth system
    const existingUser = checkExistingAuth();
    console.log('Initial auth check result:', existingUser);
    
    await initializeFirebase();
    initializeEditor();
    loadStoryFromURL();
    
    // Additional check after a short delay in case elements load slowly
    setTimeout(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            console.log('Delayed auth check:', JSON.parse(userData));
            updateAuthUI(JSON.parse(userData));
        }
    }, 500);
});

// Check existing authentication state from other pages
function checkExistingAuth() {
    // Check if user data exists in localStorage from navAuth.js (uses 'user' key)
    const userData = localStorage.getItem('user');
    console.log('Editor checking existing auth:', { userData, parsed: userData ? JSON.parse(userData) : null });
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            updateAuthUI(user);
            console.log('Found existing user session:', user.name);
            return user;
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
    
    updateAuthUI(null);
    return null;
}

// Initialize Firebase
async function initializeFirebase() {
    try {
        await new Promise(resolve => {
            const checkFirebase = () => {
                if (window.firebaseModules) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
        
        const { initializeApp, getFirestore, getAuth } = window.firebaseModules;
        
        // Replace with your actual Firebase config
        const firebaseConfig = {
        apiKey: "AIzaSyA53SaCvEGgQmBkfc47twD3rmjbiegtBeo",
        authDomain: "fattpad-700c6.firebaseapp.com",
        projectId: "fattpad-700c6",
        storageBucket: "fattpad-700c6.firebasestorage.app",
        messagingSenderId: "766165381277",
        appId: "1:766165381277:web:79523e259dbd81c3702474",
        measurementId: "G-ELTHWYDTMH"
        };
        
        console.log('🔧 Firebase config loaded:', firebaseConfig.projectId);
        console.log('📋 Real Firebase project detected');
        
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        console.log('✅ Firebase app initialized');
        console.log('✅ Firestore initialized');  
        console.log('✅ Auth initialized');
        
        // Listen for auth state - but don't redirect immediately
        auth.onAuthStateChanged(user => {
            console.log('🔐 Firebase auth state changed:', user);
            if (user) {
                console.log('✅ Firebase user authenticated:', {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                });
                // User is signed in via Firebase
                updateAuthUI(user);
                // Also update localStorage to sync with navAuth.js
                localStorage.setItem('user', JSON.stringify({
                    name: user.displayName,
                    email: user.email,
                    picture: user.photoURL
                }));
            } else {
                console.log('❌ No Firebase user authenticated');
                // Check if user is logged in via existing system
                const userData = localStorage.getItem('user');
                if (userData) {
                    try {
                        const existingUser = JSON.parse(userData);
                        console.log('🔄 Using localStorage user instead:', existingUser.name);
                        updateAuthUI(existingUser);
                    } catch (error) {
                        console.log('❌ Error parsing localStorage user:', error);
                        updateAuthUI(null);
                    }
                } else {
                    console.log('❌ No user in localStorage either');
                    updateAuthUI(null);
                }
            }
        });
        
        console.log('🎉 Firebase initialized for editor');
        
        // Since Firebase is configured but user might not be signed in to Firebase,
        // let's also check and possibly sign them in automatically
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (localUser && !auth.currentUser) {
            console.log('💡 User logged in via Google OAuth but not Firebase auth');
            console.log('   Consider implementing automatic Firebase sign-in');
        }
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        showNotificationMessage('Firebase not configured - working in local mode', 'warning');
        // Don't redirect, just work in local mode
    }
}

// Initialize editor functionality
function initializeEditor() {
    const titleInput = document.getElementById('story-title');
    const contentTextarea = document.getElementById('story-content');
    const wordCountSpan = document.getElementById('word-count');
    const saveStatus = document.getElementById('save-status');
    const saveDraftBtn = document.getElementById('save-draft');
    const publishBtn = document.getElementById('publish-story');
    const ratingSelect = document.getElementById('content-rating-select');
    
    // Word count update
    function updateWordCount() {
        const content = contentTextarea.value;
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        wordCountSpan.textContent = wordCount;
    }
    
    // Track changes
    function markAsChanged() {
        hasUnsavedChanges = true;
        saveStatus.textContent = 'Unsaved';
        saveStatus.className = 'save-status draft';
        
        // Schedule auto-save
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(autoSave, 10000); // Auto-save after 10 seconds
    }
    
    // Event listeners
    titleInput.addEventListener('input', () => {
        updateWordCount();
        markAsChanged();
    });
    
    contentTextarea.addEventListener('input', () => {
        updateWordCount();
        markAsChanged();
    });
    
    saveDraftBtn.addEventListener('click', saveDraft);
    publishBtn.addEventListener('click', publishStory);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveDraft();
        }
    });
    
    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
    
    // Initial word count
    updateWordCount();
}

// Auto-save function
async function autoSave() {
    if (!hasUnsavedChanges || !auth?.currentUser) return;
    
    const saveStatus = document.getElementById('save-status');
    saveStatus.textContent = 'Saving...';
    saveStatus.className = 'save-status saving';
    
    try {
        await saveDraft(false); // Silent save
        saveStatus.textContent = 'Auto-saved';
        saveStatus.className = 'save-status saved';
        hasUnsavedChanges = false;
        
        setTimeout(() => {
            if (!hasUnsavedChanges) {
                saveStatus.textContent = 'Draft';
                saveStatus.className = 'save-status draft';
            }
        }, 2000);
    } catch (error) {
        console.error('Auto-save failed:', error);
        saveStatus.textContent = 'Save failed';
        saveStatus.className = 'save-status error';
    }
}

// Save draft
async function saveDraft(showNotification = true) {
    const title = document.getElementById('story-title').value || 'Untitled Story';
    const content = document.getElementById('story-content').value;
    const rating = document.getElementById('content-rating-select').value;
    
    // Always try localStorage first as fallback
    const localStoryId = saveToLocalStorage({ title, content, rating });
    
    // Check if user is logged in (either through Firebase or existing auth)
    const firebaseUser = auth?.currentUser;
    const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const isLoggedIn = firebaseUser || localStorageUser;
    
    if (!isLoggedIn) {
        if (showNotification) {
            showNotificationMessage('Saved locally (login to sync across devices)', 'info');
        }
        hasUnsavedChanges = false;
        return localStoryId;
    }
    
    // If we only have localStorage user and no Firebase, just save locally
    if (!firebaseUser || !db) {
        if (showNotification) {
            showNotificationMessage('Saved locally (Firebase not configured)', 'info');
        }
        hasUnsavedChanges = false;
        return localStoryId;
    }
    
    try {
        const { collection, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const storyId = currentStory?.id || generateStoryId();
        const userId = firebaseUser.uid;
        
        const storyData = {
            title,
            content,
            contentRating: rating,
            authorId: userId,
            authorName: firebaseUser.displayName || localStorageUser?.name || 'Anonymous',
            updatedAt: serverTimestamp(),
            wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
            isPublished: false,
            isDraft: true
        };
        
        if (!currentStory) {
            storyData.createdAt = serverTimestamp();
            storyData.id = storyId;
        }
        
        const storyRef = doc(db, 'users', userId, 'stories', storyId);
        await setDoc(storyRef, storyData, { merge: true });
        
        if (!currentStory) {
            currentStory = { id: storyId, ...storyData };
            // Update URL without page reload
            const url = new URL(window.location);
            url.searchParams.set('id', storyId);
            window.history.replaceState({}, '', url);
        }
        
        hasUnsavedChanges = false;
        
        if (showNotification) {
            showNotificationMessage('Draft saved successfully!', 'success');
        }
        
        return storyId;
    } catch (error) {
        console.error('Error saving draft:', error);
        if (showNotification) {
            showNotificationMessage('Failed to save draft', 'error');
        }
        throw error;
    }
}

// Publish story
async function publishStory() {
    // Check if user is logged in (either through Firebase or existing auth)
    const firebaseUser = auth?.currentUser;
    const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const isLoggedIn = firebaseUser || localStorageUser;
    
    if (!isLoggedIn) {
        showNotificationMessage('Please log in to publish stories', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Give user a choice between local and online publishing
    const publishChoice = await showPublishDialog();
    
    if (publishChoice === 'cancel') {
        return;
    } else if (publishChoice === 'local') {
        return await publishLocally();
    } else if (publishChoice === 'setup') {
        // Show Firebase setup instructions
        const openGuide = confirm(
            'Firebase setup required for online publishing.\n\n' +
            'Setup includes:\n' +
            '• Creating a Firebase project (free)\n' +
            '• Configuring authentication\n' +
            '• Setting up database\n\n' +
            'This takes about 5-10 minutes.\n\n' +
            'Click OK to open the setup guide, or Cancel to publish locally instead.'
        );
        
        if (openGuide) {
            // Open setup guide in new tab
            window.open('FIREBASE_SETUP.md', '_blank');
            showNotificationMessage('Setup guide opened in new tab. Follow the steps then try publishing again!', 'info');
        } else {
            return await publishLocally();
        }
        return;
    } else if (publishChoice === 'online') {
        // Firebase is ready, proceed with online publishing
        return await publishToFirebase();
    }
}

// Show publish dialog to let user choose
async function showPublishDialog() {
    return new Promise((resolve) => {
        const firebaseUser = auth?.currentUser;
        const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        const isFirebaseConfigured = checkFirebaseConfiguration();
        
        // Allow online publishing if user is authenticated via localStorage AND Firebase is configured
        const isOnlinePublishingReady = (firebaseUser || localStorageUser) && db && isFirebaseConfigured;
        
        console.log('🚀 Publish dialog - Firebase status:');
        console.log('   Firebase user:', firebaseUser?.email || 'none');
        console.log('   LocalStorage user:', localStorageUser?.name || 'none');
        console.log('   Database ready:', !!db);
        console.log('   Config valid:', isFirebaseConfigured);
        console.log('   Online publishing ready:', isOnlinePublishingReady);
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        dialog.innerHTML = `
            <div style="
                background: var(--bg-primary);
                border: 2px solid var(--accent-color);
                border-radius: 10px;
                padding: 30px;
                max-width: 500px;
                text-align: center;
                color: var(--text-primary);
                position: relative;
                z-index: 10001;
            ">
                <h3 style="margin-top: 0; color: var(--accent-color);">Choose Publishing Method</h3>
                
                <div style="margin: 20px 0; text-align: left;">
                    <div style="margin-bottom: 15px;">
                        <strong>📱 Local Publishing:</strong><br>
                        • Saves to this browser only<br>
                        • Works immediately<br>
                        • Perfect for testing
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong>🌐 Online Publishing:</strong><br>
                        • Syncs across all devices<br>
                        • Public discovery feed<br>
                        ${isOnlinePublishingReady ? '• Ready to use!' : '• Requires Firebase setup'}
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button type="button" data-action="local" style="
                        background: var(--bg-secondary);
                        color: var(--text-primary);
                        border: 1px solid var(--accent-color);
                        padding: 12px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                        min-width: 120px;
                        transition: all 0.2s ease;
                        z-index: 10002;
                        position: relative;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">📱 Publish Locally</button>
                    
                    <button type="button" data-action="${isOnlinePublishingReady ? 'online' : 'setup'}" style="
                        background: ${isOnlinePublishingReady ? 'var(--accent-color)' : '#666'};
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                        min-width: 120px;
                        transition: all 0.2s ease;
                        z-index: 10002;
                        position: relative;
                        ${!isOnlinePublishingReady ? 'opacity: 0.6;' : ''}
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">${isOnlinePublishingReady ? '🌐 Publish Online' : '⚙️ Setup Firebase'}</button>
                    
                    <button type="button" data-action="cancel" style="
                        background: transparent;
                        color: var(--text-secondary);
                        border: 1px solid var(--text-secondary);
                        padding: 12px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 14px;
                        min-width: 80px;
                        transition: all 0.2s ease;
                        z-index: 10002;
                        position: relative;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.backgroundColor='var(--bg-secondary)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.backgroundColor='transparent'">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners using event delegation
        dialog.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON') {
                const action = e.target.dataset.action;
                console.log('Button clicked with action:', action);
                
                // Remove dialog first
                document.body.removeChild(dialog);
                
                // Resolve with the action
                switch(action) {
                    case 'local':
                        resolve('local');
                        break;
                    case 'online':
                        if (isOnlinePublishingReady) {
                            resolve('online');
                        } else {
                            resolve('setup');
                        }
                        break;
                    case 'setup':
                        resolve('setup');
                        break;
                    case 'cancel':
                        resolve('cancel');
                        break;
                }
            }
        });
        
        // Click outside to close
        dialog.addEventListener('click', function(e) {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
                resolve('cancel');
            }
        });
        
        // Close on background click
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
                resolve('cancel');
            }
        };
    });
}

// Firebase publishing function
async function publishToFirebase() {
    const title = document.getElementById('story-title').value || 'Untitled Story';
    const content = document.getElementById('story-content').value;
    const rating = document.getElementById('content-rating-select').value;
    
    if (!title.trim() || !content.trim()) {
        showNotificationMessage('Please add a title and content before publishing', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to publish this story online? It will be visible to all users.')) {
        return;
    }
    
    const localStorageUser = JSON.parse(localStorage.getItem('user') || '{}');
    const storyId = generateStoryId();
    
    console.log('📝 Publishing story to Firebase...');
    console.log('   Story ID:', storyId);
    console.log('   Author:', localStorageUser.name || 'Anonymous');
    
    try {
        const { collection, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const storyData = {
            id: storyId,
            title: title.trim(),
            content: content.trim(),
            excerpt: content.substring(0, 200),
            contentRating: rating,
            authorName: localStorageUser.name || 'Anonymous Author',
            authorEmail: localStorageUser.email || 'anonymous@fattpad.local',
            authorPicture: localStorageUser.picture || null,
            publishedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            wordCount: content.trim().split(/\s+/).length,
            views: 0,
            likes: 0,
            isPublished: true,
            platform: 'Fattpad'
        };
        
        console.log('   Writing to stories collection:', storyData);
        
        // Write to the public stories collection
        const storyRef = doc(db, 'stories', storyId);
        await setDoc(storyRef, storyData);
        
        console.log('✅ Story published successfully to Firebase!');
        showNotificationMessage('Story published online successfully!', 'success');
        
        // Also save locally as backup
        await publishLocally();
        
        // Show success message with next steps
        setTimeout(() => {
            const viewOnline = confirm(
                `🎉 "${title}" is now published online!\n\n` +
                'Your story is live and discoverable by other readers.\n\n' +
                'Would you like to go to the home page to see your published story?'
            );
            
            if (viewOnline) {
                window.location.href = 'index.html';
            }
        }, 1000);
        
    } catch (error) {
        console.error('💥 Firebase publishing error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Failed to publish story online. ';
        
        if (error.code === 'permission-denied') {
            errorMessage += 'Database permissions issue detected.\n\nYour story has been saved locally instead.';
        } else if (error.code === 'unavailable') {
            errorMessage += 'Firebase service temporarily unavailable.\n\nYour story has been saved locally instead.';
        } else {
            errorMessage += `Technical error: ${error.message}\n\nYour story has been saved locally instead.`;
        }
        
        showNotificationMessage(errorMessage, 'error');
        
        // Fallback to local publishing
        await publishLocally();
    }
}

// Load story from URL parameter
async function loadStoryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const storyId = urlParams.get('id');
    
    if (!storyId) return;
    
    // Try Firebase first
    if (auth?.currentUser && db) {
        try {
            const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const userId = auth.currentUser.uid;
            const storyRef = doc(db, 'users', userId, 'stories', storyId);
            const storySnap = await getDoc(storyRef);
            
            if (storySnap.exists()) {
                const storyData = storySnap.data();
                currentStory = { id: storySnap.id, ...storyData };
                populateEditor(storyData);
                hasUnsavedChanges = false;
                return;
            }
        } catch (error) {
            console.error('Error loading story from Firebase:', error);
        }
    }
    
    // Fallback to localStorage
    const stories = JSON.parse(localStorage.getItem('fattpad_stories') || '[]');
    const localStory = stories.find(s => s.id === storyId);
    
    if (localStory) {
        currentStory = localStory;
        populateEditor(localStory);
        hasUnsavedChanges = false;
    }
}

function populateEditor(storyData) {
    // Populate form
    document.getElementById('story-title').value = storyData.title || '';
    document.getElementById('story-content').value = storyData.content || '';
    document.getElementById('content-rating-select').value = storyData.contentRating || 'E';
    
    // Update word count
    const wordCount = storyData.content ? storyData.content.trim().split(/\s+/).length : 0;
    document.getElementById('word-count').textContent = wordCount;
}

// Utility functions
function generateStoryId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function saveToLocalStorage(storyData) {
    const stories = JSON.parse(localStorage.getItem('fattpad_stories') || '[]');
    const storyId = currentStory?.id || generateStoryId();
    const existingIndex = stories.findIndex(s => s.id === storyId);
    
    const storyToSave = {
        id: storyId,
        ...storyData,
        updatedAt: Date.now(),
        wordCount: storyData.content ? storyData.content.trim().split(/\s+/).length : 0
    };
    
    if (existingIndex >= 0) {
        stories[existingIndex] = { ...stories[existingIndex], ...storyToSave };
    } else {
        storyToSave.createdAt = Date.now();
        stories.push(storyToSave);
        currentStory = storyToSave;
        
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('id', storyId);
        window.history.replaceState({}, '', url);
    }
    
    localStorage.setItem('fattpad_stories', JSON.stringify(stories));
    return storyId;
}

function updateAuthUI(user) {
    const publishBtn = document.getElementById('publish-story');
    const userStatus = document.getElementById('user-status');
    
    console.log('updateAuthUI called with:', user);
    
    if (user) {
        publishBtn.disabled = false;
        
        // Always show "Publish" - let the user choose when they click
        publishBtn.textContent = 'Publish';
        publishBtn.onclick = publishStory;
        
        // Update user status indicator
        if (userStatus) {
            const userName = user.name || user.displayName || user.email || 'User';
            userStatus.textContent = `Logged in as ${userName}`;
            userStatus.className = 'user-status logged-in';
        }
        
        console.log('User authenticated:', user.name || user.displayName);
    } else {
        publishBtn.disabled = true;
        publishBtn.textContent = 'Login to Publish';
        publishBtn.onclick = () => {
            window.location.href = 'login.html';
        };
        
        // Update user status indicator
        if (userStatus) {
            userStatus.textContent = 'Not logged in';
            userStatus.className = 'user-status logged-out';
        }
        
        console.log('No user authenticated');
    }
}

function showNotificationMessage(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Check if Firebase is configured with real values (not placeholders)
function checkFirebaseConfiguration() {
    try {
        console.log('Checking Firebase configuration...');
        console.log('Auth object:', auth);
        console.log('Database object:', db);
        
        if (!auth) {
            console.log('❌ Firebase auth is null');
            return false;
        }
        
        if (!db) {
            console.log('❌ Firebase database is null'); 
            return false;
        }
        
        if (!auth.app) {
            console.log('❌ Firebase auth.app is null');
            return false;
        }
        
        const apiKey = auth.app.options.apiKey;
        console.log('Firebase API Key:', apiKey);
        
        if (!apiKey || apiKey.includes('your-api-key-here')) {
            console.log('❌ Firebase not configured - using placeholder API key');
            return false;
        }
        
        console.log('✅ Firebase appears to be configured properly');
        return true;
    } catch (error) {
        console.log('❌ Error checking Firebase configuration:', error);
        return false;
    }
}

// Local publishing system for testing without Firebase
async function publishLocally() {
    const title = document.getElementById('story-title').value || 'Untitled Story';
    const content = document.getElementById('story-content').value;
    const rating = document.getElementById('content-rating-select').value;
    const localStorageUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!content.trim()) {
        showNotificationMessage('Please write some content before publishing', 'error');
        return;
    }
    
    // Save to localStorage as published story
    const storyId = currentStory?.id || generateStoryId();
    
    const publishedStory = {
        id: storyId,
        title,
        content,
        excerpt: content.substring(0, 200),
        contentRating: rating,
        authorName: localStorageUser.name || 'Anonymous',
        authorEmail: localStorageUser.email || '',
        publishedAt: Date.now(),
        updatedAt: Date.now(),
        wordCount: content.trim().split(/\s+/).length,
        views: 0,
        likes: 0,
        isPublished: true,
        isLocal: true // Flag to indicate this is a local story
    };
    
    // Save to published stories collection in localStorage
    const publishedStories = JSON.parse(localStorage.getItem('fattpad_published_stories') || '[]');
    const existingIndex = publishedStories.findIndex(s => s.id === storyId);
    
    if (existingIndex >= 0) {
        publishedStories[existingIndex] = publishedStory;
    } else {
        publishedStories.push(publishedStory);
    }
    
    localStorage.setItem('fattpad_published_stories', JSON.stringify(publishedStories));
    
    // Also update the user's story as published
    const userStories = JSON.parse(localStorage.getItem('fattpad_stories') || '[]');
    const userStoryIndex = userStories.findIndex(s => s.id === storyId);
    if (userStoryIndex >= 0) {
        userStories[userStoryIndex] = { ...userStories[userStoryIndex], ...publishedStory };
        localStorage.setItem('fattpad_stories', JSON.stringify(userStories));
    }
    
    showNotificationMessage('Story published locally! (Visible on this device only)', 'success');
    
    // Redirect to view the story
    setTimeout(() => {
        window.location.href = `story-local.html?id=${storyId}`;
    }, 2000);
}