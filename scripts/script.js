
// Tab switching logic for home page with Bootstrap tabs
import { getStories } from './getStories.js';

document.addEventListener('DOMContentLoaded', function() {
	// Bootstrap tab event listeners
	const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
	
	tabButtons.forEach(tabButton => {
		tabButton.addEventListener('shown.bs.tab', function(event) {
			// Extract tab type from the target (e.g., "#tab-new" -> "new")
			const targetId = event.target.getAttribute('data-bs-target');
			const tabType = targetId.replace('#tab-', '');
			
			// Load stories for the active tab
			loadTabStories(tabType);
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
	const worksGrid = document.getElementById(`${tabType}-works-grid`);
	
	// Show loading state
	worksGrid.innerHTML = '<div class="col-12"><div class="text-center p-4">Loading stories...</div></div>';
	
	try {
		let stories = [];
		
		// Use the main getStories function which handles formatting
		stories = await getStories(tabType, 9);
		console.log('getStories returned:', stories); // Debug log

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
		stories.forEach((story, index) => {
			console.log(`Processing story ${index}:`, story); // Debug log
			try {
				// Stories are already formatted by getStories()
				const storyCard = createStoryCard(story, tabType);
				worksGrid.appendChild(storyCard);
			} catch (error) {
				console.error(`Error creating card for story ${index}:`, error, story);
			}
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
	console.log('createStoryCard called with:', story, 'tabType:', tabType); // Debug log
	
	// Create Bootstrap column wrapper
	const colWrapper = document.createElement('div');
	colWrapper.className = 'col-12 col-md-6';
	
	const card = document.createElement('div');
	card.className = 'work-card';
	card.style.cursor = 'pointer';
	
	// Choose appropriate metadata based on tab type
	let metadata = '';
	switch(tabType) {
		case 'popular':
			metadata = `${(story.views || 0).toLocaleString()} reads`;
			break;
		case 'top':
			metadata = `<img src="img/bite_1.svg" alt="Bites" class="bite-icon-secondary" style="width: 14px; height: 14px; vertical-align: text-bottom;"> ${(story.likes || 0).toLocaleString()}`;
			break;
		case 'new':
		default:
			metadata = story.timeAgo || 'Unknown time';
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
			<h3 class="work-title">${story.title || 'Untitled'}</h3>
			<p class="work-author">by ${story.author || 'Anonymous'}</p>
			<p class="work-description">${story.description || 'No description available for this story.'}</p>
			${tagsHtml}
			<div class="work-meta">
				<span class="work-date">${metadata}</span>
				<span class="work-stats">${(story.wordCount || 0).toLocaleString()} words</span>
			</div>
		</div>
	`;

	// Add click handler to open story
	card.addEventListener('click', () => {
		window.location.href = `story.html?id=${story.id}`;
	});

	// Add card to column wrapper
	colWrapper.appendChild(card);
	return colWrapper;
}

// Make loadTabStories available globally for retry buttons
window.loadTabStories = loadTabStories;
