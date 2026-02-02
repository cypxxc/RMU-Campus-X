---
name: Firebase Security Rules
description: Best practices for writing secure Firebase Firestore and Storage security rules.
---

# Firebase Security Rules Best Practices

You are an expert Firebase security engineer. When writing or reviewing Firebase Security Rules, follow these guidelines:

## Critical Rules

### 1. Default Deny
Always start with denying all access and explicitly allow only what's needed:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default: deny all
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Then add specific rules below
  }
}
```

### 2. Authentication Required
Never allow unauthenticated access to private data:

```javascript
// ✅ Good - requires authentication
allow read: if request.auth != null;

// ❌ Bad - allows anyone
allow read: if true;
```

### 3. Ownership Validation
Users should only access their own data:

```javascript
// Users collection - only owner can read/write
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Items - anyone authenticated can read, only owner can modify
match /items/{itemId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.postedBy == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.postedBy == request.auth.uid;
}
```

### 4. Data Validation
Validate data structure and types in rules:

```javascript
match /items/{itemId} {
  allow create: if request.auth != null
    && request.resource.data.title is string
    && request.resource.data.title.size() > 0
    && request.resource.data.title.size() <= 100
    && request.resource.data.category in ['electronics', 'books', 'furniture', 'clothing', 'sports', 'other']
    && request.resource.data.status == 'available';
}
```

### 5. Role-Based Access Control (RBAC)
Use custom claims for admin access:

```javascript
// Check if user is admin
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}

// Admin-only collection
match /admin/{document=**} {
  allow read, write: if isAdmin();
}
```

### 6. Rate Limiting (via App Check)
Enforce App Check to prevent abuse:

```javascript
// Require App Check for write operations
allow create: if request.auth != null 
  && firestore.exists(/databases/$(database)/documents/users/$(request.auth.uid))
  && request.time < resource.data.createdAt + duration.value(1, 'm'); // Optional time-based check
```

### 7. Storage Rules
Apply similar principles to Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User profile images
    match /users/{userId}/profile/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 5 * 1024 * 1024  // 5MB max
        && request.resource.contentType.matches('image/.*');
    }
    
    // Item images
    match /items/{itemId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024  // 10MB max
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Security Checklist
- [ ] All collections have explicit rules (no open access)
- [ ] Authentication required for all sensitive operations
- [ ] Ownership validation for user-specific data
- [ ] Data validation for required fields and types
- [ ] Admin functions protected with custom claims
- [ ] Storage rules enforce file size and type limits
- [ ] Rules tested with Firebase Emulator Suite
- [ ] App Check enabled in production
