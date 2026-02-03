// Automatically load navbar component into pages
document.addEventListener("DOMContentLoaded", function() {
    
    const navbarHTML = `
<nav class="navbar">
	<div class="navbar-logo">
		<a href="index.html">
			<span class="logo-text">fattpad</span>
		</a>
	</div>
	<ul class="navbar-links">
		<li><a href="index.html">home</a></li>
		<li><a href="#explore">explore</a></li>
		<li><a href="editor.html">write</a></li>
		<li><a href="#library">library</a></li>
	</ul>
	<div class="navbar-actions">
		<button class="navbar-btn" onclick="window.location.href='login.html'">log in</button>
		<button class="profile-btn" style="display: none;">
			<img alt="profile" class="profile-img">
		</button>
	</div>
</nav>`;

    const footerHTML = `
<footer class="footer">
    <div class="footer-main">
        <ul class="footer-links">
            <li><a href="index.html">home</a></li>
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