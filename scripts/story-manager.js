// Story Management with Firebase
import { db, auth } from './firebase-config.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Story operations
export class StoryManager {
  
  // Save a story to Firebase
  static async saveStory(storyData) {
    if (!auth.currentUser) {
      throw new Error('User must be logged in to save stories');
    }
    
    const storyId = storyData.id || this.generateStoryId();
    const userId = auth.currentUser.uid;
    
    const storyRef = doc(db, 'users', userId, 'stories', storyId);
    
    const storyToSave = {
      ...storyData,
      id: storyId,
      authorId: userId,
      authorName: auth.currentUser.displayName,
      updatedAt: serverTimestamp(),
      wordCount: this.countWords(storyData.content),
      ...(storyData.id ? {} : { createdAt: serverTimestamp() })
    };
    
    await setDoc(storyRef, storyToSave, { merge: true });
    return storyId;
  }
  
  // Get a specific story
  static async getStory(storyId) {
    if (!auth.currentUser) return null;
    
    const userId = auth.currentUser.uid;
    const storyRef = doc(db, 'users', userId, 'stories', storyId);
    const storySnap = await getDoc(storyRef);
    
    if (storySnap.exists()) {
      return { id: storySnap.id, ...storySnap.data() };
    }
    return null;
  }
  
  // Get all user stories
  static async getUserStories(sortBy = 'updatedAt') {
    if (!auth.currentUser) return [];
    
    const userId = auth.currentUser.uid;
    const storiesRef = collection(db, 'users', userId, 'stories');
    const q = query(storiesRef, orderBy(sortBy, 'desc'));
    
    const querySnapshot = await getDocs(q);
    const stories = [];
    
    querySnapshot.forEach((doc) => {
      stories.push({ id: doc.id, ...doc.data() });
    });
    
    return stories;
  }
  
  // Delete a story
  static async deleteStory(storyId) {
    if (!auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    const storyRef = doc(db, 'users', userId, 'stories', storyId);
    await deleteDoc(storyRef);
  }
  
  // Publish/unpublish a story
  static async updateStoryStatus(storyId, isPublished) {
    if (!auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    const storyRef = doc(db, 'users', userId, 'stories', storyId);
    
    await updateDoc(storyRef, {
      isPublished,
      publishedAt: isPublished ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });
  }
  
  // Get published stories for discovery feed
  static async getPublishedStories(filterBy = 'new', contentRating = 'E') {
    const storiesRef = collection(db, 'publishedStories');
    let q;
    
    switch (filterBy) {
      case 'popular':
        q = query(
          storiesRef,
          where('isPublished', '==', true),
          where('contentRating', '<=', contentRating),
          orderBy('views', 'desc'),
          orderBy('createdAt', 'desc')
        );
        break;
      case 'top':
        q = query(
          storiesRef,
          where('isPublished', '==', true),
          where('contentRating', '<=', contentRating),
          orderBy('likes', 'desc'),
          orderBy('createdAt', 'desc')
        );
        break;
      default: // new
        q = query(
          storiesRef,
          where('isPublished', '==', true),
          where('contentRating', '<=', contentRating),
          orderBy('publishedAt', 'desc')
        );
    }
    
    const querySnapshot = await getDocs(q);
    const stories = [];
    
    querySnapshot.forEach((doc) => {
      stories.push({ id: doc.id, ...doc.data() });
    });
    
    return stories;
  }
  
  // Helper functions
  static generateStoryId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
  
  static countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  static formatLastModified(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }
}

// Auto-save functionality
export class AutoSave {
  constructor(storyId, saveCallback, interval = 30000) { // 30 seconds
    this.storyId = storyId;
    this.saveCallback = saveCallback;
    this.interval = interval;
    this.timeoutId = null;
    this.lastContent = '';
  }
  
  // Schedule a save
  scheduleSave(content) {
    if (content === this.lastContent) return;
    
    this.lastContent = content;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.saveCallback(content);
    }, this.interval);
  }
  
  // Force immediate save
  forceSave(content) {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.lastContent = content;
    this.saveCallback(content);
  }
  
  // Stop auto-save
  stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}