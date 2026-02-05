// Story viewer functionality
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, updateDoc, increment, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig } from '../config/firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const storyDisplayEl = document.getElementById('story-display');
const storyTitleEl = document.getElementById('story-title');
const storyAuthorEl = document.getElementById('story-author');
const contentRatingEl = document.getElementById('content-rating');
const publishedDateEl = document.getElementById('published-date');
const wordCountEl = document.getElementById('word-count');
const viewCountEl = document.getElementById('view-count');
const storyContentEl = document.getElementById('story-content');
const likeBtnEl = document.getElementById('like-btn');
const shareBtn = document.getElementById('share-btn');

let currentStory = null;
let currentStoryId = null;
let currentAuthorName = 'Anonymous';
let currentUser = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    await loadStory();
    setupEventListeners();
    loadComments();
});

/**
 * Load story from URL parameter
 */
async function loadStory() {
    try {
        // Get story ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        currentStoryId = urlParams.get('id');
        
        if (!currentStoryId) {
            showError('no story ID provided');
            return;
        }

        console.log('📖 Loading story:', currentStoryId);
        
        // Try Firebase first
        let story = await loadFromFirebase(currentStoryId);
        
        // Fallback to localStorage if not found in Firebase
        if (!story) {
            story = loadFromLocalStorage(currentStoryId);
        }

        if (!story) {
            showError('story not found');
            return;
        }

        currentStory = story;
        displayStory(story);
        
        // Increment view count (only for Firebase stories)
        if (story.source === 'firebase') {
            await incrementViewCount(currentStoryId);
        }

    } catch (error) {
        console.error('Error loading story:', error);
        showError('failed to load story');
    }
}

/**
 * Load story from Firebase
 */
