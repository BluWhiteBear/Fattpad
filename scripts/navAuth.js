// Firebase Auth navbar management
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from '../config/firebase-config-public.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

async function toggleNotificationsDropdown() {
    // Remove existing dropdown if any
    const existingDropdown = document.querySelector('.notifications-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Create notifications dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'notifications-dropdown';
    dropdown.innerHTML = `
        <div class="notifications-dropdown-header">
            <h4>Notifications</h4>
            <button class="mark-all-read" style="display: none;" onclick="markAllNotificationsRead()">Mark all read</button>
        </div>
        <div class="notifications-list">
            <div class="loading-notifications text-center py-3">
                <div class="spinner-border spinner-border-sm text-danger" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-2 mb-0">Loading notifications...</p>
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

    // Load real notifications
    await loadUserNotifications(dropdown, currentUser.uid);

    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeDropdownOutside);
    }, 0);
}

async function loadUserNotifications(dropdown, userId) {
    try {
        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const notificationsSnapshot = await getDocs(notificationsQuery);
        const notificationsList = dropdown.querySelector('.notifications-list');
        
        // Clear loading state
        notificationsList.innerHTML = '';

        if (notificationsSnapshot.empty) {
            notificationsList.innerHTML = `
                <div class="notification-empty text-center py-4">
                    <i class="fas fa-bell-slash fa-2x text-muted mb-3" style="opacity: 0.5;"></i>
                    <h6 class="text-muted">No notifications yet</h6>
                    <p class="text-muted mb-0 small">When people follow you or interact with your stories, you'll see notifications here.</p>
                </div>
            `;
            return;
        }

        let hasUnread = false;
        notificationsSnapshot.forEach(docSnapshot => {
            const notification = docSnapshot.data();
            if (!notification.read) hasUnread = true;
            
            const notificationElement = createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });

        // Show mark all read button if there are unread notifications
        const markAllReadBtn = dropdown.querySelector('.mark-all-read');
        if (hasUnread) {
            markAllReadBtn.style.display = 'block';
        }

    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        const notificationsList = dropdown.querySelector('.notifications-list');
        notificationsList.innerHTML = `
            <div class="notification-error text-center py-3">
                <i class="fas fa-exclamation-triangle text-warning mb-2"></i>
                <p class="text-muted mb-0">Failed to load notifications</p>
            </div>
        `;
    }
}

function createNotificationElement(notification) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification-item ${!notification.read ? 'unread' : ''}`;
    
    let notificationText = '';
    let timeAgo = '';
    
    if (notification.createdAt && notification.createdAt.toDate) {
        timeAgo = getTimeAgo(notification.createdAt.toDate());
    } else {
        timeAgo = 'Recently';
    }
    
    switch (notification.type) {
        case 'follow':
            notificationText = `${notification.data.followerName} started following you`;
            break;
        case 'like':
            notificationText = `${notification.data.likerName} liked your story "${notification.data.storyTitle}"`;
            break;
        case 'comment':
            notificationText = `${notification.data.commenterName} commented on "${notification.data.storyTitle}"`;
            break;
        default:
            notificationText = 'New notification';
    }
    
    notificationDiv.innerHTML = `
        <div class="notification-content">
            <div class="notification-text">${notificationText}</div>
            <div class="notification-time">${timeAgo}</div>
        </div>
        ${!notification.read ? '<div class="notification-badge unread"></div>' : ''}
    `;
    
    return notificationDiv;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

async function markAllNotificationsRead() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        const notificationsRef = collection(db, 'notifications');
        const unreadQuery = query(
            notificationsRef,
            where('userId', '==', currentUser.uid),
            where('read', '==', false)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        const updatePromises = unreadSnapshot.docs.map(docSnapshot => 
            updateDoc(doc(db, 'notifications', docSnapshot.id), { read: true })
        );
        
        await Promise.all(updatePromises);
        
        // Refresh the dropdown
        const dropdown = document.querySelector('.notifications-dropdown');
        if (dropdown) {
            dropdown.remove();
            toggleNotificationsDropdown();
        }
        
    } catch (error) {
        console.error('❌ Error marking notifications as read:', error);
    }
}

// Make function available globally
window.markAllNotificationsRead = markAllNotificationsRead;