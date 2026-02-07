/**
 * Registration Page Script  
 * Uses centralized auth-manager for all authentication operations
 */
import authManager from './auth-manager.js';

// Google Sign Up Handler
async function handleGoogleSignUp() {
    try {
        showLoading('Signing up with Google...');
        const result = await authManager.signInWithGoogle();
        
        if (result.success) {
            console.log('✅ Google sign up successful:', result.user.displayName);
            showRegisterSuccess(result.user.displayName || 'User');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showRegisterError(result.error);
        }
    } catch (error) {
        console.error('❌ Google sign up error:', error);
        showRegisterError('Failed to sign up with Google. Please try again.');
    } finally {
        hideLoading();
    }
}

// Make function available globally for Google button
window.handleGoogleSignUp = handleGoogleSignUp;

// Registration form handler
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    // Initialize auth state check
    initAuthStateListener();
    
    // Real-time password confirmation validation
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    confirmPasswordInput.addEventListener('input', function() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const displayName = document.getElementById('displayName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        // Validation
        if (!displayName) {
            showRegisterError('Please enter a display name');
            return;
        }
        
        if (displayName.length < 2) {
            showRegisterError('Display name must be at least 2 characters long');
            return;
        }
        
        if (!email) {
            showRegisterError('Please enter an email address');
            return;
        }
        
        if (password.length < 6) {
            showRegisterError('Password must be at least 6 characters long');
            return;
        }
        
        if (password !== confirmPassword) {
            showRegisterError('Passwords do not match');
            return;
        }
        
        if (!agreeTerms) {
            showRegisterError('Please agree to the Terms of Service and Privacy Policy');
            return;
        }
        
        try {
            showLoading('Creating your account...');
            const result = await authManager.signUpWithEmail(email, password, displayName);
            
            if (result.success) {
                console.log('✅ Registration successful:', result.user.email);
                showRegisterSuccess(displayName);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                // Handle specific Firebase errors with user-friendly messages
                let errorMessage = 'Registration failed. Please try again.';
                
                if (result.error.includes('email-already-in-use')) {
                    errorMessage = 'This email is already registered. Try signing in instead.';
                } else if (result.error.includes('weak-password')) {
                    errorMessage = 'Password is too weak. Please choose a stronger password.';
                } else if (result.error.includes('invalid-email')) {
                    errorMessage = 'Please enter a valid email address.';
                } else if (result.error.includes('operation-not-allowed')) {
                    errorMessage = 'Email registration is currently disabled. Please contact support.';
                }
                
                showRegisterError(errorMessage);
            }
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            showRegisterError('An unexpected error occurred. Please try again.');
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
    authManager.onAuthStateChange((user) => {
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
    const registerForm = document.getElementById('registerForm');
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = message;
    }
    
    // Disable Google sign up button if it exists
    const googleBtn = document.querySelector('[onclick="handleGoogleSignUp()"]');
    if (googleBtn) {
        googleBtn.disabled = true;
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    const registerForm = document.getElementById('registerForm');
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
    
    // Re-enable Google sign up button if it exists
    const googleBtn = document.querySelector('[onclick="handleGoogleSignUp()"]');
    if (googleBtn) {
        googleBtn.disabled = false;
    }
}

// Show success message
function showRegisterSuccess(userName) {
    const successDiv = document.getElementById('registerSuccess');
    const successText = document.getElementById('successText');
    successText.textContent = `Welcome to Fattpad, ${userName}! Redirecting...`;
    successDiv.classList.remove('d-none');
}

// Show error message
function showRegisterError(message) {
    const errorDiv = document.getElementById('registerError');
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
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    
    if (errorDiv) errorDiv.classList.add('d-none');
    if (successDiv) successDiv.classList.add('d-none');
}

// Export functions to global scope for HTML onclick handlers (if needed)
window.handleGoogleSignUp = handleGoogleSignUp;
window.clearMessages = clearMessages;

console.log('📝 Registration page initialized with auth-manager');