async function loadFromFirebase(storyId) {
    try {
        const storyRef = doc(db, 'stories', storyId);
        const storyDoc = await getDoc(storyRef);
        
        if (storyDoc.exists()) {
            console.log('📖 Story loaded from Firebase');
            return {
                id: storyDoc.id,
                ...storyDoc.data(),
                source: 'firebase'
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        return null;
    }
}

/**
 * Load story from localStorage (fallback)
 */
function loadFromLocalStorage(storyId) {
    try {
        const publishedStories = JSON.parse(localStorage.getItem('fattpad_published_stories') || '[]');
        const story = publishedStories.find(s => s.id === storyId);
        
        if (story) {
            console.log('📖 Story loaded from localStorage');
            return {
                ...story,
                source: 'local'
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
}

/**
 * Display the story
 */
async function displayStory(story) {
    // Hide loading, show content
    loadingEl.style.display = 'none';
    storyDisplayEl.style.display = 'block';
    
    // Show local draft banner if story is from localStorage
    const localDraftBanner = document.getElementById('local-draft-banner');
    if (localDraftBanner) {
        if (story.source === 'local') {
            localDraftBanner.style.display = 'block';
        } else {
            localDraftBanner.style.display = 'none';
        }
    }
    
    // Set title
    storyTitleEl.textContent = story.title || 'untitled story';
    document.title = `${story.title || 'untitled story'} - Fattpad`;
    
    // Fetch and set author info
    let authorName = 'anonymous';
    if (story.authorId) {
        try {
            const authorDoc = await getDoc(doc(db, 'users', story.authorId));
            if (authorDoc.exists()) {
                const authorData = authorDoc.data();
                authorName = authorData.displayName || 'anonymous';
            }
        } catch (error) {
            console.warn('Could not fetch author data:', error);
            // Fall back to stored authorName if it exists
            authorName = story.authorName || story.author || 'anonymous';
        }
    } else {
        // Fall back to stored authorName for backward compatibility
        authorName = story.authorName || story.author || 'anonymous';
    }
    
    // Set author with clickable link if authorId is available
    if (story.authorId) {
        storyAuthorEl.innerHTML = `by <a href="profile.html?userId=${story.authorId}" class="author-link">${authorName}</a>`;
    } else {
        storyAuthorEl.textContent = `by ${authorName}`;
    }
    currentAuthorName = authorName;
    
    // Set content rating
    const rating = (story.contentRating || 'general').toLowerCase();
    contentRatingEl.textContent = rating.toUpperCase();
    contentRatingEl.className = `content-rating-tag ${rating}`;
    
    // Set metadata with proper formatting
    if (story.publishedAt) {
        const publishDate = story.publishedAt.seconds ? 
            new Date(story.publishedAt.seconds * 1000) : 
            new Date(story.publishedAt);
        publishedDateEl.innerHTML = `<i class="fas fa-calendar"></i> published ${publishDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short', 
            day: 'numeric'
        })}`;
    } else {
        publishedDateEl.innerHTML = '<i class="fas fa-calendar"></i> published unknown';
    }
    
    const wordCount = story.wordCount || (story.content ? story.content.trim().split(/\s+/).length : 0);
    wordCountEl.innerHTML = `<i class="fas fa-file-alt"></i> ${wordCount.toLocaleString()} words`;
    
    const viewCount = story.views || 0;
    viewCountEl.innerHTML = `<i class="fas fa-eye"></i> ${viewCount.toLocaleString()} views`;
    
    // Create tags
    const tagsContainer = document.getElementById('story-tags');
    if (tagsContainer) {
        // Clear existing tags except rating
        const existingTags = tagsContainer.querySelectorAll('.story-tag');
        existingTags.forEach(tag => tag.remove());
        
        // Add genre tags
        if (story.genres && story.genres.length > 0) {
            story.genres.forEach(genre => {
                const tag = document.createElement('span');
                tag.className = 'story-tag';
                tag.textContent = genre;
                tagsContainer.appendChild(tag);
            });
        }
    }
    
    // Set description
    const descriptionEl = document.getElementById('story-description');
    if (descriptionEl) {
        if (story.description) {
            descriptionEl.textContent = story.description;
        } else {
            // Create a short excerpt from content if no description
            const excerpt = story.content ? 
                story.content.substring(0, 200) + (story.content.length > 200 ? '...' : '') : 
                'no description available.';
            descriptionEl.textContent = excerpt;
        }
    }
    
    // Set cover image (placeholder for now)
    const coverElement = document.getElementById('story-cover');
    if (coverElement) {
        if (story.coverUrl) {
            coverElement.style.backgroundImage = `url(${story.coverUrl})`;
            coverElement.style.backgroundSize = 'cover';
            coverElement.style.backgroundPosition = 'center';
            coverElement.innerHTML = '';
        } else {
            // Keep the default gradient with book icon
            coverElement.style.backgroundImage = '';
        }
    }
    
    // Set content with proper formatting
    if (story.content) {
        // Split content into paragraphs and format
        const paragraphs = story.content.split('\n').filter(p => p.trim());
        storyContentEl.innerHTML = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
    } else {
        storyContentEl.innerHTML = '<p>no content available.</p>';
    }
    
    // Update like button
    updateLikeButton(story.likes || 0);
}

/**
 * Show error state
 */
function showError(message) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    
    const errorMsg = errorEl.querySelector('p');
    if (errorMsg) {
        errorMsg.textContent = message;
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Like button
    likeBtnEl.addEventListener('click', handleLike);
    
    // Share button
    shareBtn.addEventListener('click', handleShare);
    
    // Report button (placeholder)
    document.getElementById('report-btn').addEventListener('click', () => {
        alert('story reported. thank you for helping keep our community safe.');

        //TODO: Implement actual reporting functionality
    });
    
    // Font size controls
    setupFontSizeControls();
    
    // Comments functionality
    setupCommentsEventListeners();
    
    // Comment sorting functionality
    setupCommentSorting();
    
    // Auth state listener for like button and comments
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateLikeButtonState(!!user);
        updateCommentsUIForAuth(user);
    });
}

/**
 * Handle like button click
 */
async function handleLike() {
    console.log('🔍 handleLike called');
    console.log('🔍 currentStory:', currentStory);
    console.log('🔍 currentStoryId:', currentStoryId);
    
    // Check if user is authenticated
    if (!auth.currentUser) {
        console.log('❌ user not authenticated');
        return;
    }
    
    if (!currentStory || !currentStoryId) {
        console.log('❌ no current story or story ID');
        return;
    }
    
    console.log('🔍 Starting like/unlike process...');
    
    try {
        // Check if already liked (using localStorage to track)
        const likedStories = JSON.parse(localStorage.getItem('fattpad_liked_stories') || '[]');
        const alreadyLiked = likedStories.includes(currentStoryId);
        
        console.log('🔍 Already liked?', alreadyLiked);
        console.log('🔍 Liked stories list:', likedStories);
        
        if (alreadyLiked) {
            console.log('🔍 Attempting to unlike...');
            // Unlike
            const index = likedStories.indexOf(currentStoryId);
            likedStories.splice(index, 1);
            localStorage.setItem('fattpad_liked_stories', JSON.stringify(likedStories));
            
            if (currentStory.source === 'firebase') {
                const storyRef = doc(db, 'stories', currentStoryId);
                console.log('🔍 Attempting to update story:', currentStoryId);
                console.log('🔍 Update data:', { likes: increment(-1) });
                console.log('🔍 Current user auth state:', auth?.currentUser?.uid || 'Not authenticated');
                console.log('🔍 Story author ID:', currentStory.authorId || 'No author ID');
                
                await updateDoc(storyRef, {
                    likes: increment(-1)
                });
            }
            
            currentStory.likes = Math.max((currentStory.likes || 0) - 1, 0);
            updateLikeButton(currentStory.likes, false);
            
        } else {
            console.log('🔍 Attempting to like...');
            // Like
            likedStories.push(currentStoryId);
            localStorage.setItem('fattpad_liked_stories', JSON.stringify(likedStories));
            
            if (currentStory.source === 'firebase') {
                const storyRef = doc(db, 'stories', currentStoryId);
                console.log('🔍 Attempting to update story:', currentStoryId);
                console.log('🔍 Update data:', { likes: increment(1) });
                console.log('🔍 Current user auth state:', auth?.currentUser?.uid || 'Not authenticated');
                console.log('🔍 Story author ID:', currentStory.authorId || 'No author ID');
                
                await updateDoc(storyRef, {
                    likes: increment(1)
                });
            }
            
            currentStory.likes = (currentStory.likes || 0) + 1;
            updateLikeButton(currentStory.likes, true);
        }
        
    } catch (error) {
        console.error('Error updating like:', error);
        alert('Failed to update like. Please try again.');
    }
}

/**
 * Update like button appearance
 */
function updateLikeButton(likeCount, isLiked = null) {
    console.log('updateLikeButton called with:', { likeCount, isLiked, currentStoryId });
    
    if (isLiked === null) {
        // Check if already liked
        const likedStories = JSON.parse(localStorage.getItem('fattpad_liked_stories') || '[]');
        isLiked = likedStories.includes(currentStoryId);
    }
    
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
        const likeCountElement = document.getElementById('like-count');
        console.log('likeCountElement found:', likeCountElement);
        if (likeCountElement) {
            likeCountElement.textContent = likeCount.toLocaleString();
        } else {
            console.warn('like-count element not found');
        }
        
        // Update liked state for other potential styling, but don't change the icon
        if (isLiked) {
            if (likeBtnEl) likeBtnEl.classList.add('liked');
        } else {
            if (likeBtnEl) likeBtnEl.classList.remove('liked');
        }
    }, 10);
}

/**
 * Update like button enabled/disabled state based on auth
 */
function updateLikeButtonState(isAuthenticated) {
    if (isAuthenticated) {
        likeBtnEl.disabled = false;
        likeBtnEl.style.opacity = '1';
        likeBtnEl.style.cursor = 'pointer';
        likeBtnEl.title = '';
    } else {
        likeBtnEl.disabled = true;
        likeBtnEl.style.opacity = '0.5';
        likeBtnEl.style.cursor = 'not-allowed';
        likeBtnEl.title = 'Please log in to like stories';
    }
}

/**
 * Increment view count
 */
async function incrementViewCount(storyId) {
    try {
        // Check if already viewed today (to prevent spam)
        const viewedToday = localStorage.getItem(`viewed_${storyId}_${new Date().toDateString()}`);
        
        if (!viewedToday) {
            const storyRef = doc(db, 'stories', storyId);
            await updateDoc(storyRef, {
                views: increment(1)
            });
            
            // Mark as viewed today
            localStorage.setItem(`viewed_${storyId}_${new Date().toDateString()}`, 'true');
            
            console.log('📈 View count incremented');
        }
    } catch (error) {
        console.error('Error incrementing view count:', error);
    }
}

/**
 * Handle share button
 */
function handleShare() {
    if (!currentStory) return;
    
    const shareData = {
        title: currentStory.title || 'check out this story',
        text: `"${currentStory.title}" by ${currentAuthorName} on fattpad`,
        url: window.location.href
    };
    
    // Try native sharing first
    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        // Fallback: copy URL to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('story URL copied to clipboard!');
        }).catch(() => {
            // Final fallback: show URL in alert
            alert(`share this story: ${window.location.href}`);
        });
    }
}

