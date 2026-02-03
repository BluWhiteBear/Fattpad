// Google OAuth Configuration and Handlers
function handleCredentialResponse(response) {
    // Decode JWT token to get user info
    const responsePayload = decodeJwtResponse(response.credential);
    
    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Given Name: ' + responsePayload.given_name);
    console.log('Family Name: ' + responsePayload.family_name);
    console.log("Image URL: " + responsePayload.picture);
    console.log("Email: " + responsePayload.email);
    
    // Store user info and redirect
    localStorage.setItem('user', JSON.stringify({
        id: responsePayload.sub,
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture
    }));
    
    console.log('User logged in:', responsePayload);
    
    // Show success message and redirect
    showLoginSuccess(responsePayload.name);
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Traditional login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Here you would typically send credentials to your backend
        // For demo purposes, we'll simulate a successful login
        console.log('Traditional login attempt:', { email, remember });
        
        // Simulate API call
        simulateLogin(email, password, remember);
    });
});

function simulateLogin(email, password, remember) {
    // Show loading state
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing In...';
    loginBtn.disabled = true;
    
    // Simulate API delay
    setTimeout(() => {
        // Reset button
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
        
        // Simulate successful login
        const userData = {
            id: 'user_' + Date.now(),
            name: email.split('@')[0],
            email: email,
            picture: 'img/default-avatar.png'
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        showLoginSuccess(userData.name);
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }, 2000);
}

function showLoginSuccess(userName) {
    // Create success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-color);
        color: var(--text-primary);
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: 500;
    `;
    notification.textContent = `Welcome back, ${userName}!`;
    
    document.body.appendChild(notification);
    
    // Remove notification after animation
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const user = localStorage.getItem('user');
    if (user) {
        // User is already logged in, redirect to home
        window.location.href = 'index.html';
    }
});