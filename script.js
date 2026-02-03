
// Tab switching logic for home page
import { getNewStories, getPopularStories, getTopStories, formatStoryForDisplay } from './getStories.js';

document.addEventListener('DOMContentLoaded', function() {
	const tabBtns = document.querySelectorAll('.tab-btn');
	const tabPanels = document.querySelectorAll('.tab-panel');

	tabBtns.forEach(btn => {
		btn.addEventListener('click', function() {
			// Remove active from all buttons
			tabBtns.forEach(b => b.classList.remove('active'));
			// Hide all panels
			tabPanels.forEach(panel => panel.classList.remove('active'));

			// Activate clicked button
			btn.classList.add('active');
			// Show corresponding panel
			const tab = btn.getAttribute('data-tab');
			const targetPanel = document.getElementById('tab-' + tab);
			targetPanel.classList.add('active');

			// Load stories for the active tab
			loadTabStories(tab);
		});
	});

	// Load initial stories for the default tab (new)
	loadTabStories('new');
});

/**
 * Load stories for a specific tab
 * @param {string} tabType - 'new', 'popular', or 'top'
 */
async function loadTabStories(tabType) {
	const tabPanel = document.getElementById(`tab-${tabType}`);
	const worksGrid = tabPanel.querySelector('.works-grid');
	
	// Show loading state
	worksGrid.innerHTML = '<div class="loading-spinner">Loading stories...</div>';
	
	try {
		let stories = [];
		
		switch(tabType) {
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

		// Clear loading and render stories
		worksGrid.innerHTML = '';
		
		if (stories.length === 0) {
			worksGrid.innerHTML = `
				<div class="no-stories">
					<h3>No stories found</h3>
					<p>Be the first to publish a story!</p>
					<a href="editor.html" class="btn btn-primary">Write a Story</a>
				</div>
			`;
			return;
		}

		// Render story cards
		stories.forEach(story => {
			const formattedStory = formatStoryForDisplay(story);
			const storyCard = createStoryCard(formattedStory, tabType);
			worksGrid.appendChild(storyCard);
		});

	} catch (error) {
		console.error(`Error loading ${tabType} stories:`, error);
		worksGrid.innerHTML = `
			<div class="error-state">
				<h3>Unable to load stories</h3>
				<p>Please check your connection and try again.</p>
				<button onclick="loadTabStories('${tabType}')" class="btn btn-secondary">Retry</button>
			</div>
		`;
	}
}

/**
 * Create a story card element
 * @param {Object} story - Formatted story object
 * @param {string} tabType - Type of tab for appropriate metadata display
 * @returns {HTMLElement} Story card element
 */
function createStoryCard(story, tabType) {
	const card = document.createElement('div');
	card.className = 'work-card';
	card.style.cursor = 'pointer';
	
	// Choose appropriate metadata based on tab type
	let metadata = '';
	switch(tabType) {
		case 'popular':
			metadata = `Views: ${story.views.toLocaleString()}`;
			break;
		case 'top':
			metadata = `❤️ ${story.likes.toLocaleString()}`;
			break;
		case 'new':
		default:
			metadata = `Uploaded: ${story.timeAgo}`;
			break;
	}

	// Build the card HTML
	card.innerHTML = `
		<div class="story-header">
			<h3 class="story-title">${story.title}</h3>
			<div class="content-rating ${story.contentRating}">${story.contentRating.toUpperCase()}</div>
		</div>
		<p class="story-excerpt">${story.excerpt}</p>
		<div class="story-author">
			${story.authorPicture ? 
				`<img src="${story.authorPicture}" alt="${story.author}" class="author-avatar">` : 
				`<div class="author-avatar-placeholder">${story.author.charAt(0).toUpperCase()}</div>`
			}
			<span>by ${story.author}</span>
		</div>
		<div class="story-stats">
			<span class="story-meta">${metadata}</span>
			<span class="word-count">${story.wordCount.toLocaleString()} words</span>
		</div>
	`;

	// Add click handler to open story
	card.addEventListener('click', () => {
		window.location.href = `story.html?id=${story.id}`;
	});

	return card;
}

// Make loadTabStories available globally for retry buttons
window.loadTabStories = loadTabStories;
