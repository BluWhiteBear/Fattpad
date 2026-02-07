/**
 * Notification Manager
 * Centralized notification system for the Fattpad application
 * Handles creation, reading, UI rendering, and state management of notifications
 */

import { 
    collection, 
    doc, 
    addDoc, 
    setDoc,
    updateDoc,
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

/**
 * Create a notification in the database
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.userId - User who will receive the notification
 * @param {string} notificationData.type - Notification type ('follow', 'like', 'comment', 'reply')
 * @param {string} [notificationData.message] - Custom message text
 * @param {string} [notificationData.fromUserId] - User who triggered the notification
 * @param {string} [notificationData.fromUserName] - Display name of user who triggered notification
 * @param {string} [notificationData.relatedId] - Related entity ID (story ID, comment ID, etc.)
 * @param {string} [notificationData.actionUrl] - URL to navigate when notification is clicked
 * @param {Object} [notificationData.data] - Additional data for the notification
 * @returns {Promise<string>} - Generated notification ID
 */
export async function createNotification(notificationData) {
    try {
        // Generate unique ID for the notification
        const notificationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const notification = {
            id: notificationId,
            userId: notificationData.userId,
            type: notificationData.type,
            message: notificationData.message,
            fromUserId: notificationData.fromUserId,
            fromUserName: notificationData.fromUserName,
            relatedId: notificationData.relatedId,
            actionUrl: notificationData.actionUrl,
            data: notificationData.data || {},
            read: false,
            createdAt: serverTimestamp()
        };
        
        // Use setDoc to maintain ID consistency
        const notificationRef = doc(db, 'notifications', notificationId);
        await setDoc(notificationRef, notification);
        
        console.log('✅ Notification created:', notification);
        
        // Update notification badge if function is available
        if (window.updateNotificationBadge) {
            window.updateNotificationBadge(notificationData.userId);
        }
        
        return notificationId;
        
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        throw error;
    }
}

/**
 * Legacy wrapper for backwards compatibility
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Promise<string>} - Notification ID
 */
export async function createNotificationLegacy(userId, type, data) {
    return createNotification({
        userId,
        type,
        data,
        fromUserId: data.followerId || data.fromUserId,
        fromUserName: data.followerName || data.fromUserName,
        relatedId: data.storyId || data.relatedId,
        actionUrl: data.actionUrl
    });
}

/**
 * Create specific notification types with proper formatting
 */
export const NotificationTypes = {
    /**
     * Create a follow notification
     */
    async follow(targetUserId, followerUserId, followerName) {
        return createNotification({
            userId: targetUserId,
            type: 'follow',
            message: `${followerName} started following you`,
            fromUserId: followerUserId,
            fromUserName: followerName,
            actionUrl: `profile.html?uid=${followerUserId}`,
            data: {
                followerId: followerUserId,
                followerName: followerName
            }
        });
    },

    /**
     * Create a comment notification
     */
    async comment(storyAuthorId, commenterUserId, commenterName, storyId, storyTitle, commentId) {
        return createNotification({
            userId: storyAuthorId,
            type: 'comment',
            message: `${commenterName} commented on your story`,
            fromUserId: commenterUserId,
            fromUserName: commenterName,
            relatedId: storyId,
            actionUrl: `story.html?id=${storyId}#comment-${commentId}`,
            data: {
                storyTitle,
                commentId
            }
        });
    },

    /**
     * Create a reply notification
     */
    async reply(originalCommenterUserId, replierUserId, replierName, storyId, commentId, replyId) {
        return createNotification({
            userId: originalCommenterUserId,
            type: 'reply',
            message: `${replierName} replied to your comment`,
            fromUserId: replierUserId,
            fromUserName: replierName,
            relatedId: storyId,
            actionUrl: `story.html?id=${storyId}#comment-${replyId}`,
            data: {
                commentId,
                replyId
            }
        });
    },

    /**
     * Create a like notification
     */
    async like(storyAuthorId, likerUserId, likerName, storyId, storyTitle) {
        return createNotification({
            userId: storyAuthorId,
            type: 'like',
            message: `${likerName} liked your story "${storyTitle}"`,
            fromUserId: likerUserId,
            fromUserName: likerName,
            relatedId: storyId,
            actionUrl: `story.html?id=${storyId}`,
            data: {
                storyTitle
            }
        });
    },

    /**
     * Create a comment like notification
     */
    async commentLike(commentAuthorId, likerUserId, likerName, storyId, commentId) {
        return createNotification({
            userId: commentAuthorId,
            type: 'like',
            message: `${likerName} liked your comment`,
            fromUserId: likerUserId,
            fromUserName: likerName,
            relatedId: storyId,
            actionUrl: `story.html?id=${storyId}#comment-${commentId}`,
            data: {
                commentId
            }
        });
    }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export async function markNotificationAsRead(notificationId) {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
        console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function markAllNotificationsRead(userId) {
    try {
        const notificationsRef = collection(db, 'notifications');
        const unreadQuery = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        const updatePromises = unreadSnapshot.docs.map(docSnapshot => 
            updateDoc(doc(db, 'notifications', docSnapshot.id), { read: true })
        );
        
        await Promise.all(updatePromises);
        console.log(`✅ Marked ${updatePromises.length} notifications as read for user ${userId}`);
        
        // Update badge count
        if (window.updateNotificationBadge) {
            window.updateNotificationBadge(userId);
        }
        
    } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        throw error;
    }
}

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {number} maxResults - Maximum number of notifications to return (default: 10)
 * @returns {Promise<Array>} - Array of notifications
 */
export async function getUserNotifications(userId, maxResults = 10) {
    try {
        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(maxResults)
        );

        const notificationsSnapshot = await getDocs(notificationsQuery);
        return notificationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        return [];
    }
}

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of unread notifications
 */
export async function getUnreadNotificationCount(userId) {
    try {
        const notificationsRef = collection(db, 'notifications');
        const unreadQuery = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        return unreadSnapshot.size;
        
    } catch (error) {
        console.error('❌ Error getting unread notification count:', error);
        return 0;
    }
}

/**
 * Update notification badge count in the UI
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function updateNotificationBadge(userId) {
    if (!userId) return;
    
    try {
        const unreadCount = await getUnreadNotificationCount(userId);
        
        const notificationBadge = document.querySelector('.notification-badge');
        if (notificationBadge) {
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount.toString();
                notificationBadge.style.display = 'block';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
        
        return unreadCount;
        
    } catch (error) {
        console.error('❌ Error updating notification badge:', error);
        return 0;
    }
}

/**
 * Format time difference into human-readable text
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time string
 */
export function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

/**
 * Create a notification DOM element
 * @param {Object} notification - Notification data
 * @returns {HTMLElement} - DOM element for the notification
 */
export function createNotificationElement(notification) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification-item ${!notification.read ? 'unread' : ''}`;
    
    let notificationText = '';
    let timeAgo = '';
    let actionUrl = '';
    
    // Format time
    if (notification.createdAt && notification.createdAt.toDate) {
        timeAgo = getTimeAgo(notification.createdAt.toDate());
    } else {
        timeAgo = 'Recently';
    }
    
    // Generate notification text and action URL based on type
    if (notification.message) {
        notificationText = notification.message;
    } else {
        // Fallback for older notifications
        switch (notification.type) {
            case 'follow':
                notificationText = `${notification.fromUserName || notification.data?.followerName || 'Someone'} started following you`;
                break;
            case 'like':
                notificationText = `${notification.fromUserName || 'Someone'} liked your story "${notification.data?.storyTitle || 'your story'}"`;
                break;
            case 'comment':
                notificationText = `${notification.fromUserName || 'Someone'} commented on your story`;
                break;
            case 'reply':
                notificationText = `${notification.fromUserName || 'Someone'} replied to your comment`;
                break;
            default:
                notificationText = 'New notification';
        }
    }
    
    // Determine action URL
    actionUrl = notification.actionUrl || '';
    if (!actionUrl) {
        // Fallback URL generation for older notifications
        switch (notification.type) {
            case 'follow':
                actionUrl = `profile.html?uid=${notification.data?.followerId || notification.fromUserId}`;
                break;
            case 'like':
            case 'comment':
                actionUrl = `story.html?id=${notification.relatedId}`;
                break;
            case 'reply':
                actionUrl = `story.html?id=${notification.relatedId}#comment-${notification.data?.commentId || notification.relatedId}`;
                break;
        }
    }
    
    // Make notification clickable if it has an action URL
    if (actionUrl && actionUrl !== '#') {
        notificationDiv.style.cursor = 'pointer';
        notificationDiv.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Mark notification as read if it's unread
            if (!notification.read) {
                try {
                    await markNotificationAsRead(notification.id);
                    notificationDiv.classList.remove('unread');
                    notificationDiv.querySelector('.notification-badge')?.remove();
                    
                    // Update badge count
                    const currentUser = auth.currentUser;
                    if (currentUser && window.updateNotificationBadge) {
                        window.updateNotificationBadge(currentUser.uid);
                    }
                } catch (error) {
                    console.warn('Failed to mark notification as read:', error);
                }
            }
            
            // Navigate to the action URL
            window.location.href = actionUrl;
        });
    }
    
    // Build notification HTML
    notificationDiv.innerHTML = `
        <div class="notification-content">
            <div class="notification-text">${notificationText}</div>
            <div class="notification-time">${timeAgo}</div>
        </div>
        ${!notification.read ? '<div class="notification-badge unread"></div>' : ''}
    `;
    
    return notificationDiv;
}

