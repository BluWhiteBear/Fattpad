/**
 * Login Page Script
 * Uses centralized auth-manager for all authentication operations
 */
import authManager from './auth-manager.js';

// Google Sign In Handler
async function handleGoogleSignIn() {
    try {
        showLoading('Signing in with Google...');
        const result = await authManager.signInWithGoogle();
        
        if (result.success) {
            console.log('✅ Google sign in successful:', result.user.displayName);
            showLoginSuccess(result.user.displayName || 'User');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showLoginError(result.error);
        }
    } catch (error) {
        console.error('❌ Google sign in error:', error);
        showLoginError('Failed to sign in with Google. Please try again.');
    } finally {
        hideLoading();
    }
}

// Make function available globally for Google button
window.handleGoogleSignIn = handleGoogleSignIn;

// Email/Password login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    // Initialize auth state check
    initAuthStateListener();
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Basic validation
        if (!email || !password) {
            showLoginError('Please enter both email and password');
            return;
        }
        
        try {
            showLoading('Signing in...');
            const result = await authManager.signInWithEmail(email, password);
            
            if (result.success) {
                console.log('✅ Email sign in successful:', result.user.email);
                
                // Handle remember me (could store preference in localStorage if needed)
                if (remember) {
                    localStorage.setItem('fattpad_remember_user', 'true');
                }
                
                showLoginSuccess(result.user.displayName || result.user.email);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                // Handle specific error messages
                let errorMessage = 'Invalid email or password';
                if (result.error.includes('user-not-found')) {
                    errorMessage = 'No account found with this email address';
                } else if (result.error.includes('wrong-password')) {
                    errorMessage = 'Incorrect password';
                } else if (result.error.includes('invalid-email')) {
                    errorMessage = 'Please enter a valid email address';
                } else if (result.error.includes('user-disabled')) {
                    errorMessage = 'This account has been disabled';
                }
                showLoginError(errorMessage);
            }
        } catch (error) {
            console.error('❌ Email sign in error:', error);
            showLoginError('Sign in failed. Please try again.');
        } finally {
            hideLoading();
        }
    });
});

/**
 * Initialize authentication state listener
 */
function initAuthStateListener() {
    // Check if user is already logged in and redirect
    authManager.onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ User already authenticated, redirecting to home');
            window.location.href = 'index.html';
        }
    });
}

/**
 * Show loading state
 */
function showLoading(message = 'Loading...') {
    const loginForm = document.getElementById('loginForm');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = message;
    }
    
    // Disable Google sign in button
    const googleBtn = document.querySelector('[onclick="handleGoogleSignIn()"]');
    if (googleBtn) {
        googleBtn.disabled = true;
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loginForm = document.getElementById('loginForm');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'sign in';
    }
    
    // Re-enable Google sign in button
    const googleBtn = document.querySelector('[onclick="handleGoogleSignIn()"]');
    if (googleBtn) {
        googleBtn.disabled = false;
    }
}

function showLoginSuccess(userName) {
    const successDiv = document.getElementById('loginSuccess');
    const successText = document.getElementById('successText');
    successText.textContent = `Welcome back, ${userName}!`;
    successDiv.classList.remove('d-none');
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorDiv.classList.remove('d-none');
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorDiv.classList.add('d-none');
    }, 5000);
}

/**
 * Clear any error/success messages
 */
function clearMessages() {
    const errorDiv = document.getElementById('loginError');
    const successDiv = document.getElementById('loginSuccess');
    
    if (errorDiv) errorDiv.classList.add('d-none');
    if (successDiv) successDiv.classList.add('d-none');
}

// Export functions to global scope for HTML onclick handlers
window.handleGoogleSignIn = handleGoogleSignIn;
window.clearMessages = clearMessages;

console.log('🔐 Login page initialized with auth-manager');