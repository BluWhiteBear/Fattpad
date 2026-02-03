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
        
        // You'll need to replace this with your actual Firebase config
        const firebaseConfig = {
        apiKey: "AIzaSyA53SaCvEGgQmBkfc47twD3rmjbiegtBeo",
        authDomain: "fattpad-700c6.firebaseapp.com",
        projectId: "fattpad-700c6",
        storageBucket: "fattpad-700c6.firebasestorage.app",
        messagingSenderId: "766165381277",
        appId: "1:766165381277:web:79523e259dbd81c3702474",
        measurementId: "G-ELTHWYDTMH"
        };
        
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
    card.innerHTML = `
        <div class="work-image">
            <div class="work-placeholder">📖</div>
        </div>
        <div class="work-info">
            <h3 class="work-title">${escapeHtml(story.title || 'Untitled')}</h3>
            <p class="work-author">by ${escapeHtml(story.authorName || 'Anonymous')}</p>
            <div class="work-stats">
                <span class="word-count">${story.wordCount || 0} words</span>
                <span class="rating">${story.contentRating || 'E'}</span>
                ${story.likes ? `<span class="likes">❤️ ${story.likes}</span>` : ''}
                ${story.views ? `<span class="views">👁️ ${story.views}</span>` : ''}
            </div>
            <p class="work-excerpt">${escapeHtml(truncateText(story.excerpt || story.content || '', 100))}</p>
        </div>
    `;
    
    card.addEventListener('click', () => {
        // Check if it's a local story or Firebase story
        if (story.isLocal || !story.authorId) {
            window.location.href = `story-local.html?id=${story.id}`;
        } else {
            window.location.href = `story.html?id=${story.id}`;
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