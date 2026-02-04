// Firebase Auth navbar management
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { firebaseConfig } from '../config/firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Navbar authentication state management
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for navbar to be populated by popComponents.js
    setTimeout(() => {
        setupAuthListener();
    }, 100);
});

function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
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
    
    if (user && loginBtn && profileBtn) {
        // User is logged in - hide login button, show profile and notifications
        loginBtn.style.display = 'none';
        profileBtn.style.display = 'flex';
        if (notificationsBtn) {
            notificationsBtn.style.display = 'flex';
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
                // Use a simple data URI for default avatar
                profileImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNFOTc3NzUiLz4KPGJ0ZXh0IHg9IjE2IiB5PSIyMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0U4RThFOCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+VTwvdGV4dD4KPHN2Zz4=';
            }
            profileImg.alt = user.name || 'Profile';
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
    
    // Determine correct paths based on current location
    const currentPath = window.location.pathname;
    const isInPagesDirectory = currentPath.includes('/pages/');
    const pagesPath = isInPagesDirectory ? '' : 'pages/';
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';
    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <img src="${user.photoURL || '/img/default-avatar.png'}" alt="${user.displayName || user.email}" class="dropdown-avatar">
            <div class="dropdown-user-info">
                <div class="dropdown-name">${user.displayName || 'User'}</div>
                <div class="dropdown-email">${user.email}</div>
            </div>
        </div>
        <hr class="dropdown-divider">
        <button class="dropdown-item" onclick="window.location.href='${pagesPath}profile.html'">
            <i class="fas fa-user"></i> Profile
        </button>
        <button class="dropdown-item" onclick="window.location.href='${pagesPath}settings.html'">
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

function toggleNotificationsDropdown() {
    // Remove existing dropdown if any
    const existingDropdown = document.querySelector('.notifications-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }

    // Create notifications dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'notifications-dropdown';
    dropdown.innerHTML = `
        <div class="notifications-dropdown-header">
            <h4>Notifications</h4>
            <button class="mark-all-read" style="display: none;">Mark all read</button>
        </div>
        <div class="notifications-list">
            <div class="notification-item sample">
                <div class="notification-content">
                    <div class="notification-text">Welcome to Fattpad! Start exploring stories or create your own.</div>
                    <div class="notification-time">Just now</div>
                </div>
                <div class="notification-badge unread"></div>
            </div>
            <div class="notification-item sample">
                <div class="notification-content">
                    <div class="notification-text">Your story publishing feature is ready to use!</div>
                    <div class="notification-time">2 hours ago</div>
                </div>
            </div>
            <div class="notification-empty" style="display: none;">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>
        </div>
        <div class="notifications-footer">
            <button class="view-all-btn">View All Notifications</button>
        </div>
    `;

    // Position dropdown
    const notificationsBtn = document.querySelector('.notifications-btn');
    const rect = notificationsBtn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';

    document.body.appendChild(dropdown);

    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeDropdownOutside);
    }, 0);
}