/**
 * Font Size Control Functions
 */
let currentFontSizeMultiplier = 1.0; // Default 100%

function setupFontSizeControls() {
    const decreaseBtn = document.getElementById('decrease-font');
    const increaseBtn = document.getElementById('increase-font');
    const fontSizeInput = document.getElementById('font-size-input');
    
    if (!decreaseBtn || !increaseBtn || !fontSizeInput) {
        console.warn('Font size controls not found in DOM');
        return;
    }
    
    // Load saved font size preference
    loadFontSizePreference();
    
    // Decrease font size
    decreaseBtn.addEventListener('click', () => {
        const newMultiplier = Math.max(0.1, currentFontSizeMultiplier - 0.1);
        setFontSizeMultiplier(newMultiplier);
    });
    
    // Increase font size
    increaseBtn.addEventListener('click', () => {
        const newMultiplier = Math.min(5.0, currentFontSizeMultiplier + 0.1);
        setFontSizeMultiplier(newMultiplier);
    });
    
    // Input field changes
    fontSizeInput.addEventListener('input', (e) => {
        const percentage = parseInt(e.target.value);
        if (!isNaN(percentage)) {
            const newMultiplier = Math.max(0.1, Math.min(5.0, percentage / 100));
            setFontSizeMultiplier(newMultiplier, false); // Don't update input to avoid cursor issues
        }
    });
    
    // Input field blur (when user finishes editing)
    fontSizeInput.addEventListener('blur', (e) => {
        const percentage = parseInt(e.target.value);
        if (isNaN(percentage) || percentage < 10 || percentage > 500) {
            // Reset to current value if invalid
            fontSizeInput.value = Math.round(currentFontSizeMultiplier * 100);
        }
    });
}

