# Quick Reference Guide

> **Purpose**: Fast lookup for common patterns, endpoints, and data structures. For complete details, see the full documentation files.

---

## 🚀 API Endpoints Cheat Sheet

### Base Configuration
```
Base URL: http://localhost:5001
API Version: v1
Content-Type: application/json (except file uploads)
Auth Header: Authorization: Bearer <access_token>
```

### Authentication (No Auth Required)
```bash
POST   /api/v1/register          # Register new user
POST   /api/v1/login             # Login (get tokens)
POST   /api/v1/token/refresh     # Refresh access token
POST   /api/v1/logout            # Logout (revoke refresh token)
```

### User (Auth Required)
```bash
GET    /api/v1/me                # Get current user profile
```

### Garment Processing
```bash
POST   /process/extract          # Extract garment with Gemini (Auth Required)
POST   /process/segment          # Segment garment (Phase 2, not implemented)
POST   /process/thumbnail        # Generate thumbnail (Phase 2, not implemented)
```

### Body References (Auth Required)
```bash
POST   /bodies                   # Upload body/selfie image
GET    /bodies                   # List all body images
DELETE /bodies/<id>              # Delete body image
```

### Wardrobe Management (Auth Required)
```bash
GET    /wardrobe/items                    # List all wardrobe items
POST   /wardrobe/items/<id>/attributes    # Update item metadata
GET    /wardrobe/filter                   # Filter items by metadata
```

### Virtual Try-On (Auth Required)
```bash
POST   /tryon/lowres             # Low-res preview (fast)
POST   /tryon/highres            # High-res with Gemini (async)
GET    /tryon/result/<job_id>    # Poll for high-res result
GET    /tryon/images             # Get try-on history
```

### Utilities
```bash
GET    /health                   # Health check
POST   /feedback                 # Submit feedback (Phase 6, not implemented)
POST   /suggest                  # Outfit suggestions (Phase 6, not implemented)
```

---

## 📦 Data Models Quick Reference

### User
```typescript
{
  id: string;              // UUID
  email: string;           // Unique, indexed
  role: string;            // 'user' | 'admin'
  created_at: string;      // ISO 8601
}
```

### WardrobeItem
```typescript
{
  id: string;              // UUID
  user_id: string;         // UUID, indexed
  category: string;        // 'top' | 'bottom' | 'dress' | 'shoes' | 'outerwear' | 'accessory'
  image_url: string;       // S3 URL or path
  name: string;            // Optional user name
  created_at: string;      // ISO 8601
  updated_at: string;      // ISO 8601
  
  // Optional metadata (from Gemini extraction)
  description?: string;
  colors?: string[];
  dominant_color?: string;
  pattern?: string;
  fabric_type?: string;
  formality_level?: string;
  occasion?: string[];
  mood?: string[];
  weather_suitability?: string[];
  season?: string[];
  style_tags?: string[];
}
```

### Body
```typescript
{
  id: string;              // UUID
  user_id: string;         // UUID, indexed
  image_url: string;       // S3 URL or path
  created_at: string;      // ISO 8601
}
```

### TryOnImage
```typescript
{
  id: string;              // UUID
  user_id: string;         // UUID, indexed
  job_id: string;          // Job identifier
  image_url: string;       // S3 URL or path
  processing_time_ms: number;
  created_at: string;      // ISO 8601
}
```

### RefreshToken
```typescript
{
  id: string;              // UUID
  user_id: string;         // UUID
  jti: string;             // JWT Token ID (unique, indexed)
  issued_at: string;       // ISO 8601
  expires_at: string;      // ISO 8601
  revoked_at?: string;     // ISO 8601 (null = active)
  replaced_by_jti?: string; // For token rotation
}
```

---

## 🔐 Authentication Flow

### 1. Register
```typescript
POST /api/v1/register
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (201):
{
  "message": "User registered successfully",
  "user": { id, email, created_at, is_active }
}
```

### 2. Login
```typescript
POST /api/v1/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "access_token": "ey...",
  "expires_in": 900,              // 15 minutes
  "refresh_token": "def...",
  "refresh_expires_in": 2592000,  // 30 days
  "token_type": "Bearer"
}
```

### 3. Use Access Token
```typescript
GET /api/v1/me
Headers: {
  "Authorization": "Bearer <access_token>"
}
```

