// Firebase story fetching utilities
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config-public.js';

// Initialize Firebase using imported config
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Get current user's content rating preference
 * @returns {string} Content rating filter
 */
function getContentRatingFilter() {
    const userSettings = JSON.parse(localStorage.getItem('fattpad_settings') || '{}');
    // Default to 'A' for testing so all stories are visible
    return userSettings.contentRating || 'A';
}

/**
 * Apply content rating filter to query
 * @param {string} userRating - User's content rating preference
 * @returns {array} Array of allowed content ratings (including abbreviations)
 */
function getAllowedContentRatings(userRating) {
    const ratingHierarchy = {
        'E': ['E'],  // Everyone - only everyone content
        'T': ['E', 'T'],  // Teen - everyone + teen content
        'M': ['E', 'T', 'M'],  // Mature - everyone + teen + mature content
        'A': ['E', 'T', 'M', 'A']  // Adult - all content
    };
    return ratingHierarchy[userRating] || ['E'];
}

/**
 * Get newest stories (most recently published)
 * @returns {Promise<Array>} Array of story objects
 */
export async function getNewStories() {
    try {
        console.log('📚 Fetching new stories...');
        
        const userRating = getContentRatingFilter();
        const allowedRatings = getAllowedContentRatings(userRating);
        console.log('🔍 Allowed content ratings:', allowedRatings);
        
        const storiesRef = collection(db, 'stories');
        
        // First, let's try to get all stories to see what's in the database
        console.log('🔍 Fetching all stories for debugging...');
        const allStoriesQuery = query(storiesRef, limit(5));
        const allSnapshot = await getDocs(allStoriesQuery);
        
        console.log('📊 Sample stories in database:');
        allSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('📄 Story:', {
                id: doc.id,
                title: data.title,
                isPublished: data.isPublished,
                publishedAt: data.publishedAt,
                contentRating: data.contentRating,
                author: data.authorName || data.author
            });
        });
        
        // More flexible query - remove the isPublished filter for now
        const q = query(
            storiesRef,
            orderBy('publishedAt', 'desc'),
            limit(20)
        );
        
        console.log('🔍 Running main query...');
        const querySnapshot = await getDocs(q);
        console.log('📊 Query returned', querySnapshot.size, 'documents');
        
        const stories = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('🔍 Processing story:', {
                id: doc.id,
                title: data.title,
                isPublished: data.isPublished,
                contentRating: data.contentRating
            });
            
            // More flexible filtering - accept if isPublished is true OR missing
            const isPublished = data.isPublished === true || data.isPublished === undefined;
            const storyRating = data.contentRating || 'E';
            const ratingAllowed = allowedRatings.includes(storyRating);
            
            console.log('🔍 Filter check:', {
                isPublished: isPublished,
                storyRating: storyRating,
                allowedRatings: allowedRatings,
                ratingAllowed: ratingAllowed
            });
            
            if (isPublished && ratingAllowed) {
                stories.push({
                    id: doc.id,
                    ...data
                });
                console.log('✅ Added story:', data.title);
            } else {
                console.log('❌ Filtered out story:', data.title, 
                    'isPublished:', isPublished, 
                    'ratingAllowed:', ratingAllowed,
                    'storyRating:', storyRating);
            }
        });
        
        // Limit to 9 after filtering
        const limitedStories = stories.slice(0, 9);
        console.log(`✅ Fetched ${limitedStories.length} new stories after filtering`);
        return limitedStories;
        
    } catch (error) {
        console.error('❌ Error fetching new stories:', error);
        return [];
    }
}

/**
 * Get popular stories (most viewed)
 * @returns {Promise<Array>} Array of story objects
 */