function setFontSizeMultiplier(multiplier, updateInput = true) {
    currentFontSizeMultiplier = multiplier;
    
    // Update the story content font size
    const storyContent = document.getElementById('story-content');
    if (storyContent) {
        storyContent.style.fontSize = `${16 * multiplier}px`;
    }
    
    // Update the input field
    if (updateInput) {
        const fontSizeInput = document.getElementById('font-size-input');
        if (fontSizeInput) {
            fontSizeInput.value = Math.round(multiplier * 100);
        }
    }
    
    // Save preference
    saveFontSizePreference();
}

function loadFontSizePreference() {
    try {
        const saved = localStorage.getItem('fattpad_font_size_multiplier');
        if (saved) {
            const multiplier = parseFloat(saved);
            if (!isNaN(multiplier) && multiplier >= 0.1 && multiplier <= 5.0) {
                setFontSizeMultiplier(multiplier);
                return;
            }
        }
    } catch (error) {
        console.warn('Could not load font size preference:', error);
    }
    
    // Set default if no saved preference or invalid value
    setFontSizeMultiplier(1.0);
}

function saveFontSizePreference() {
    try {
        localStorage.setItem('fattpad_font_size_multiplier', currentFontSizeMultiplier.toString());
    } catch (error) {
        console.warn('Could not save font size preference:', error);
    }
}