### 4. Refresh Token (before expiry)
```typescript
POST /api/v1/token/refresh
{
  "refresh_token": "def..."
}

Response (200):
{
  "access_token": "ey...",       // New access token
  "expires_in": 900,
  "refresh_token": "new_def...", // New refresh token (rotated)
  "refresh_expires_in": 2592000,
  "token_type": "Bearer"
}
```

### 5. Logout
```typescript
POST /api/v1/logout
{
  "refresh_token": "def..."
}

Response (200):
{
  "message": "Logged out successfully"
}
```

---

## 🎨 Complete Try-On Workflow (ID-Based)

### Step 1: Upload Body Reference (One-time)
```typescript
POST /bodies
Content-Type: multipart/form-data

file: <image_file>

Response (201):
{
  "message": "Body image uploaded successfully",
  "body": {
    "id": "body_abc123",
    "user_id": "user_456",
    "image_url": "https://s3.amazonaws.com/...",
    "created_at": "2024-12-16T12:00:00Z"
  }
}
```

### Step 2: Extract Garments to Wardrobe
```typescript
POST /process/extract
Content-Type: multipart/form-data

image: <garment_image>
type_hint: "top"  // Optional

Response (200):
{
  "garment_url": "https://s3.amazonaws.com/...",
  "garment_key": "extracted/abc123.png",
  "wardrobe_item_id": "item_def456",
  "processing_time_ms": 3450,
  "model": "gemini-2.0-flash-exp",
  "metadata": {
    "title": "Blue Denim Shirt",
    "category": "top",
    "colors": ["light blue", "white"],
    "formality_level": "casual",
    ...
  },
  "wardrobe_item": {
    "id": "item_def456",
    "user_id": "user_456",
    "name": "Blue Denim Shirt",
    "category": "top",
    "image_url": "https://s3.amazonaws.com/...",
    "created_at": "2024-12-16T10:00:00Z"
  }
}
```

### Step 3: List Wardrobe Items
```typescript
GET /wardrobe/items

Response (200):
{
  "count": 5,
  "items": [
    {
      "id": "item_123",
      "user_id": "user_456",
      "category": "top",
      "image_url": "https://s3.amazonaws.com/...",
      "name": "Blue Denim Shirt",
      "created_at": "2024-12-16T10:00:00Z"
    },
    ...
  ]
}
```

### Step 4: Low-Res Try-On (Fast Preview)
```typescript
POST /tryon/lowres
Content-Type: application/json

{
  "body_id": "body_abc123",
  "wardrobe_item_ids": ["item_def456"],
  "options": {
    "output_format": "png_base64",
    "match_lighting": true
  }
}

Response (200):
{
  "composite_png": "base64_encoded_png_data...",
  "quality_hint": "preview",
  "pose_detected": true,
  "warnings": [],
  "processing_time_ms": 2800
}
```

### Step 5: High-Res Try-On (Gemini)
```typescript
POST /tryon/highres
Content-Type: application/json

{
  "body_id": "body_abc123",
  "wardrobe_item_ids": ["item_def456", "item_ghi789"],
  "gemini_opt_in": true,  // REQUIRED
  "prompt_params": {
    "style": "realistic",
    "background": "keep_original"
  }
}

Response (202):
{
  "job_id": "job_xyz",
  "status": "processing",
  "message": "Job started successfully"
}
```

### Step 6: Poll for Result
```typescript
GET /tryon/result/job_xyz

Response (200) - Processing:
{
  "job_id": "job_xyz",
  "status": "processing",
  "progress": 60,
  "message": "Generating composite..."
}

Response (200) - Completed:
{
  "job_id": "job_xyz",
  "status": "completed",
  "result_png": "base64_encoded_png_data...",
  "resolution": [1080, 1920],
  "processing_time_ms": 42000
}
```

---

## 🔍 Wardrobe Filtering

### Filter by Metadata
```typescript
GET /wardrobe/filter?category=top&occasion=work&weather_suitability=cold

Query Parameters:
- category: 'top' | 'bottom' | 'dress' | 'shoes' | 'outerwear' | 'accessory'
- occasion: 'work' | 'casual' | 'special_event' | 'sports' | 'weekend' | ...
- weather_suitability: 'hot' | 'warm' | 'mild' | 'cold' | 'rainy'
- season: 'spring' | 'summer' | 'fall' | 'winter'
- mood: 'confident' | 'relaxed' | 'bold' | 'elegant' | ...
- formality_level: 'casual' | 'business_casual' | 'formal' | 'athletic'

Response (200):
{
  "count": 3,
  "filters_applied": {
    "category": "top",
    "occasion": "work",
    "weather_suitability": "cold"
  },
  "items": [...]
}
```

