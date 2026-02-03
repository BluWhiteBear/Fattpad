// Navbar authentication state management
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for navbar to be populated by popComponents.js
    setTimeout(() => {
        updateNavbarAuth();
    }, 100);
});

// Also update when page gains focus (in case user logged in from another tab)
window.addEventListener('focus', function() {
    updateNavbarAuth();
});

// Force update function that can be called externally
window.forceNavbarUpdate = function() {
    updateNavbarAuth();
};

function updateNavbarAuth() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    // Find login button by text content instead of onclick attribute
    const loginBtn = Array.from(document.querySelectorAll('.navbar-btn')).find(btn => 
        btn.textContent.trim() === 'Log In'
    );
    const profileBtn = document.querySelector('.profile-btn');
    const profileImg = document.querySelector('.profile-img');
    const footerLogout = document.querySelector('.footer-logout');
    
    console.log('updateNavbarAuth called:', { 
        hasUser: !!user, 
        userData: user,
        loginBtn: !!loginBtn, 
        profileBtn: !!profileBtn 
    });
    
    if (user && loginBtn && profileBtn) {
        // User is logged in - hide login button, show profile
        loginBtn.style.display = 'none';
        profileBtn.style.display = 'flex';
        
        // Show footer logout
        if (footerLogout) {
            footerLogout.style.display = 'block';
        }
        
        // Update profile image with user's Google picture
        if (profileImg) {
            if (user.picture) {
                profileImg.src = user.picture;
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
    } else {
        // User is not logged in - show login button, hide profile
        if (loginBtn) {
            loginBtn.style.display = 'block';
        }
        if (profileBtn) {
            profileBtn.style.display = 'none';
        }
        
        // Hide footer logout
        if (footerLogout) {
            footerLogout.style.display = 'none';
        }
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function toggleProfileDropdown(user) {
    // Remove existing dropdown if any
    const existingDropdown = document.querySelector('.profile-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';
    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <img src="${user.picture}" alt="${user.name}" class="dropdown-avatar">
            <div class="dropdown-user-info">
                <div class="dropdown-name">${user.name}</div>
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
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdownOutside);
    }
}