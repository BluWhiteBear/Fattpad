// Profile Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    initProfileTabs();
    initProfileActions();
});

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
    }
    
    // Populate user information
    document.getElementById('profile-name').textContent = user.name || 'Anonymous User';
    document.getElementById('profile-email').textContent = user.email || '';
    
    const profilePicture = document.getElementById('profile-picture');
    if (user.picture) {
        profilePicture.src = user.picture;
    } else {
        // Use default avatar
        profilePicture.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYwIiBmaWxsPSIjRTk3Nzc1Ii8+Cjx0ZXh0IHg9IjYwIiB5PSI3NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0U4RThFOCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjM2IiBmb250LXdlaWdodD0iYm9sZCI+VTwvdGV4dD4KPHN2Zz4=';
    }
}

function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const panels = document.querySelectorAll('.tab-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding panel
            const targetPanel = tab.getAttribute('data-tab');
            document.getElementById(targetPanel).classList.add('active');
        });
    });
}

function initProfileActions() {
    // Edit Profile Button
    document.querySelector('.edit-profile-btn').addEventListener('click', function() {
        editProfile();
    });
    
    // Edit Avatar Button
    document.querySelector('.edit-avatar-btn').addEventListener('click', function() {
        changeAvatar();
    });
    
    // New Work Button
    document.querySelector('.new-work-btn').addEventListener('click', function() {
        createNewWork();
    });
    
    // Work action buttons
    document.querySelectorAll('.edit-work').forEach(btn => {
        btn.addEventListener('click', function() {
            const workTitle = btn.closest('.profile-work-card').querySelector('h3').textContent;
            editWork(workTitle);
        });
    });
    
    document.querySelectorAll('.delete-work').forEach(btn => {
        btn.addEventListener('click', function() {
            const workTitle = btn.closest('.profile-work-card').querySelector('h3').textContent;
            deleteWork(workTitle);
        });
    });
}

function editProfile() {
    // Create a simple edit modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--bg-secondary); padding: 32px; border-radius: 12px; max-width: 500px; width: 90%;">
            <h2 style="color: var(--accent-color); margin-top: 0;">Edit Profile</h2>
            <div style="margin-bottom: 16px;">
                <label style="color: var(--text-primary); display: block; margin-bottom: 8px;">Bio:</label>
                <textarea id="edit-bio" style="width: 100%; padding: 12px; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--accent-color); border-radius: 6px; min-height: 100px;">${document.getElementById('profile-bio').textContent}</textarea>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="closeEditModal()" style="padding: 8px 16px; background: var(--bg-primary); color: var(--text-secondary); border: 1px solid var(--text-secondary); border-radius: 6px; cursor: pointer;">Cancel</button>
                <button onclick="saveProfile()" style="padding: 8px 16px; background: var(--accent-color); color: var(--text-primary); border: none; border-radius: 6px; cursor: pointer;">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.currentEditModal = modal;
}

function closeEditModal() {
    if (window.currentEditModal) {
        window.currentEditModal.remove();
    }
}

function saveProfile() {
    const newBio = document.getElementById('edit-bio').value;
    document.getElementById('profile-bio').textContent = newBio;
    closeEditModal();
    
    // Here you would typically save to your backend
    showNotification('Profile updated successfully!');
}

function changeAvatar() {
    alert('Avatar change functionality would integrate with file upload here!');
}

function createNewWork() {
    alert('Create new work functionality would open a writing editor here!');
}

function editWork(title) {
    alert(`Edit work: ${title}`);
}

function deleteWork(title) {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
        alert(`Deleted: ${title}`);
        // Here you would remove the work card from the DOM and backend
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-color);
        color: var(--text-primary);
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}