/**
 * Comments System Functions
 */
function setupCommentsEventListeners() {
    // Comment form submission
    const commentForm = document.getElementById('comment-form');
    const commentText = document.getElementById('comment-text');
    const charCount = document.getElementById('char-count');
    
    if (commentForm && commentText && charCount) {
        // Character count update
        commentText.addEventListener('input', () => {
            const count = commentText.value.length;
            charCount.textContent = count;
            
            // Change color when approaching limit
            if (count > 900) {
                charCount.style.color = '#f44336';
            } else if (count > 800) {
                charCount.style.color = '#ff9800';
            } else {
                charCount.style.color = 'var(--text-secondary)';
            }
        });
        
        // Form submission
        commentForm.addEventListener('submit', handleCommentSubmit);
    }
}

function updateCommentsUIForAuth(user) {
    const addCommentSection = document.getElementById('add-comment-section');
    const loginPrompt = document.getElementById('login-prompt');
    
    if (user) {
        // User is logged in - show comment form
        if (addCommentSection) addCommentSection.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
        // User not logged in - show login prompt
        if (addCommentSection) addCommentSection.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

async function handleCommentSubmit(event) {
    event.preventDefault();
    
    if (!currentUser || !currentStoryId) {
        alert('Please log in to comment');
        return;
    }
    
    const commentText = document.getElementById('comment-text');
    const content = commentText.value.trim();
    
    if (!content) {
        alert('Please enter a comment');
        return;
    }
    
    try {
        // Disable form while submitting
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        
        // Create comment object
        const comment = {
            storyId: currentStoryId,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email || 'Anonymous',
            content: content,
            createdAt: serverTimestamp(),
            likes: 0,
            replies: []
        };
        
        // Add to Firebase
        await addDoc(collection(db, 'comments'), comment);
        
        // Create notification for story author
        if (currentStory && currentStory.authorId && currentStory.authorId !== currentUser.uid) {
            await createNotification({
                userId: currentStory.authorId,
                type: 'comment',
                title: 'New comment on your story',
                message: `${comment.authorName} commented on "${currentStory.title || 'your story'}": "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                relatedId: currentStoryId,
                relatedType: 'story',
                actionUrl: `story.html?id=${currentStoryId}`,
                fromUserId: currentUser.uid,
                fromUserName: comment.authorName
            });
        }
        
        // Clear form
        commentText.value = '';
        document.getElementById('char-count').textContent = '0';
        
        // Reload comments
        await loadComments();
        
        console.log('✅ Comment posted successfully');
        
    } catch (error) {
        console.error('❌ Error posting comment:', error);
        alert('Failed to post comment. Please try again.');
    } finally {
        // Re-enable form
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Comment';
    }
}

async function loadComments() {
    if (!currentStoryId) return;
    
    const commentsLoading = document.getElementById('comments-loading');
    const commentsEmpty = document.getElementById('comments-empty');
    const commentsList = document.getElementById('comments-list');
    const commentCount = document.getElementById('comment-count');
    
    try {
        // Show loading state
        if (commentsLoading) commentsLoading.style.display = 'flex';
        if (commentsEmpty) commentsEmpty.style.display = 'none';
        
        // Query comments for this story
        const commentsQuery = query(
            collection(db, 'comments'),
            where('storyId', '==', currentStoryId),
            orderBy('createdAt', 'desc')
        );
        
        const commentsSnapshot = await getDocs(commentsQuery);
        const comments = [];
        
        commentsSnapshot.forEach((doc) => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Hide loading state
        if (commentsLoading) commentsLoading.style.display = 'none';
        
        // Update comment count (only count top-level comments for display)
        const topLevelComments = comments.filter(comment => !comment.parentCommentId);
        if (commentCount) commentCount.textContent = topLevelComments.length;
        
        if (comments.length === 0) {
            // Show empty state
            if (commentsEmpty) commentsEmpty.style.display = 'flex';
        } else {
            // Render comments with current sort option
            const sortSelect = document.getElementById('comment-sort-select');
            const sortBy = sortSelect ? sortSelect.value : 'newest';
            renderComments(comments, sortBy);
        }
        
    } catch (error) {
        console.error('❌ Error loading comments:', error);
        if (commentsLoading) commentsLoading.style.display = 'none';
        if (commentsEmpty) {
            commentsEmpty.style.display = 'flex';
            commentsEmpty.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load comments. Please refresh the page.</p>
            `;
        }
    }
}

function renderComments(comments, sortBy = 'newest') {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    // Clear existing comments (keep loading/empty states)
    const existingComments = commentsList.querySelectorAll('.comment');
    existingComments.forEach(comment => comment.remove());
    
    // Separate top-level comments from replies
    const topLevelComments = comments.filter(comment => !comment.parentCommentId);
    const replies = comments.filter(comment => comment.parentCommentId);
    
    // Sort top-level comments based on the selected option
    if (sortBy === 'newest') {
        topLevelComments.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA; // Newest first
        });
    } else if (sortBy === 'top') {
        topLevelComments.sort((a, b) => {
            const likesA = a.likes || 0;
            const likesB = b.likes || 0;
            if (likesB === likesA) {
                // If likes are equal, sort by newest
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            }
            return likesB - likesA; // Most likes first
        });
    }
    
    // Group replies by parent comment ID
    const repliesByParent = {};
    replies.forEach(reply => {
        if (!repliesByParent[reply.parentCommentId]) {
            repliesByParent[reply.parentCommentId] = [];
        }
        repliesByParent[reply.parentCommentId].push(reply);
    });
    
    // Sort replies by creation date (oldest first for natural conversation flow)
    Object.keys(repliesByParent).forEach(parentId => {
        repliesByParent[parentId].sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateA - dateB; // Oldest first for replies
        });
    });
    
    // Render top-level comments with their replies
    topLevelComments.forEach(comment => {
        const commentElement = createCommentElement(comment, repliesByParent[comment.id] || []);
        commentsList.appendChild(commentElement);
    });
}