export async function getPopularStories() {
    try {
        console.log('📈 Fetching popular stories...');
        
        const userRating = getContentRatingFilter();
        const allowedRatings = getAllowedContentRatings(userRating);
        
        const storiesRef = collection(db, 'stories');
        const q = query(
            storiesRef,
            where('isPublished', '==', true),
            orderBy('views', 'desc'),
            limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const stories = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (allowedRatings.includes(data.contentRating || 'E')) {
                stories.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        const limitedStories = stories.slice(0, 9);
        console.log(`✅ Fetched ${limitedStories.length} popular stories`);
        return limitedStories;
        
    } catch (error) {
        console.error('❌ Error fetching popular stories:', error);
        return [];
    }
}

/**
 * Get top-rated stories (highest likes)
 * @returns {Promise<Array>} Array of story objects
 */
export async function getTopStories() {
    try {
        console.log('⭐ Fetching top stories...');
        
        const userRating = getContentRatingFilter();
        const allowedRatings = getAllowedContentRatings(userRating);
        
        const storiesRef = collection(db, 'stories');
        const q = query(
            storiesRef,
            where('isPublished', '==', true),
            orderBy('likes', 'desc'),
            limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const stories = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (allowedRatings.includes(data.contentRating || 'E')) {
                stories.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        const limitedStories = stories.slice(0, 9);
        console.log(`✅ Fetched ${limitedStories.length} top stories`);
        return limitedStories;
        
    } catch (error) {
        console.error('❌ Error fetching top stories:', error);
        return [];
    }
}

/**
 * Format story data for display with author information
 * @param {Object} story - Raw story object from Firebase
 * @returns {Promise<Object>} Formatted story object
 */
export async function formatStoryForDisplay(story) {
    // Fetch author information if authorId exists
    let authorName = 'Anonymous';
    let authorPicture = '';
    
    if (story.authorId) {
        try {
            const authorDoc = await getDoc(doc(db, 'users', story.authorId));
            if (authorDoc.exists()) {
                const authorData = authorDoc.data();
                authorName = authorData.displayName || 'Anonymous';
                authorPicture = authorData.photoURL || '';
            }
        } catch (error) {
            console.warn('Could not fetch author data for story:', story.id, error);
        }
    }

    return {
        id: story.id,
        title: story.title || 'Untitled',
        description: story.description || story.excerpt || '', // Use story description if available
        excerpt: story.excerpt || (story.content ? story.content.substring(0, 150) + '...' : 'No preview available'),
        author: authorName,
        authorId: story.authorId || null,
        authorPicture: authorPicture,
        coverImage: story.coverImage || story.coverUrl || '', // Add cover image support
        tags: story.tags || story.genres || [], // Add tags support
        publishedAt: story.publishedAt,
        wordCount: story.wordCount || 0,
        views: story.views || 0,
        likes: story.likes || 0,
        contentRating: story.contentRating || 'E',
        // Format dates
        publishedDate: story.publishedAt ? 
            (story.publishedAt.seconds ? new Date(story.publishedAt.seconds * 1000).toLocaleDateString() : new Date(story.publishedAt).toLocaleDateString()) : 
            'Unknown',
        timeAgo: formatTimeAgo(story.publishedAt)
    };
}

/**
 * Format timestamp to "time ago" string
 * @param {Object} timestamp - Firebase timestamp or date string
 * @returns {string} Formatted time string
 */
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    let publishDate;
    if (timestamp.seconds) {
        // Firebase Timestamp
        publishDate = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
        // ISO string
        publishDate = new Date(timestamp);
    } else {
        return 'Unknown';
    }
    
    const now = new Date();
    const diffMs = now - publishDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 30) {
        return publishDate.toLocaleDateString();
    } else if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

/**
 * Get all available stories with filtering and sorting options
 * @param {string} sortBy - 'new', 'popular', or 'top'
 * @param {number} limitCount - Number of stories to return
 * @returns {Promise<Array>} Array of formatted story objects
 */
export async function getStories(sortBy = 'new', limitCount = 9) {
    try {
        let stories = [];
        
        switch (sortBy) {
            case 'popular':
                stories = await getPopularStories();
                break;
            case 'top':
                stories = await getTopStories();
                break;
            case 'new':
            default:
                stories = await getNewStories();
                break;
        }
        
        // Format stories for display (now async)
        const formattedStories = await Promise.all(
            stories.slice(0, limitCount).map(story => formatStoryForDisplay(story))
        );
        
        return formattedStories;
        
    } catch (error) {
        console.error(`❌ Error getting ${sortBy} stories:`, error);
        return [];
    }
}
