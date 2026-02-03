
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
			metadata = `${story.views.toLocaleString()} reads`;
			break;
		case 'top':
			metadata = `❤️ ${story.likes.toLocaleString()}`;
			break;
		case 'new':
		default:
			metadata = story.timeAgo;
			break;
	}

	// Use cover image if available, otherwise use book icon placeholder
	const coverImageHtml = story.coverImage ? 
		`<img src="${story.coverImage}" alt="${story.title} Cover" class="cover-image">` :
		`<div class="cover-placeholder"><i class="fas fa-book"></i></div>`;

	// Create tags HTML (show first 5 tags)
	let tagsHtml = '';
	if (story.tags && story.tags.length > 0) {
		const displayTags = story.tags.slice(0, 5);
		tagsHtml = `
			<div class="work-tags">
				${displayTags.map(tag => `<span class="work-tag">${tag}</span>`).join('')}
			</div>
		`;
	}

	// Build the card HTML with new structure
	card.innerHTML = `
		<div class="work-cover">
			${coverImageHtml}
		</div>
		<div class="work-info">
			<h3 class="work-title">${story.title}</h3>
			<p class="work-author">by ${story.author}</p>
			<p class="work-description">${story.description || 'No description available for this story.'}</p>
			${tagsHtml}
			<div class="work-meta">
				<span class="work-date">${metadata}</span>
				<span class="work-stats">${story.wordCount.toLocaleString()} words</span>
			</div>
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
