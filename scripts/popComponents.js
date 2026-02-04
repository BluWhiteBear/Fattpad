// Automatically load navbar component into pages
document.addEventListener("DOMContentLoaded", function() {
    
    // Simplified path detection - all pages now in root directory
    const currentPath = window.location.pathname;
    
    // Define path prefixes for different types of links
    let rootPath = '';        // For going to index.html and assets - all in root now
    
    const navbarHTML = `
<nav class="navbar">
	<!-- Mobile hamburger menu -->
	<button class="mobile-menu-toggle" onclick="toggleMobileMenu()">
		<span class="hamburger-line"></span>
		<span class="hamburger-line"></span>
		<span class="hamburger-line"></span>
	</button>
	
	<!-- Logo (centered on mobile, left on desktop) -->
	<div class="navbar-logo">
		<a href="${rootPath}index.html">
			<img src="${rootPath}img/fattpad_logo_1.png" alt="Fattpad Logo" class="logo-img" style="height: 30px;">
		</a>
	</div>
	
	<!-- Desktop navigation links -->
	<ul class="navbar-links">
		<li><a href="${rootPath}">home</a></li>
		<li><a href="editor">write</a></li>
		<li><a href="#library">library</a></li>
	</ul>
	
	<!-- Desktop actions -->
	<div class="navbar-actions">
		<button class="navbar-btn" onclick="window.location.href='login'">log in</button>
		<button class="notifications-btn" style="display: none;" title="Notifications">
			<i class="fas fa-bell"></i>
			<span class="notification-badge" style="display: none;"></span>
		</button>
		<button class="profile-btn" style="display: none;">
			<img alt="profile" class="profile-img" src="${rootPath}img/pfp-default.png">
		</button>
	</div>
	
	<!-- Mobile navigation dropdown -->
	<div class="mobile-nav-dropdown" id="mobileNavDropdown">
		<div class="mobile-nav-content">
			<a href="${rootPath}" class="mobile-nav-item">home</a>
			<a href="editor" class="mobile-nav-item">write</a>
			<a href="#library" class="mobile-nav-item">library</a>
			<div class="mobile-nav-divider"></div>
			<button class="mobile-nav-btn" onclick="window.location.href='login'">log in</button>
			<button class="mobile-profile-btn" style="display: none;">
				<img alt="profile" class="mobile-profile-img" src="${rootPath}img/pfp-default.png">
				<span>profile</span>
			</button>
		</div>
	</div>
</nav>`;

    const footerHTML = `
<footer class="footer">
    <div class="footer-main">
        <ul class="footer-links">
            <li><a href="${rootPath}">home</a></li>
            <li><a href="editor">write</a></li>
            <li><a href="#library">library</a></li>
            <li><a href="tos">terms of service</a></li>
            <li class="footer-logout" style="display: none;"><a href="#" onclick="logout(); return false;">logout</a></li>
        </ul>
    </div>
    <div class="footer-bottom">
        <p>&copy; 2026 fattpad. all rights reserved.</p>
    </div>
</footer>`;

    // Insert navbar
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = navbarHTML;
        console.log('Navbar loaded successfully');
    } else {
        console.error('Navbar container not found');
    }

    // Insert footer
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = footerHTML;
        console.log('Footer loaded successfully');
    } else {
        console.error('Footer container not found');
    }
});

// Mobile menu toggle functionality
function toggleMobileMenu() {
    const dropdown = document.getElementById('mobileNavDropdown');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        toggle.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        toggle.classList.add('active');
    }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('mobileNavDropdown');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    if (dropdown && toggle && !event.target.closest('.navbar')) {
        dropdown.classList.remove('show');
        toggle.classList.remove('active');
    }
});

// Make toggleMobileMenu available globally
window.toggleMobileMenu = toggleMobileMenu;