/**
 * Show notifications dropdown
 * @returns {Promise<void>}
 */
export async function toggleNotificationsDropdown() {
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
            <button class="mark-all-read" style="display: none;" onclick="window.NotificationManager.markAllReadHandler()">Mark all read</button>
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

/**
 * Load and display user notifications in the dropdown
 * @param {HTMLElement} dropdown - Dropdown container element
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function loadUserNotifications(dropdown, userId) {
    try {
        const notifications = await getUserNotifications(userId, 10);
        const notificationsList = dropdown.querySelector('.notifications-list');
        
        // Clear loading state
        notificationsList.innerHTML = '';

        if (notifications.length === 0) {
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
        notifications.forEach(notification => {
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

/**
 * Close dropdown when clicking outside
 * @param {Event} event - Click event
 */
function closeDropdownOutside(event) {
    const dropdown = document.querySelector('.notifications-dropdown');
    const notificationsBtn = document.querySelector('.notifications-btn');
    
    if (dropdown && notificationsBtn && 
        !dropdown.contains(event.target) && 
        !notificationsBtn.contains(event.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdownOutside);
    }
}

/**
 * Handler for mark all notifications as read button (called from HTML)
 * @returns {Promise<void>}
 */
async function markAllReadHandler() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        await markAllNotificationsRead(currentUser.uid);
        
        // Refresh the dropdown
        const dropdown = document.querySelector('.notifications-dropdown');
        if (dropdown) {
            dropdown.remove();
            await toggleNotificationsDropdown();
        }
        
    } catch (error) {
        console.error('❌ Error marking notifications as read:', error);
    }
}

// Make functions available globally for backwards compatibility and HTML onclick handlers
window.NotificationManager = {
    createNotification,
    createNotificationLegacy,
    NotificationTypes,
    markNotificationAsRead,
    markAllNotificationsRead,
    getUserNotifications,
    getUnreadNotificationCount,
    updateNotificationBadge,
    toggleNotificationsDropdown,
    markAllReadHandler
};

// Legacy global functions for backwards compatibility
window.createNotification = createNotification;
window.markNotificationAsRead = markNotificationAsRead;
window.updateNotificationBadge = updateNotificationBadge;
window.markAllNotificationsRead = markAllReadHandler;