// Settings Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initSettingsHandlers();
});

// Load saved settings from localStorage
function loadSettings() {
    // Load theme setting
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
    }
    
    // Load content rating setting
    const savedRating = localStorage.getItem('contentRating') || 'general';
    const ratingSelect = document.getElementById('content-rating');
    if (ratingSelect) {
        ratingSelect.value = savedRating;
    }
}

// Apply theme to the page (preview only - doesn't save)
function applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'light') {
        // Light theme colors
        root.style.setProperty('--bg-primary', '#E8E8E8');
        root.style.setProperty('--bg-secondary', '#CCCCCC');
        root.style.setProperty('--accent-color', '#E97775');
        root.style.setProperty('--text-primary', '#191919');
        root.style.setProperty('--text-secondary', '#7F6C6C');
    } else if (theme === 'dark') {
        // Dark theme colors (default)
        root.style.setProperty('--bg-primary', '#191919');
        root.style.setProperty('--bg-secondary', '#333333');
        root.style.setProperty('--accent-color', '#E97775');
        root.style.setProperty('--text-primary', '#E8E8E8');
        root.style.setProperty('--text-secondary', '#998282');
    } else if (theme === 'auto') {
        // Auto theme based on system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
        return;
    }
}

// Initialize event handlers
function initSettingsHandlers() {
    const themeSelect = document.getElementById('theme-select');
    const contentRatingSelect = document.getElementById('content-rating');
    const saveBtn = document.getElementById('save-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    // Theme change handler - preview only
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            const selectedTheme = this.value;
            applyTheme(selectedTheme);
        });
    }
    
    // Content rating change handler - preview only
    if (contentRatingSelect) {
        contentRatingSelect.addEventListener('change', function() {
            // Just update the UI, don't save yet
        });
    }
    
    // Save button handler
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            saveAllSettings();
        });
    }
    
    // Reset button handler
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            resetToDefaults();
        });
    }
    
    // Listen for system theme changes when auto is selected
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function(e) {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'auto') {
            applyTheme('auto');
        }
    });
}

// Save all settings
function saveAllSettings() {
    const themeSelect = document.getElementById('theme-select');
    const contentRatingSelect = document.getElementById('content-rating');
    
    let changesMade = false;
    
    if (themeSelect) {
        const theme = themeSelect.value;
        const currentTheme = localStorage.getItem('theme') || 'dark';
        if (theme !== currentTheme) {
            localStorage.setItem('theme', theme);
            applyTheme(theme);
            changesMade = true;
        }
    }
    
    if (contentRatingSelect) {
        const rating = contentRatingSelect.value;
        const currentRating = localStorage.getItem('contentRating') || 'general';
        if (rating !== currentRating) {
            localStorage.setItem('contentRating', rating);
            changesMade = true;
        }
    }
    
    if (changesMade) {
        showNotification('Settings saved successfully!', 'success');
    } else {
        showNotification('No changes to save.', 'info');
    }
}

// Reset to default settings
function resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        // Reset theme
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = 'dark';
            applyTheme('dark');
        }
        
        // Reset content rating
        const contentRatingSelect = document.getElementById('content-rating');
        if (contentRatingSelect) {
            contentRatingSelect.value = 'general';
            localStorage.setItem('contentRating', 'general');
        }
        
        showNotification('Settings reset to defaults!', 'success');
    }
}

// Show notification message
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-color);
        color: var(--text-primary);
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        style.textContent += `
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 300);
    }, 3000);
}

// Get current content rating preference
function getContentRating() {
    return localStorage.getItem('contentRating') || 'general';
}

// Get current theme preference
function getCurrentTheme() {
    return localStorage.getItem('theme') || 'dark';
}

// Export functions for use in other scripts
window.fattpadSettings = {
    getContentRating,
    getCurrentTheme,
    applyTheme
};
