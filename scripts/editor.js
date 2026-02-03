// Story Editor with Firebase Integration
let db = null;
let auth = null;
let currentStory = null;
let autoSaveTimer = null;
let hasUnsavedChanges = false;
let tinymceEditor = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Editor DOM loaded, starting initialization...');
    
    // Check if user is already logged in from existing auth system
    const existingUser = checkExistingAuth();
    console.log('Initial auth check result:', existingUser);
    
    await initializeFirebase();
    await initializeTinyMCE();
    initializeEditor();
    loadStoryFromURL();
    
    // Additional check after a short delay in case elements load slowly
    setTimeout(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            console.log('🔄 Delayed auth check:', JSON.parse(userData));
            updateAuthUI(JSON.parse(userData));
        }
    }, 500);
    
    // Periodic auth state check to catch changes from other tabs
    setInterval(() => {
        const userData = localStorage.getItem('user');
        const currentButtonText = document.getElementById('publish-story')?.textContent;
        
        if (userData && currentButtonText === 'Login to Publish') {
            console.log('🔄 Detected auth state mismatch, updating UI');
            updateAuthUI(JSON.parse(userData));
        }
    }, 2000);
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

// Initialize TinyMCE Rich Text Editor
async function initializeTinyMCE() {
    return new Promise((resolve) => {
        tinymce.init({
            selector: '#story-content',
            height: 400,
            min_height: 300,
            max_height: 600,
            resize: 'both',
            menubar: false,
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | ' +
                'bold italic underline strikethrough | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat | help',
            content_style: `
                body { 
                    font-family: Georgia, serif; 
                    font-size: 16px; 
                    line-height: 1.7; 
                    color: #333; 
                    background-color: var(--bg-secondary, #fff);
                    padding: 20px;
                }
                p { margin: 0 0 1.2em 0; }
                h1, h2, h3, h4, h5, h6 { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                    margin: 1.5em 0 0.5em 0; 
                }
            `,
            skin: 'oxide',
            content_css: false,
            branding: false,
            resize: false,
            statusbar: false,
            setup: function(editor) {
                editor.on('init', function() {
                    tinymceEditor = editor;
                    resolve();
                });
                
                editor.on('input change', function() {
                    updateWordCount();
                    markAsChanged();
                });
            }
        });
    });
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
        
        // Automatically sign in to Firebase if user is logged in via Google OAuth
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (localUser && !auth.currentUser) {
            console.log('💡 User logged in via Google OAuth but not Firebase auth');
            console.log('🔄 Attempting automatic Firebase sign-in...');
            
            try {
                // Import Firebase auth methods
                const { GoogleAuthProvider, signInWithCredential } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                
                // If we have a Google OAuth token, try to sign in to Firebase
                if (localUser.access_token) {
                    const credential = GoogleAuthProvider.credential(null, localUser.access_token);
                    const result = await signInWithCredential(auth, credential);
                    console.log('✅ Automatic Firebase sign-in successful:', result.user.email);
                    showNotificationMessage('Connected to online publishing!', 'success');
                } else {
                    console.log('❌ No access token available for automatic sign-in');
                    // Sign in user with custom token or email if available
                    if (localUser.email) {
                        console.log('📧 User email available, manual sign-in required for full online access');
                    }
                }
            } catch (autoSignInError) {
                console.log('❌ Automatic Firebase sign-in failed:', autoSignInError.message);
                console.log('   User can still use local features and manual sign-in');
            }
        }
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        showNotificationMessage('Firebase not configured - working in local mode', 'warning');
        // Don't redirect, just work in local mode
    }
}

// Track changes - global function
function markAsChanged() {
    hasUnsavedChanges = true;
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
        saveStatus.textContent = 'Unsaved';
        saveStatus.className = 'save-status draft';
    }
    
    // Schedule auto-save
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(autoSave, 10000); // Auto-save after 10 seconds
}

