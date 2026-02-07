// Firebase Auth navbar management
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { updateNotificationBadge, toggleNotificationsDropdown } from './notification-manager.js';
import authManager from './auth-manager.js';

// Navbar authentication state management
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for auth manager to initialize
    await authManager.waitForAuth();
    
    // Wait for navbar to be populated by popComponents.js with retry mechanism
    setupAuthListenerWithRetry();
});

function setupAuthListenerWithRetry() {
    const maxRetries = 10;
    let retryCount = 0;
    
    function trySetup() {
        const notificationsBtn = document.querySelector('.notifications-btn');
        const profileBtn = document.querySelector('.profile-btn');
        
        if (notificationsBtn && profileBtn) {
            // Elements found, set up the auth listener
            setupAuthListener();
        } else if (retryCount < maxRetries) {
            // Elements not found yet, retry in 50ms
            retryCount++;
            setTimeout(trySetup, 50);
        } else {
            // Max retries reached, set up anyway (fallback)
            console.warn('Navigation elements not found after retries, setting up auth anyway');
            setupAuthListener();
        }
    }
    
    trySetup();
}

function setupAuthListener() {
    // Use auth manager instead of direct Firebase auth listener
    authManager.onAuthStateChange((user, previousUser) => {
        updateNavbarAuth(user);
    });
}

function updateNavbarAuth(user = null) {
    // If user is null, check auth.currentUser
    if (user === null) {
        user = auth.currentUser;
    }
    
    // Find login button by text content instead of onclick attribute
    const loginBtn = Array.from(document.querySelectorAll('.navbar-btn')).find(btn => 
        btn.textContent.trim().toLowerCase() === 'log in'
    );
    const profileBtn = document.querySelector('.profile-btn');
    const profileImg = document.querySelector('.profile-img');
    const notificationsBtn = document.querySelector('.notifications-btn');
    const footerLogout = document.querySelector('.footer-logout');
    
    console.log('updateNavbarAuth called:', { 
        hasUser: !!user, 
        userData: user,
        loginBtn: !!loginBtn, 
        profileBtn: !!profileBtn,
        notificationsBtn: !!notificationsBtn
    });
    
    if (user && profileBtn) {
        // User is logged in - hide login button, show profile and notifications
        if (loginBtn) {
            loginBtn.style.display = 'none';
        }
        profileBtn.style.display = 'flex';
        
        // Always try to show notifications button if it exists
        if (notificationsBtn) {
            notificationsBtn.style.display = 'flex';
            // Load and update notification badge count
            updateNotificationBadge(user.uid);
            console.log('Notifications button made visible');
        } else {
            console.warn('Notifications button not found in DOM');
        }
        
        // Show footer logout
        if (footerLogout) {
            footerLogout.style.display = 'block';
        }
        
        // Update profile image with user's photo
        if (profileImg) {
            if (user.photoURL) {
                profileImg.src = user.photoURL;
            } else {
                // Use default profile picture
                profileImg.src = 'img/pfp-default.png';
            }
            profileImg.alt = user.displayName || user.email || 'Profile';
            
            // Add error handler in case the image fails to load
            profileImg.onerror = function() {
                console.warn('Failed to load profile image, using default');
                this.src = 'img/pfp-default.png';
                this.onerror = null; // Prevent infinite loop
            };
        }
        
        // Add click handler to profile button
        profileBtn.onclick = function(e) {
            e.stopPropagation();
            toggleProfileDropdown(user);
        };

        // Add click handler to notifications button
        if (notificationsBtn) {
            notificationsBtn.onclick = function(e) {
                e.stopPropagation();
                toggleNotificationsDropdown();
            };
        }
    } else {
        // User is not logged in - show login button, hide profile
        if (loginBtn) {
            loginBtn.style.display = 'block';
        }
        if (profileBtn) {
            profileBtn.style.display = 'none';
        }
        if (notificationsBtn) {
            notificationsBtn.style.display = 'none';
        }
        
        // Hide footer logout
        if (footerLogout) {
            footerLogout.style.display = 'none';
        }
    }
}

function logout() {
    signOut(auth).then(() => {
        // Sign-out successful
        console.log('User signed out');
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

// Make logout function available globally
window.logout = logout;

function toggleProfileDropdown(user) {
    // Remove existing dropdown if any
    const existingDropdown = document.querySelector('.profile-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }
    
    // Create dropdown - all pages now in root directory
    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';
    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <img src="${user.photoURL || '/img/default-avatar.png'}" alt="${user.displayName || 'User'}" class="dropdown-avatar">
            <div class="dropdown-user-info">
                <div class="dropdown-name">${user.displayName || 'User'}</div>
                <div class="dropdown-email">${user.email}</div>
            </div>
        </div>
        <hr class="dropdown-divider">
        <button class="dropdown-item" onclick="window.location.href='profile.html'">
            <i class="fas fa-user"></i> Profile
        </button>
        <button class="dropdown-item" onclick="window.location.href='settings.html'">
            <i class="fas fa-cog"></i> Settings
        </button>
        <button class="dropdown-item logout-btn" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;
    
    // Position dropdown
    const profileBtn = document.querySelector('.profile-btn');
    const rect = profileBtn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    
    document.body.appendChild(dropdown);
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeDropdownOutside);
    }, 0);
}

function closeDropdownOutside(e) {
    const dropdown = document.querySelector('.profile-dropdown');
    const notificationDropdown = document.querySelector('.notifications-dropdown');
    
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdownOutside);
    }
    
    if (notificationDropdown && !notificationDropdown.contains(e.target) && !e.target.closest('.notifications-btn')) {
        notificationDropdown.remove();
        document.removeEventListener('click', closeDropdownOutside);
    }
}

// Use the imported functions from notification-manager
// All notification logic has been moved to notification-manager.js