### Update Item Metadata
```typescript
POST /wardrobe/items/<item_id>/attributes
Content-Type: application/json

{
  "name": "My Favorite Denim Shirt",
  "occasion": ["work", "date_night"],
  "mood": ["confident", "stylish"],
  "formality_level": "business_casual",
  "style_tags": ["go-to", "versatile"]
}

Response (200):
{
  "message": "Attributes updated successfully",
  "item": {...},
  "fields_changed": ["name", "occasion", "mood", "formality_level"]
}
```

---

## ⚠️ Error Handling

### Standard Error Format
```typescript
{
  "error": string,      // Error type
  "message": string,    // Human-readable
  "details": []         // Optional specifics
}
```

### HTTP Status Codes
| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 202 | Accepted | Async job started |
| 400 | Bad Request | Check input validation |
| 401 | Unauthorized | Refresh token or re-login |
| 403 | Forbidden | Check ownership/permissions |
| 404 | Not Found | Resource doesn't exist |
| 413 | Payload Too Large | Compress file |
| 422 | Unprocessable Entity | Processing failed (pose, etc.) |
| 429 | Too Many Requests | Wait `retry_after` seconds |
| 500 | Internal Server Error | Retry or contact support |
| 501 | Not Implemented | Feature not ready |
| 503 | Service Unavailable | Missing API keys or deps |

### Common Error Scenarios

**Invalid Credentials**:
```typescript
POST /api/v1/login
Response (401):
{
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

**Token Expired**:
```typescript
GET /api/v1/me
Response (401):
{
  "error": "Unauthorized",
  "message": "Token has expired"
}
// Action: Refresh token or re-login
```

**File Too Large**:
```typescript
POST /process/extract
Response (413):
{
  "error": "Payload Too Large",
  "message": "File exceeds maximum size of 3MB",
  "details": ["File size: 4.2MB"]
}
// Action: Compress image
```

**Rate Limited**:
```typescript
POST /process/extract
Response (429):
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retry_after": 60
}
// Action: Wait 60 seconds
```

**Pose Detection Failed**:
```typescript
POST /tryon/lowres
Response (422):
{
  "error": "Unprocessable Entity",
  "message": "Pose detection failed",
  "details": ["No person detected in image"]
}
// Action: Use different selfie
```

---

## 📁 File Upload Requirements

### Validation Rules
```typescript
// Allowed formats
extensions: ['.jpg', '.jpeg', '.png', '.webp']
mimeTypes: ['image/jpeg', 'image/png', 'image/webp']

// Size limits
maxFileSize: 3MB (3 * 1024 * 1024 bytes)
maxRequestSize: 16MB (for multiple files)

// Before upload
if (file.size > 3 * 1024 * 1024) {
  // Compress or show error
}
```

### Upload Pattern
```typescript
// Single file
const formData = new FormData();
formData.append('file', file);  // or 'image'

fetch('/bodies', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
    // Don't set Content-Type, browser sets it with boundary
  },
  body: formData
});

// Multiple files
const formData = new FormData();
files.forEach(file => {
  formData.append('images[]', file);
});

fetch('/process/thumbnail', {
  method: 'POST',
  body: formData
});
```

---

## 🎯 Context-Aware Logic (from USER_JOURNEY.md)

### Occasion Classification
```typescript
type Occasion = 'work' | 'casual' | 'special_event' | 'sports';

const rules = {
  work: {
    priority: 'formality',
    constraints: ['dress_code', 'cultural_norms']
  },
  casual: {
    priority: 'comfort',
    constraints: ['practicality']
  },
  special_event: {
    priority: 'style',
    constraints: ['theme', 'standout_potential']
  },
  sports: {
    priority: 'functionality',
    constraints: ['movement', 'sweat', 'safety']
  }
};
```

### Weather Constraints
```typescript
type Weather = 'hot' | 'warm' | 'mild' | 'cold' | 'rainy';