// Word count update - global function for TinyMCE access
function updateWordCount() {
    const wordCountSpan = document.getElementById('word-count');
    if (!wordCountSpan) return;
    
    let content = '';
    if (tinymceEditor) {
        // Get plain text content from TinyMCE
        content = tinymceEditor.getContent({format: 'text'});
    } else {
        // Fallback to textarea if TinyMCE not ready
        const contentTextarea = document.getElementById('story-content');
        content = contentTextarea ? contentTextarea.value : '';
    }
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    wordCountSpan.textContent = wordCount;
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
    
    // Event listeners
    titleInput.addEventListener('input', () => {
        updateWordCount();
        markAsChanged();
    });
    
    // TinyMCE handles its own events, but we need a fallback for the textarea
    contentTextarea.addEventListener('input', () => {
        if (!tinymceEditor) {
            updateWordCount();
            markAsChanged();
        }
    });

    saveDraftBtn.addEventListener('click', saveDraft);
    publishBtn.addEventListener('click', publishStory);
    
    // Initialize new metadata fields
    initializeMetadataFields();
    
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

// Initialize metadata fields functionality
function initializeMetadataFields() {
    const genresInput = document.getElementById('story-genres');
    const coverUrlInput = document.getElementById('cover-url');
    const coverPreview = document.getElementById('cover-preview');
    const descriptionInput = document.getElementById('story-description');
    const descriptionCounter = document.getElementById('description-counter');
    
    // Description character counter
    if (descriptionInput && descriptionCounter) {
        const updateCounter = () => {
            const length = descriptionInput.value.length;
            const maxLength = 500;
            descriptionCounter.textContent = `${length}/${maxLength}`;
            descriptionCounter.style.color = length > maxLength * 0.9 ? '#f44336' : 'var(--text-secondary)';
        };
        
        descriptionInput.addEventListener('input', () => {
            updateCounter();
            markAsChanged();
        });
        
        // Initialize counter
        updateCounter();
    }
    
    // Genres handling
    if (genresInput) {
        genresInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(genresInput.value.trim());
                genresInput.value = '';
            }
        });
        
        genresInput.addEventListener('blur', () => {
            if (genresInput.value.trim()) {
                addTag(genresInput.value.trim());
                genresInput.value = '';
            }
        });
        
        genresInput.addEventListener('input', markAsChanged);
    }
    
    // Cover URL preview - click to add/change
    if (coverPreview) {
        coverPreview.style.cursor = 'pointer';
        coverPreview.addEventListener('click', () => {
            const currentUrl = coverUrlInput ? coverUrlInput.value : '';
            const newUrl = prompt('Enter cover image URL (leave empty to remove):', currentUrl);
            
            if (newUrl !== null) { // User didn't cancel
                if (coverUrlInput) {
                    coverUrlInput.value = newUrl;
                }
                updateCoverPreview(newUrl, coverPreview);
                markAsChanged();
            }
        });
        
        // Initialize preview with placeholder text
        coverPreview.textContent = 'Click to add cover';
    }
}

// Add tag
function addTag(tag) {
    if (!tag) return;
    
    const tagText = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
    const tagsContainer = document.getElementById('genres-tags');
    
    // Check if tag already exists
    const existingTags = Array.from(tagsContainer.querySelectorAll('.genre-tag'));
    if (existingTags.some(tagEl => tagEl.dataset.genre === tagText)) {
        return; // Tag already added
    }
    
    const tagElement = document.createElement('span');
    tagElement.className = 'genre-tag';
    tagElement.dataset.genre = tagText;
    tagElement.innerHTML = `
        ${tagText}
        <span class="remove" onclick="removeTag('${tagText}')">&times;</span>
    `;
    
    tagsContainer.appendChild(tagElement);
    markAsChanged();
}

// Remove tag
function removeTag(tag) {
    const tagsContainer = document.getElementById('genres-tags');
    const tagToRemove = tagsContainer.querySelector(`[data-genre="${tag}"]`);
    if (tagToRemove) {
        tagToRemove.remove();
        markAsChanged();
    }
}

// Get selected tags
function getSelectedTags() {
    const tagsContainer = document.getElementById('genres-tags');
    const tagElements = tagsContainer.querySelectorAll('.genre-tag');
    return Array.from(tagElements).map(tag => tag.dataset.genre);
}

