// Automatically load navbar component into pages
document.addEventListener("DOMContentLoaded", function() {
    
    // Simplified path detection for both local and GitHub Pages
    const currentPath = window.location.pathname;
    const isInPagesDirectory = currentPath.includes('/pages/');
    
    // For GitHub Pages and local development
    let pathPrefix = '';
    
    if (isInPagesDirectory) {
        // If we're in a pages subdirectory, go up one level
        pathPrefix = '../';
    } else {
        // If we're in the root, use relative paths
        pathPrefix = '';
    }
    
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
		<a href="${pathPrefix}index.html">
			<img src="${pathPrefix}img/fattpad_logo_1.png" alt="Fattpad Logo" class="logo-img" style="height: 30px;">
		</a>
	</div>
	
	<!-- Desktop navigation links -->
	<ul class="navbar-links">
		<li><a href="${pathPrefix}index.html">home</a></li>
		<li><a href="#explore">explore</a></li>
		<li><a href="${pathPrefix}pages/editor.html">write</a></li>
		<li><a href="#library">library</a></li>
	</ul>
	
	<!-- Desktop actions -->
	<div class="navbar-actions">
		<button class="navbar-btn" onclick="window.location.href='${pathPrefix}pages/login.html'">log in</button>
		<button class="profile-btn" style="display: none;">
			<img alt="profile" class="profile-img">
		</button>
	</div>
	
	<!-- Mobile navigation dropdown -->
	<div class="mobile-nav-dropdown" id="mobileNavDropdown">
		<div class="mobile-nav-content">
			<a href="${pathPrefix}index.html" class="mobile-nav-item">home</a>
			<a href="#explore" class="mobile-nav-item">explore</a>
			<a href="${pathPrefix}pages/editor.html" class="mobile-nav-item">write</a>
			<a href="#library" class="mobile-nav-item">library</a>
			<div class="mobile-nav-divider"></div>
			<button class="mobile-nav-btn" onclick="window.location.href='${pathPrefix}pages/login.html'">log in</button>
			<button class="mobile-profile-btn" style="display: none;">
				<img alt="profile" class="mobile-profile-img">
				<span>profile</span>
			</button>
		</div>
	</div>
</nav>`;

    const footerHTML = `
<footer class="footer">
    <div class="footer-main">
        <ul class="footer-links">
            <li><a href="${pathPrefix}index.html">home</a></li>
            <li><a href="#explore">explore</a></li>
            <li><a href="#write">write</a></li>
            <li><a href="#library">library</a></li>
            <li><a href="#profile">profile</a></li>
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