const weatherRules = {
  hot: {
    fabrics: ['light', 'breathable'],
    colors: ['light_palette']
  },
  cold: {
    fabrics: ['warm', 'layered'],
    colors: ['any']
  },
  rainy: {
    fabrics: ['waterproof'],
    priority: 'function_over_aesthetics'
  }
};
```

### Selection Order
```typescript
const selectionOrder = [
  'top',         // Dominant visual impact
  'bottom',      // Harmonize with top (fit, proportion)
  'shoes',       // Finalize formality & activity
  'accessories'  // Polish, not core
];
```

### Feedback Loop
```typescript
const evaluateOutfit = (outfit) => {
  const checks = [
    checkComfort(outfit),
    checkAppearance(outfit),
    checkWeatherSuitability(outfit),
    checkOccasionMatch(outfit)
  ];
  
  if (checks.every(c => c.passed)) {
    return { satisfied: true };
  } else {
    // Identify failure source
    const failedCheck = checks.find(c => !c.passed);
    return {
      satisfied: false,
      changeTarget: failedCheck.component  // 'top' | 'bottom' | 'shoes'
    };
  }
};
```

---

## ⚡ Performance Tips

### Processing Times (from MODELS_DOCUMENTATION.md)
```
Model loading:     1-5 seconds (first load, cached thereafter)
Segmentation:      0.5-2 seconds per image
Pose detection:    0.1-0.5 seconds
Warping:           0.05-0.1 seconds
Compositing:       0.05-0.1 seconds
Total try-on:      ~2-4 seconds
Gemini extraction: 3-5 seconds
Gemini high-res:   30-60 seconds (async)
```

### Optimization Strategies
```typescript
// 1. Resize before upload
const MAX_SIZE = 1024;
if (image.width > MAX_SIZE || image.height > MAX_SIZE) {
  image = resizeImage(image, MAX_SIZE);
}

// 2. Use thumbnails for previews
const thumbnail = generateThumbnail(image, 256);

// 3. Cache segmentation masks
const cachedMask = await getCachedMask(itemId);
if (!cachedMask) {
  const mask = await segmentGarment(image);
  await cacheMask(itemId, mask);
}

// 4. Progressive loading
showLowResPreview();  // Fast
loadHighResInBackground();  // Slow

// 5. Batch requests
const items = await Promise.all([
  fetchWardrobeItems(),
  fetchBodies(),
  fetchTryOnHistory()
]);
```

---

## 🔒 Security Checklist

### Token Storage
```typescript
// ✅ DO: Use secure storage
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('access_token', token);
await SecureStore.setItemAsync('refresh_token', refreshToken);

// ❌ DON'T: Use AsyncStorage for tokens
```

### Token Refresh
```typescript
// ✅ DO: Refresh before expiry
const TOKEN_LIFETIME = 15 * 60 * 1000;  // 15 minutes
const REFRESH_BUFFER = 2 * 60 * 1000;   // 2 minutes before expiry

const shouldRefresh = (expiresAt) => {
  return Date.now() >= expiresAt - REFRESH_BUFFER;
};

// Implement auto-refresh interceptor
```

### Logout
```typescript
// ✅ DO: Revoke refresh token
await fetch('/api/v1/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: refreshToken })
});

// Clear local storage
await SecureStore.deleteItemAsync('access_token');
await SecureStore.deleteItemAsync('refresh_token');
```

---

## 📚 Need More Details?

| Topic | See Document | Section |
|-------|--------------|---------|
| API Endpoints | API_DOCUMENTATION.md | Core Endpoints |
| Authentication | API_DOCUMENTATION.md | Authentication |
| Data Models | MODELS_DOCUMENTATION.md | Database Models |
| Try-On Pipeline | API_DOCUMENTATION.md | Virtual Try-On |
| User Flow | USER_FLOW.md | Full Flowchart |
| Decision Logic | USER_JOURNEY.md | Full Journey |
| Error Handling | API_DOCUMENTATION.md | Error Responses |
| File Uploads | API_DOCUMENTATION.md | File Upload Requirements |
| Performance | MODELS_DOCUMENTATION.md | Performance Considerations |
| Troubleshooting | MODELS_DOCUMENTATION.md | Troubleshooting |

---

**Last Updated**: January 13, 2026
**Quick Reference Version**: 1.0.0
