// Story viewer functionality
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
const likeCountEl = document.getElementById('like-count');
const shareBtn = document.getElementById('share-btn');

let currentStory = null;
let currentStoryId = null;
let currentAuthorName = 'Anonymous';

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    await loadStory();
    setupEventListeners();
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
            showError('No story ID provided');
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
            showError('Story not found');
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
        showError('Failed to load story');
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
    
    // Set title
    storyTitleEl.textContent = story.title || 'Untitled Story';
    document.title = `${story.title || 'Untitled Story'} - Fattpad`;
    
    // Fetch and set author info
    let authorName = 'Anonymous';
    if (story.authorId) {
        try {
            const authorDoc = await getDoc(doc(db, 'users', story.authorId));
            if (authorDoc.exists()) {
                const authorData = authorDoc.data();
                authorName = authorData.displayName || 'Anonymous';
            }
        } catch (error) {
            console.warn('Could not fetch author data:', error);
            // Fall back to stored authorName if it exists
            authorName = story.authorName || story.author || 'Anonymous';
        }
    } else {
        // Fall back to stored authorName for backward compatibility
        authorName = story.authorName || story.author || 'Anonymous';
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
        publishedDateEl.innerHTML = `<i class="fas fa-calendar"></i> Published ${publishDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short', 
            day: 'numeric'
        })}`;
    } else {
        publishedDateEl.innerHTML = '<i class="fas fa-calendar"></i> Published Unknown';
    }
    
    const wordCount = story.wordCount || (story.content ? story.content.trim().split(/\s+/).length : 0);
    wordCountEl.innerHTML = `<i class="fas fa-file-alt"></i> ${wordCount.toLocaleString()} words`;
    
    const viewCount = story.views || 0;
    viewCountEl.innerHTML = `<i class="fas fa-eye"></i> ${viewCount.toLocaleString()} Views`;
    
    // Set like count display
    const likeCount = story.likes || 0;
    const likeCountDisplay = document.getElementById('like-count-display');
    if (likeCountDisplay) {
        likeCountDisplay.innerHTML = `<i class="fas fa-heart"></i> ${likeCount} Bites`;
    }
    
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
                'No description available.';
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
        storyContentEl.innerHTML = '<p>No content available.</p>';
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
        alert('Story reported. Thank you for helping keep our community safe.');
    });
    
    // Auth state listener for like button
    auth.onAuthStateChanged((user) => {
        updateLikeButtonState(!!user);
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
        console.log('❌ User not authenticated');
        return;
    }
    
    if (!currentStory || !currentStoryId) {
        console.log('❌ No current story or story ID');
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
    if (isLiked === null) {
        // Check if already liked
        const likedStories = JSON.parse(localStorage.getItem('fattpad_liked_stories') || '[]');
        isLiked = likedStories.includes(currentStoryId);
    }
    
    likeCountEl.textContent = likeCount.toLocaleString();
    const likeIcon = document.getElementById('like-icon');
    const likeText = document.getElementById('like-text');
    
    if (isLiked) {
        likeBtnEl.classList.add('liked');
        likeIcon.className = 'fas fa-heart';
        likeText.textContent = 'Bitten';
    } else {
        likeBtnEl.classList.remove('liked');
        likeIcon.className = 'far fa-heart';
        likeText.textContent = 'Bite';
    }
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
        title: currentStory.title || 'Check out this story',
        text: `"${currentStory.title}" by ${currentAuthorName} on Fattpad`,
        url: window.location.href
    };
    
    // Try native sharing first
    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        // Fallback: copy URL to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Story URL copied to clipboard!');
        }).catch(() => {
            // Final fallback: show URL in alert
            alert(`Share this story: ${window.location.href}`);
        });
    }
}