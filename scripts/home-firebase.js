// Firebase integration for home page
import { StoryManager } from './story-manager.js';

// Initialize Firebase when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    await initializeFirebase();
    loadPublishedStories();
    initTabHandlers();
});

let currentUser = null;
let db = null;
let auth = null;

// Initialize Firebase
async function initializeFirebase() {
    try {
        // Wait for Firebase modules to be available
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
        
        // Import Firebase config from separate file
        const { firebaseConfig } = await import('../config/firebase-config-public.js');
        
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Listen for auth changes
        auth.onAuthStateChanged(user => {
            currentUser = user;
            updateUIForUser(user);
        });
        
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        // Fall back to localStorage if Firebase fails
        loadLocalStories();
    }
}

// Load published stories for the discovery feed
async function loadPublishedStories() {
    const contentRating = getContentRating();
    const tabs = ['new', 'popular', 'top'];
    
    for (const tab of tabs) {
        const container = document.querySelector(`#${tab}-works`);
        if (!container) continue;
        
        try {
            // If Firebase is available, load from Firestore
            if (db) {
                const stories = await StoryManager.getPublishedStories(tab, contentRating);
                renderStories(stories, container);
            } else {
                // Fall back to demo data
                renderDemoStories(container);
            }
        } catch (error) {
            console.error(`Error loading ${tab} stories:`, error);
            renderDemoStories(container);
        }
    }
}

// Render stories in the feed
function renderStories(stories, container) {
    container.innerHTML = '';
    
    if (stories.length === 0) {
        container.innerHTML = '<div class="no-stories">No stories found</div>';
        return;
    }
    
    stories.slice(0, 9).forEach(story => {
        const storyCard = createStoryCard(story);
        container.appendChild(storyCard);
    });
}

// Create a story card element
function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'work-card';
    
    // Prepare tags HTML
    const tagsHtml = story.tags && story.tags.length > 0 
        ? `<div class="work-tags">
            ${story.tags.map(tag => `<span class="work-tag">${escapeHtml(tag)}</span>`).join('')}
           </div>`
        : '';
    
    // Prepare cover image HTML
    const coverImageHtml = story.coverUrl 
        ? `<div class="work-cover"><img src="${escapeHtml(story.coverUrl)}" alt="${escapeHtml(story.title)}" onerror="this.parentElement.innerHTML='<div class=\"work-placeholder\">📖</div>'"></div>`
        : '<div class="work-cover"><div class="work-placeholder">📖</div></div>';
    
    // Use description if available, otherwise fall back to excerpt or content
    const description = story.description || story.excerpt || story.content || '';
    const displayText = truncateText(description, 120);
    
    card.innerHTML = `
        <div class="work-header">
            ${coverImageHtml}
            <div class="work-content">
                <h3 class="work-title">${escapeHtml(story.title || 'Untitled')}</h3>
                <p class="work-author">by ${escapeHtml(story.authorName || 'Anonymous')}</p>
                <div class="work-stats">
                    <span class="word-count">${story.wordCount || 0} words</span>
                    <span class="rating">${story.contentRating || 'E'}</span>
                    ${story.likes ? `<span class="likes">❤️ ${story.likes}</span>` : ''}
                    ${story.views ? `<span class="views">👁️ ${story.views}</span>` : ''}
                </div>
            </div>
        </div>
        <p class="work-description">${escapeHtml(displayText)}</p>
        ${tagsHtml}
    `;
    
    card.addEventListener('click', () => {
        // Check if it's a local story or Firebase story
        if (story.isLocal || !story.authorId) {
            window.location.href = `pages/story.html?id=${story.id}`;
        } else {
            window.location.href = `pages/story.html?id=${story.id}`;
        }
    });
    
    return card;
}

// Fallback demo data when Firebase is not available
function renderDemoStories(container) {
    container.innerHTML = '';
    
    const demoStories = [
        { title: 'The Digital Sunset', author: 'TechWriter92', wordCount: 1250, rating: 'E' },
        { title: 'Memories of Tomorrow', author: 'QuantumPoet', wordCount: 892, rating: 'T' },
        { title: 'Coffee Shop Chronicles', author: 'UrbanScribe', wordCount: 2150, rating: 'E' },
        { title: 'The Last Algorithm', author: 'CodeMage', wordCount: 3420, rating: 'M' },
        { title: 'Whispers in the Code', author: 'BinaryBard', wordCount: 1680, rating: 'T' },
        { title: 'Pixel Dreams', author: 'ArtificialMuse', wordCount: 950, rating: 'E' },
        { title: 'The Network Ghost', author: 'CyberShaman', wordCount: 2890, rating: 'M' },
        { title: 'Lunch Break Haikus', author: 'OfficeDreamer', wordCount: 340, rating: 'E' },
        { title: 'Server Room Secrets', author: 'DataWhisperer', wordCount: 1540, rating: 'T' }
    ];
    
    demoStories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'work-card demo-card';
        card.innerHTML = `
            <div class="work-image">
                <div class="work-placeholder">📖</div>
            </div>
            <div class="work-info">
                <h3 class="work-title">${story.title}</h3>
                <p class="work-author">by ${story.author}</p>
                <div class="work-stats">
                    <span class="word-count">${story.wordCount} words</span>
                    <span class="rating">${story.rating}</span>
                </div>
                <p class="work-excerpt">Click to read this amazing story...</p>
            </div>
        `;
        
        card.addEventListener('click', () => {
            alert('Demo story - Firebase setup required for full functionality');
        });
        
        container.appendChild(card);
    });
}

// Tab switching functionality
function initTabHandlers() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            contents.forEach(content => {
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

// Utility functions
function getContentRating() {
    return localStorage.getItem('contentRating') || 'E';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function updateUIForUser(user) {
    // This will be handled by navAuth.js
}

// Fall back to localStorage stories if Firebase is not available
function loadLocalStories() {
    console.log('Loading local stories from localStorage');
    
    // Load locally published stories
    const publishedStories = JSON.parse(localStorage.getItem('fattpad_published_stories') || '[]');
    const userStories = JSON.parse(localStorage.getItem('fattpad_stories') || '[]');
    
    // Combine and sort stories
    const allLocalStories = [...publishedStories, ...userStories.filter(s => s.isPublished)]
        .sort((a, b) => (b.publishedAt || b.updatedAt || 0) - (a.publishedAt || a.updatedAt || 0));
    
    if (allLocalStories.length > 0) {
        console.log(`Found ${allLocalStories.length} local stories`);
        renderStories(allLocalStories, document.querySelector('#new-works'));
        renderStories(allLocalStories, document.querySelector('#popular-works'));
        renderStories(allLocalStories, document.querySelector('#top-works'));
    } else {
        // Show demo content if no local stories
        renderDemoStories(document.querySelector('#new-works'));
        renderDemoStories(document.querySelector('#popular-works'));
        renderDemoStories(document.querySelector('#top-works'));
    }
}