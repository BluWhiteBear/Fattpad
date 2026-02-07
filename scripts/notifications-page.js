/**
 * Notifications Page
 * Handles the full notifications page with filtering, pagination, and management
 */

import './firebase-config.js';
import authManager from './auth-manager.js';
import { 
    getUserNotifications, 
    markAllNotificationsRead,
    createNotificationElement 
} from './notification-manager.js';

let currentFilter = 'all';
let notificationsCache = [];
let isLoading = false;
let hasMoreNotifications = true;
const NOTIFICATIONS_PER_PAGE = 20;

/**
 * Initialize notifications page
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔔 Notifications page loaded');
    
    // Wait for authentication
    await authManager.waitForAuth();
    
    // Set up auth state listener
    authManager.onAuthStateChange((user) => {
        if (user) {
            console.log('👤 User authenticated, loading notifications');
            loadNotificationsPage();
        } else {
            console.log('❌ User not authenticated, redirecting to login');
            window.location.href = 'login.html';
        }
    });
    
    setupEventListeners();
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            setActiveFilter(filter);
        });
    });
    
    // Mark all read button
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    markAllReadBtn?.addEventListener('click', markAllNotificationsAsRead);
    
    // Load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn?.addEventListener('click', loadMoreNotifications);
}

/**
 * Set active filter and reload notifications
 */
function setActiveFilter(filter) {
    if (currentFilter === filter) return;
    
    currentFilter = filter;
    
    // Update active button
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.filter === filter);
    });
    
    // Reset state and reload
    notificationsCache = [];
    hasMoreNotifications = true;
    loadNotificationsPage();
}

/**
 * Load notifications based on current filter
 */
async function loadNotificationsPage() {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;
    
    showLoadingState();
    isLoading = true;
    
    try {
        // Load notifications from the notification manager
        const notifications = await getUserNotifications(currentUser.uid, NOTIFICATIONS_PER_PAGE * 2); // Load more for filtering
        
        console.log(`📥 Loaded ${notifications.length} notifications`);
        
        // Store in cache and filter
        notificationsCache = notifications;
        const filteredNotifications = filterNotifications(notifications);
        
        await displayNotifications(filteredNotifications);
        updateMarkAllReadButton(filteredNotifications);
        
        // Check if we have more notifications
        hasMoreNotifications = notifications.length >= NOTIFICATIONS_PER_PAGE * 2;
        updateLoadMoreButton();
        
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        showErrorState();
    } finally {
        isLoading = false;
    }
}

/**
 * Filter notifications based on current filter
 */
function filterNotifications(notifications) {
    if (currentFilter === 'all') {
        return notifications;
    }
    
    if (currentFilter === 'unread') {
        return notifications.filter(n => !n.read);
    }
    
    // Filter by notification type
    return notifications.filter(n => n.type === currentFilter);
}

/**
 * Display notifications in the list
 */
async function displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    const loadingState = document.getElementById('loading-notifications');
    const emptyState = document.getElementById('empty-notifications');
    const errorState = document.getElementById('error-notifications');
    
    // Hide all states
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    
    if (notifications.length === 0) {
        emptyState.style.display = 'block';
        container.innerHTML = '';
        return;
    }
    
    // Create notification elements
    container.innerHTML = '';
    
    const notificationElements = await Promise.all(
        notifications.map(async notification => {
            const element = await createNotificationElement(notification);
            element.classList.add('notifications-page-item');
            return element;
        })
    );
    
    notificationElements.forEach(element => {
        container.appendChild(element);
    });
    
    console.log(`✅ Displayed ${notifications.length} notifications`);
}

/**
 * Load more notifications (pagination)
 */
async function loadMoreNotifications() {
    if (isLoading || !hasMoreNotifications) return;
    
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;
    
    isLoading = true;
    const loadMoreBtn = document.getElementById('load-more-btn');
    const originalText = loadMoreBtn.innerHTML;
    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading...';
    loadMoreBtn.disabled = true;
    
    try {
        // This is a simplified version - in a real app you'd implement proper pagination
        // For now, we'll just load more and append
        const moreNotifications = await getUserNotifications(currentUser.uid, NOTIFICATIONS_PER_PAGE * 3);
        
        // Filter out notifications we already have
        const newNotifications = moreNotifications.slice(notificationsCache.length);
        
        if (newNotifications.length === 0) {
            hasMoreNotifications = false;
            updateLoadMoreButton();
            return;
        }
        
        // Add to cache and display
        notificationsCache.push(...newNotifications);
        const filteredNew = filterNotifications(newNotifications);
        
        if (filteredNew.length > 0) {
            await appendNotifications(filteredNew);
        }
        
        // Update button state
        hasMoreNotifications = newNotifications.length >= NOTIFICATIONS_PER_PAGE;
        updateLoadMoreButton();
        
    } catch (error) {
        console.error('❌ Error loading more notifications:', error);
    } finally {
        isLoading = false;
        loadMoreBtn.innerHTML = originalText;
        loadMoreBtn.disabled = false;
    }
}

/**
 * Append notifications to existing list
 */
async function appendNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    
    const notificationElements = await Promise.all(
        notifications.map(async notification => {
            const element = await createNotificationElement(notification);
            element.classList.add('notifications-page-item');
            return element;
        })
    );
    
    notificationElements.forEach(element => {
        container.appendChild(element);
    });
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsAsRead() {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;
    
    const markAllBtn = document.getElementById('mark-all-read-btn');
    const originalText = markAllBtn.innerHTML;
    markAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Marking...';
    markAllBtn.disabled = true;
    
    try {
        await markAllNotificationsRead(currentUser.uid);
        
        // Update UI - remove unread styling
        const notifications = document.querySelectorAll('.notification-item.unread');
        notifications.forEach(notification => {
            notification.classList.remove('unread');
            const badge = notification.querySelector('.notification-badge.unread');
            if (badge) badge.remove();
        });
        
        // Update cache
        notificationsCache.forEach(notification => {
            notification.read = true;
        });
        
        // Hide mark all read button
        markAllBtn.style.display = 'none';
        
        console.log('✅ All notifications marked as read');
        
    } catch (error) {
        console.error('❌ Error marking notifications as read:', error);
    } finally {
        markAllBtn.innerHTML = originalText;
        markAllBtn.disabled = false;
    }
}

/**
 * Update mark all read button visibility
 */
function updateMarkAllReadButton(notifications) {
    const markAllBtn = document.getElementById('mark-all-read-btn');
    const hasUnread = notifications.some(n => !n.read);
    
    if (markAllBtn) {
        markAllBtn.style.display = hasUnread ? 'block' : 'none';
    }
}

/**
 * Update load more button visibility
 */
function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (loadMoreContainer) {
        loadMoreContainer.style.display = hasMoreNotifications ? 'block' : 'none';
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    const loadingState = document.getElementById('loading-notifications');
    const emptyState = document.getElementById('empty-notifications');
    const errorState = document.getElementById('error-notifications');
    
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    
    document.getElementById('notifications-list').innerHTML = '';
}

/**
 * Show error state
 */
function showErrorState() {
    const loadingState = document.getElementById('loading-notifications');
    const emptyState = document.getElementById('empty-notifications');
    const errorState = document.getElementById('error-notifications');
    
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'block';
    
    document.getElementById('notifications-list').innerHTML = '';
}

// Make loadNotificationsPage available globally for the retry button
window.loadNotificationsPage = loadNotificationsPage;