function createCommentElement(comment, replies = []) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.dataset.commentId = comment.id;
    
    // Format date
    const date = comment.createdAt?.toDate?.() || new Date();
    const timeAgo = formatTimeAgo(date);
    
    // Create replies HTML
    let repliesHTML = '';
    if (replies.length > 0) {
        repliesHTML = replies.map(reply => {
            const replyDate = reply.createdAt?.toDate?.() || new Date();
            const replyTimeAgo = formatTimeAgo(replyDate);
            
            // Check if this reply is responding to another reply
            let replyContext = '';
            let replyClass = 'reply';
            if (reply.replyingToId) {
                const targetReply = replies.find(r => r.id === reply.replyingToId);
                if (targetReply) {
                    replyContext = `<div class="reply-context">
                        <i class="fas fa-reply"></i>
                        Replying to ${escapeHtml(targetReply.authorName)}
                    </div>`;
                    replyClass = 'reply reply-to-reply'; // Add nested class for indentation
                }
            }
            
            return `
                <div class="${replyClass}" data-reply-id="${reply.id}">
                    <div class="comment-header">
                        <div class="comment-avatar">
                            ${reply.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div class="comment-meta">
                            <p class="comment-author">${escapeHtml(reply.authorName)}</p>
                            <p class="comment-date">${replyTimeAgo}</p>
                        </div>
                    </div>
                    ${replyContext}
                    <div class="comment-content">${escapeHtml(reply.content)}</div>
                    <div class="comment-actions">
                        <button class="comment-action like-action" onclick="likeComment('${reply.id}')">
                            <i class="fas fa-heart"></i>
                            <span>${reply.likes || 0}</span>
                        </button>
                        <button class="comment-action reply-action" onclick="toggleReplyToReply('${comment.id}', '${reply.id}', '${escapeHtml(reply.authorName)}')">
                            <i class="fas fa-reply"></i>
                            Reply
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    commentDiv.innerHTML = `
        <div class="comment-header">
            <div class="comment-avatar">
                ${comment.authorName.charAt(0).toUpperCase()}
            </div>
            <div class="comment-meta">
                <p class="comment-author">${escapeHtml(comment.authorName)}</p>
                <p class="comment-date">${timeAgo}</p>
            </div>
        </div>
        <div class="comment-content">${escapeHtml(comment.content)}</div>
        <div class="comment-actions">
            <button class="comment-action like-action" onclick="likeComment('${comment.id}')">
                <i class="fas fa-heart"></i>
                <span>${comment.likes || 0}</span>
            </button>
            <button class="comment-action reply-action" onclick="toggleReplyForm('${comment.id}')">
                <i class="fas fa-reply"></i>
                Reply
            </button>
        </div>
        <div class="comment-replies" id="replies-${comment.id}">
            ${repliesHTML}
            <div class="reply-form" id="reply-form-${comment.id}">
                <div class="comment-form-container">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <form class="comment-form" onsubmit="handleReplySubmit(event, '${comment.id}')">
                        <textarea placeholder="Write a reply..." maxlength="500" required></textarea>
                        <div class="comment-form-actions">
                            <span class="char-count">0/500</span>
                            <div>
                                <button type="button" onclick="toggleReplyForm('${comment.id}')">Cancel</button>
                                <button type="submit">Reply</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    return commentDiv;
}

// Global functions for comment actions
window.likeComment = async function(commentId) {
    if (!currentUser) {
        alert('Please log in to like comments');
        return;
    }
    
    try {
        const commentRef = doc(db, 'comments', commentId);
        await updateDoc(commentRef, {
            likes: increment(1)
        });
        
        // Update UI
        const likeButton = document.querySelector(`[data-comment-id="${commentId}"] .like-action span`);
        if (likeButton) {
            const currentLikes = parseInt(likeButton.textContent) || 0;
            likeButton.textContent = currentLikes + 1;
        }
        
    } catch (error) {
        console.error('❌ Error liking comment:', error);
    }
};

window.toggleReplyForm = function(commentId) {
    const replyForm = document.getElementById(`reply-form-${commentId}`);
    if (replyForm) {
        // Hide any other open reply forms first
        document.querySelectorAll('.reply-form.active').forEach(form => {
            if (form.id !== `reply-form-${commentId}`) {
                form.classList.remove('active');
            }
        });
        
        replyForm.classList.toggle('active');
        
        if (replyForm.classList.contains('active')) {
            const textarea = replyForm.querySelector('textarea');
            if (textarea) {
                textarea.placeholder = 'Write a reply...';
                textarea.dataset.replyingTo = '';
                textarea.focus();
            }
        }
    }
};

window.toggleReplyToReply = function(parentCommentId, replyId, replyAuthor) {
    const replyForm = document.getElementById(`reply-form-${parentCommentId}`);
    if (replyForm) {
        // Hide any other open reply forms first
        document.querySelectorAll('.reply-form.active').forEach(form => {
            if (form.id !== `reply-form-${parentCommentId}`) {
                form.classList.remove('active');
            }
        });
        
        replyForm.classList.add('active');
        
        const textarea = replyForm.querySelector('textarea');
        if (textarea) {
            textarea.placeholder = `Replying to ${replyAuthor}...`;
            textarea.dataset.replyingTo = replyId;
            textarea.focus();
        }
    }
};

window.handleReplySubmit = async function(event, parentCommentId) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please log in to reply');
        return;
    }
    
    const textarea = event.target.querySelector('textarea');
    const content = textarea.value.trim();
    const replyingToId = textarea.dataset.replyingTo;
    
    if (!content) {
        alert('Please enter a reply');
        return;
    }
    
    try {
        // Create reply object
        const reply = {
            storyId: currentStoryId,
            parentCommentId: parentCommentId,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email || 'Anonymous',
            content: content,
            createdAt: serverTimestamp(),
            likes: 0
        };
        
        // If replying to a specific reply, add that context
        if (replyingToId) {
            reply.replyingToId = replyingToId;
        }
        
        // Add to Firebase as a new comment with parentCommentId
        await addDoc(collection(db, 'comments'), reply);
        
        // Create notification for the person being replied to
        let notificationTargetId = null;
        let notificationTargetName = '';
        
        if (replyingToId) {
            // Replying to a specific reply - notify that reply's author
            try {
                const targetReplyDoc = await getDoc(doc(db, 'comments', replyingToId));
                if (targetReplyDoc.exists()) {
                    const targetReply = targetReplyDoc.data();
                    notificationTargetId = targetReply.authorId;
                    notificationTargetName = targetReply.authorName;
                }
            } catch (error) {
                console.warn('Could not get target reply for notification:', error);
            }
        }
        
        if (!notificationTargetId) {
            // Default to parent comment author if no specific reply target
            try {
                const parentCommentDoc = await getDoc(doc(db, 'comments', parentCommentId));
                if (parentCommentDoc.exists()) {
                    const parentComment = parentCommentDoc.data();
                    notificationTargetId = parentComment.authorId;
                    notificationTargetName = parentComment.authorName;
                }
            } catch (error) {
                console.warn('Could not get parent comment for notification:', error);
            }
        }
        
        // Create notification if we have a target and it's not the current user
        if (notificationTargetId && notificationTargetId !== currentUser.uid) {
            await createNotification({
                userId: notificationTargetId,
                type: 'reply',
                title: 'New reply to your comment',
                message: `${reply.authorName} replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                relatedId: parentCommentId,
                relatedType: 'comment',
                actionUrl: `story.html?id=${currentStoryId}`,
                fromUserId: currentUser.uid,
                fromUserName: reply.authorName
            });
        }
        
        // Hide reply form and clear content
        textarea.value = '';
        textarea.placeholder = 'Write a reply...';
        textarea.dataset.replyingTo = '';
        toggleReplyForm(parentCommentId);
        
        // Reload comments to show the new reply
        await loadComments();
        
    } catch (error) {
        console.error('❌ Error posting reply:', error);
        alert('Failed to post reply. Please try again.');
    }
};

// Helper functions
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Comment Sorting Functions
 */
function setupCommentSorting() {
    const sortSelect = document.getElementById('comment-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            // Re-render comments with new sorting
            reloadCommentsWithCurrentSort();
        });
    }
}

async function reloadCommentsWithCurrentSort() {
    // Get current comments data and re-render with selected sort
    if (!currentStoryId) return;
    
    try {
        // Query comments again (we could cache them but this ensures fresh data)
        const commentsQuery = query(
            collection(db, 'comments'),
            where('storyId', '==', currentStoryId),
            orderBy('createdAt', 'desc')
        );
        
        const commentsSnapshot = await getDocs(commentsQuery);
        const comments = [];
        
        commentsSnapshot.forEach((doc) => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get current sort option
        const sortSelect = document.getElementById('comment-sort-select');
        const sortBy = sortSelect ? sortSelect.value : 'newest';
        
        // Render with current sort
        renderComments(comments, sortBy);
        
    } catch (error) {
        console.error('❌ Error reloading comments for sorting:', error);
    }
}

/**
 * Notification System Functions
 */
async function createNotification(notificationData) {
    try {
        const notification = {
            ...notificationData,
            createdAt: serverTimestamp(),
            read: false,
            id: null // Will be set by Firestore
        };
        
        await addDoc(collection(db, 'notifications'), notification);
        console.log('✅ Notification created successfully');
        
        // Update notification badge if the function is available
        if (window.updateNotificationBadge) {
            window.updateNotificationBadge(notificationData.userId);
        }
        
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        // Don't throw - notifications are nice-to-have, not essential
    }
}

// Notification types:
// {
//   userId: string,           // Who gets the notification
//   type: 'comment' | 'reply' | 'like' | 'follow',
//   title: string,            // Notification title
//   message: string,          // Notification content
//   relatedId: string,        // ID of related entity (story, comment, etc.)
//   relatedType: 'story' | 'comment' | 'user',
//   actionUrl: string,        // URL to navigate when clicked
//   fromUserId: string,       // Who triggered the notification
//   fromUserName: string,     // Display name of triggering user
//   createdAt: timestamp,     // When notification was created
//   read: boolean            // Whether notification has been read
// }