// Update cover preview
function updateCoverPreview(url, previewElement) {
    if (!url.trim()) {
        previewElement.style.backgroundImage = '';
        previewElement.textContent = 'Cover preview';
        previewElement.classList.remove('has-image');
        return;
    }
    
    // Test if the URL is valid by creating an image
    const img = new Image();
    img.onload = () => {
        previewElement.style.backgroundImage = `url(${url})`;
        previewElement.textContent = '';
        previewElement.classList.add('has-image');
    };
    img.onerror = () => {
        previewElement.style.backgroundImage = '';
        previewElement.textContent = 'Invalid image URL';
        previewElement.classList.remove('has-image');
    };
    img.src = url;
}

// Get story content from TinyMCE or fallback to textarea
function getStoryContent() {
    if (tinymceEditor) {
        return tinymceEditor.getContent();
    } else {
        return document.getElementById('story-content').value;
    }
}

// Set story content in TinyMCE or fallback to textarea
function setStoryContent(content) {
    if (tinymceEditor) {
        tinymceEditor.setContent(content || '');
    } else {
        document.getElementById('story-content').value = content || '';
    }
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
    const content = getStoryContent();
    const rating = document.getElementById('content-rating-select').value;
    const description = document.getElementById('story-description').value;
    const coverUrl = document.getElementById('cover-url').value;
    const tags = getSelectedTags();
    
    // Always try localStorage first as fallback
    const localStoryId = saveToLocalStorage({ 
        title, 
        content, 
        rating, 
        description, 
        coverUrl, 
        tags 
    });
    
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
        
        // Calculate word count properly for HTML content
        let wordCount = 0;
        if (content) {
            if (tinymceEditor) {
                // Get plain text from TinyMCE for word count
                const plainText = tinymceEditor.getContent({format: 'text'});
                wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
            } else {
                // Fallback for plain text
                wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
            }
        }
        
        const storyData = {
            title,
            content,
            contentRating: rating,
            description: description.trim(),
            tags: tags,
            coverUrl: coverUrl.trim() || null,
            authorId: userId,
            authorName: firebaseUser.displayName || localStorageUser?.name || 'Anonymous',
            updatedAt: serverTimestamp(),
            wordCount: wordCount,
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
    // Double-check authentication before proceeding
    const firebaseUser = auth?.currentUser;
    const localStorageUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const isLoggedIn = firebaseUser || localStorageUser;
    
    if (!isLoggedIn) {
        showNotificationMessage('Authentication required. Please log in to publish online.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Verify Firebase configuration
    if (!db || !checkFirebaseConfiguration()) {
        showNotificationMessage('Firebase not properly configured. Cannot publish online.', 'error');
        return;
    }
    
    const title = document.getElementById('story-title').value || 'Untitled Story';
    const content = getStoryContent();
    const rating = document.getElementById('content-rating-select').value;
    const description = document.getElementById('story-description').value;
    const coverUrl = document.getElementById('cover-url').value;
    const tags = getSelectedTags();
    
    if (!title.trim() || !content.trim()) {
        showNotificationMessage('Please add a title and content before publishing', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to publish this story online? It will be visible to all users.')) {
        return;
    }
    
    const storyId = generateStoryId();
    
    console.log('📝 Publishing story to Firebase...');
    console.log('   Story ID:', storyId);
    console.log('   Author:', localStorageUser?.name || 'Anonymous');
    
    try {
        const { collection, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Calculate word count properly for HTML content
        let wordCount = 0;
        if (content) {
            if (tinymceEditor) {
                const plainText = tinymceEditor.getContent({format: 'text'});
                wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
            } else {
                wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
            }
        }
        
        const storyData = {
            id: storyId,
            title: title.trim(),
            content: content.trim(),
            excerpt: content.substring(0, 200),
            description: description.trim() || content.substring(0, 200),
            contentRating: rating,
            tags: tags,
            coverUrl: coverUrl.trim() || null,
            authorName: localStorageUser.name || 'Anonymous Author',
            authorEmail: localStorageUser.email || 'anonymous@fattpad.local',
            authorPicture: localStorageUser.picture || null,
            publishedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            wordCount: wordCount,
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
    // Populate basic fields
    document.getElementById('story-title').value = storyData.title || '';
    document.getElementById('content-rating-select').value = storyData.contentRating || 'E';
    
    // Populate new metadata fields
    if (storyData.description) {
        document.getElementById('story-description').value = storyData.description;
    }
    
    if (storyData.coverUrl) {
        document.getElementById('cover-url').value = storyData.coverUrl;
        updateCoverPreview(storyData.coverUrl, document.getElementById('cover-preview'));
    }
    
    // Populate tags
    if (storyData.tags && storyData.tags.length > 0) {
        const tagsContainer = document.getElementById('genres-tags');
        tagsContainer.innerHTML = '';
        storyData.tags.forEach(tag => addTag(tag));
    } else if (storyData.genres && storyData.genres.length > 0) {
        // Backward compatibility with old 'genres' field
        const tagsContainer = document.getElementById('genres-tags');
        tagsContainer.innerHTML = '';
        storyData.genres.forEach(genre => addTag(genre));
    }
    
    // Set content using TinyMCE or fallback
    setStoryContent(storyData.content || '');
    
    // Update word count
    updateWordCount();
    
    // Update character counter if description exists
    const descriptionCounter = document.getElementById('description-counter');
    if (descriptionCounter) {
        const descLength = (storyData.description || '').length;
        descriptionCounter.textContent = `${descLength}/500`;
    }
}

// Utility functions
function generateStoryId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function saveToLocalStorage(storyData) {
    const stories = JSON.parse(localStorage.getItem('fattpad_stories') || '[]');
    const storyId = currentStory?.id || generateStoryId();
    const existingIndex = stories.findIndex(s => s.id === storyId);
    
    // Calculate word count properly for HTML content
    let wordCount = 0;
    if (storyData.content) {
        if (tinymceEditor) {
            // Get plain text from TinyMCE for word count
            const plainText = tinymceEditor.getContent({format: 'text'});
            wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
        } else {
            // Fallback for plain text
            wordCount = storyData.content.trim() ? storyData.content.trim().split(/\s+/).length : 0;
        }
    }
    
    const storyToSave = {
        id: storyId,
        ...storyData,
        updatedAt: Date.now(),
        wordCount: wordCount
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
    
    console.log('updateAuthUI called with:', user);
    
    if (user) {
        publishBtn.disabled = false;
        
        // Always show "Publish" - let the user choose when they click
        publishBtn.textContent = 'Publish';
        publishBtn.onclick = publishStory;
        
        console.log('User authenticated:', user.name || user.displayName);
    } else {
        publishBtn.disabled = true;
        publishBtn.textContent = 'Login to Publish';
        publishBtn.onclick = () => {
            console.log('🔄 Login button clicked, redirecting to login.html');
            console.log('Current location:', window.location.href);
            console.log('Target:', 'login.html');
            try {
                window.location.href = 'login.html';
            } catch (error) {
                console.error('❌ Login redirect error:', error);
            }
        };
        
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
    const content = getStoryContent();
    const rating = document.getElementById('content-rating-select').value;
    const description = document.getElementById('story-description').value;
    const coverUrl = document.getElementById('cover-url').value;
    const tags = getSelectedTags();
    const localStorageUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!content.trim()) {
        showNotificationMessage('Please write some content before publishing', 'error');
        return;
    }
    
    // Save to localStorage as published story
    const storyId = currentStory?.id || generateStoryId();
    
    // Calculate word count properly for HTML content
    let wordCount = 0;
    if (content) {
        if (tinymceEditor) {
            const plainText = tinymceEditor.getContent({format: 'text'});
            wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
        } else {
            wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        }
    }
    
    const publishedStory = {
        id: storyId,
        title,
        content,
        excerpt: content.substring(0, 200),
        description: description.trim() || content.substring(0, 200),
        contentRating: rating,
        tags: tags,
        coverUrl: coverUrl.trim() || null,
        authorName: localStorageUser.name || 'Anonymous',
        authorEmail: localStorageUser.email || '',
        publishedAt: Date.now(),
        updatedAt: Date.now(),
        wordCount: wordCount,
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