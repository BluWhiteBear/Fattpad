# Firebase Setup Guide for Fattpad

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "fattpad" or similar
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firestore Database
1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Start in **test mode** (we'll secure it later)
4. Choose a region close to your users

### Step 3: Enable Authentication
1. Go to "Authentication" → "Sign-in method"
2. Enable "Google" sign-in provider
3. Add your domain to authorized domains:
   - `localhost` (for development)
   - Your production domain when ready

### Step 4: Set Security Rules (Important!)
Before going live, secure your database:

1. Go to "Firestore Database" → "Rules"
2. Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all published stories
    match /stories/{storyId} {
      allow read: if true;
      allow write: if request.auth != null 
        || (resource == null && request.resource.data.keys().hasAll(['title', 'content', 'authorEmail']));
    }
    
    // Allow read access to published stories collection (for public feed)
    match /publishedStories/{storyId} {
      allow read: if true;
      allow write: if request.auth != null
        || (resource == null && request.resource.data.keys().hasAll(['title', 'content', 'authorEmail']));
    }
    
    // User-specific data requires authentication
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default deny for security
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click "Publish" to save the rules

### Step 5: Get Your Config
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web app" icon `</>`
4. Register your app (name it "Fattpad Web")
5. Copy the `firebaseConfig` object

### Step 6: Update Your Code
Replace the config in these files:
- `scripts/firebase-config.js`
- `scripts/home-firebase.js` 
- `scripts/editor.js`

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};
```

## 📁 Firestore Database Structure

```
fattpad-db/
├── users/{userId}/
│   └── stories/{storyId}
│       ├── title: string
│       ├── content: string
│       ├── contentRating: string
│       ├── authorId: string
│       ├── authorName: string
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       ├── wordCount: number
│       ├── isPublished: boolean
│       └── isDraft: boolean
│
└── publishedStories/{storyId}
    ├── title: string
    ├── content: string
    ├── excerpt: string
    ├── contentRating: string
    ├── authorId: string
    ├── authorName: string
    ├── publishedAt: timestamp
    ├── wordCount: number
    ├── views: number
    └── likes: number
```

## 🔐 Security Rules (Production Ready)

## 🚨 Troubleshooting

### "Missing or insufficient permissions" Error

This error occurs when Firestore security rules block your write operation.

**Quick Fix:**
1. Go to Firebase Console → Firestore Database → Rules
2. Make sure you have the security rules from Step 4 above
3. Click "Publish" to save the rules
4. Wait 1-2 minutes for rules to propagate
5. Try publishing again

**Emergency Fix (Testing Only):**
If you need immediate access, temporarily use these permissive rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    allow read, write: if true;
  }
}
```
⚠️ **Replace with secure rules before going live!**

### Other Common Issues

**Firebase not available:**
- Check your internet connection
- Verify firebase-config.js has correct configuration
- Open browser console to see detailed error messages

**Authentication not working:**
- Ensure Google sign-in is enabled in Firebase Authentication
- Check that your domain is in authorized domains list
- Clear browser cache and try again

**Stories not appearing:**
- Check browser console for errors
- Verify you're writing to the correct collection name (`stories`)
- Ensure security rules allow read access to the stories collection

## 🔐 Security Notes

The provided rules allow:
- ✅ Anyone to read published stories (for public discovery)  
- ✅ Logged-in users to write stories
- ✅ Anonymous users to write stories with required fields
- ❌ Unauthorized access to user-specific data

Replace Firestore rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own stories
    match /users/{userId}/stories/{storyId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read published stories
    match /publishedStories/{storyId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.authorId;
    }
  }
}
```

## ✨ Features You Get

### ✅ **User Stories**
- Auto-save every 10 seconds
- Manual save with Ctrl+S
- Word count tracking
- Draft/Published status

### ✅ **Discovery Feed**
- New stories
- Popular stories (by views)
- Top stories (by likes)
- Content rating filtering

### ✅ **Cross-Device Sync**
- Stories accessible from any device
- Real-time updates
- Offline fallback to localStorage

## 🧪 Testing

1. **Start local server**: `python -m http.server 8000`
2. **Go to**: `http://localhost:8000`
3. **Test flow**:
   - Log in with Google
   - Go to "Write" → Create a story
   - Save as draft
   - Publish story
   - Check it appears on home feed

## 💰 Cost Estimate

**Free Tier Limits:**
- 1GB storage
- 50K reads/day
- 20K writes/day
- 10K deletes/day

**For a writing platform:** Free tier covers thousands of users!

## 🆘 Troubleshooting

**Firebase not loading?**
- Check browser console for errors
- Verify config keys are correct
- Ensure Firestore is enabled

**Authentication issues?**
- Check authorized domains in Firebase console
- Verify Google OAuth client ID matches

**Stories not saving?**
- Check Firestore rules
- Verify user is authenticated
- Check browser network tab for errors

## 🚀 Next Steps

1. **Content Moderation**: Add reporting system
2. **Search**: Implement full-text search
3. **Comments**: Add reader feedback
4. **Tags**: Categorize stories
5. **Following**: User relationships

---

**You're all set!** 🎉 Your writing platform now has:
- ✅ Google Authentication
- ✅ Cloud Storage
- ✅ Real-time Sync  
- ✅ Content Rating
- ✅ Theme Switching

Happy writing! 📝