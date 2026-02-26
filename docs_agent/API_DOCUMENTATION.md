# Wardrobe Backend API Documentation

**Version**: 1.0.0-mvp
**Base URL**: `http://localhost:5001`
**Content-Type**: `application/json` (except file uploads)

---

## Overview

The Wardrobe Backend API provides endpoints for:

- Garment image segmentation and analysis
- Outfit suggestion based on wardrobe metadata
- Virtual try-on compositing (low-res and high-res)
- User feedback collection

**Architecture**: Local-first MVP - all images are ephemeral and deleted after processing. No persistent cloud storage.

---

## Authentication

**MVP**: The system uses a Dual Token Strategy (JWT Access Token + Persistent Refresh Token). See `AUTH_GUIDE.md` for full implementation details and client-side integration guidelines.

### Register

#### `POST /api/register`

Register a new user.

**Rate Limit**: 5 requests per minute

**Request** (application/json):

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (201 Created):

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "role": "user",
    "is_first_login": true,
    "gender": null,
    "user_metadata": {}
  }
}
```

**Errors**:

- `400 Bad Request` - Missing email or password
- `409 Conflict` - Email already registered
- `500 Internal Server Error` - Database error

### Login

#### `POST /api/login`

Authenticate user and receive access and refresh tokens.

**Rate Limit**: 10 requests per minute

**Request** (application/json):

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200 OK):

```json
{
  "access_token": "ey...",
  "expires_in": 900,
  "refresh_token": "def...",
  "refresh_expires_in": 2592000,
  "token_type": "Bearer"
}
```

**Errors**:

- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid credentials

### Refresh Token

#### `POST /api/token/refresh`

Obtain a new access token using a valid refresh token. Rotates the refresh token (returns a new one).

**Rate Limit**: 20 requests per minute

**Request** (application/json):

```json
{
  "refresh_token": "def..."
}
```

**Response** (200 OK):

```json
{
  "access_token": "ey...",
  "expires_in": 900,
  "refresh_token": "new_def...",
  "refresh_expires_in": 2592000,
  "token_type": "Bearer"
}
```

**Errors**:

- `400 Bad Request` - Missing refresh token
- `401 Unauthorized` - Invalid or expired refresh token

### Get Current User

#### `GET /api/me`

Get profile information for the current authenticated user.

**Header**: `Authorization: Bearer <access_token>`

**Response** (200 OK):

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "user",
  "is_first_login": true,
  "gender": "MASCULINE",
  "user_metadata": {}
}
```

### Update User Profile

#### `PUT /api/me`

Update profile information for the current authenticated user.

**Header**: `Authorization: Bearer <access_token>`

**Request** (application/json):

```json
{
  "is_first_login": false,
  "gender": "MASCULINE",
  "user_metadata": {
    "onboarding_step": 2,
    "preferences": "dark_mode"
  }
}
```

**Response** (200 OK):

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "user",
  "is_first_login": false,
  "gender": "MASCULINE",
  "user_metadata": {
    "onboarding_step": 2,
    "preferences": "dark_mode"
  }
}
```

**Errors**:

- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid access token
- `500 Internal Server Error` - Update failed

### Logout

#### `POST /api/logout`

Revoke the refresh token.

**Request** (application/json):

```json
{
  "refresh_token": "def..."
}
```

**Response** (200 OK):

```json
{
  "message": "Logged out successfully"
}
```

---

## Core Endpoints

### Health Check

#### `GET /health`

Check API health and configuration.

**Response** (200 OK):

```json
{
  "status": "healthy",
  "timestamp": "2024-12-07T10:00:00.000Z",
  "config": {
    "environment": "development",
    "rate_limit_enabled": true,
    "max_upload_size_mb": 3
  },
  "file_manager": {
    "tracked_files": 0,
    "oldest_age_seconds": 0,
    "temp_dir": "/tmp/wardrobe_temp",
    "ttl_minutes": 30
  }
}
```

---

## File Upload

### Upload File

#### `POST /api/upload/file`

Upload a file (image) with automatic S3 storage and local fallback.

**Authentication**: Required (Bearer token)

**Rate Limit**: 10 requests per minute

**Request** (multipart/form-data):

```
file: <file> (required) - Image file (JPG, PNG, WEBP, max 3MB)
prefix: <string> (optional) - S3 key prefix (e.g., "garments/", "bodies/")
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/upload/file \
  -H "Authorization: Bearer <token>" \
  -F "file=@image.jpg" \
  -F "prefix=garments/"
```

**Response (201 Created) - S3 Upload**:

```json
{
  "message": "File uploaded successfully",
  "key": "garments/abc123def456.jpg",
  "url": "https://s3.amazonaws.com/bucket/garments/abc123def456.jpg",
  "expires_in": 3600
}
```

**Response (201 Created) - Local Fallback** (when S3 not configured):

```json
{
  "message": "File uploaded successfully (local)",
  "key": "abc123def456.jpg",
  "url": "http://localhost:5001/static/uploads/abc123def456.jpg",
  "local": true
}
```

**Behavior**:

- **S3 Priority**: Attempts S3 upload if credentials configured
- **Local Fallback**: Falls back to local storage if S3 unavailable or not configured
- **Automatic Cleanup**: Local files cleaned up by ephemeral file manager (TTL-based)
- **Secure Filenames**: Generates secure random filename (UUID-based)
- **Presigned URLs**: S3 URLs are presigned with configurable expiration (default: 1 hour)

**Errors**:

- `400 Bad Request` - No file provided or invalid file format
- `401 Unauthorized` - Missing/invalid token
- `413 Payload Too Large` - File exceeds max size (3MB)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Upload processing failed
- `503 Service Unavailable` - S3 upload failed (if S3 is configured but fails)

**Notes**:

- S3 configuration requires: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- Local fallback serves files from `/static/uploads/` directory
- Local URLs are absolute if request context available
- File validation includes MIME type checking and size limits

---

### Upload Base64 Image

#### `POST /api/upload/base64`

Upload a base64-encoded image (JSON alternative to multipart file upload).

**Authentication**: Not required

**Rate Limit**: 10 requests per minute

**Request** (application/json):

```json
{
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "filename": "optional.png"
}
```

**Request Fields**:

- `image` (string, required): Base64-encoded image data
- `filename` (string, optional): Original filename (used to determine extension)

**Response (201 Created)**:

```json
{
  "url": "https://s3.amazonaws.com/bucket/uploads/abc123def456.png",
  "key": "uploads/abc123def456.png"
}
```

**Errors**:

- `400 Bad Request` - No image data provided or invalid base64
- `429 Too Many Requests` - Rate limit exceeded
- `503 Service Unavailable` - S3 not configured

**Notes**:

- Automatically determines file extension from `filename` parameter
- Falls back to `.png` if no valid extension detected
- Uploads directly to S3 (no local fallback for this endpoint)
- Supports same image formats as multipart upload: JPG, PNG, WEBP

---

## Garment Processing

### Segment Garment

#### `POST /api/process/segment`

Segment a garment image and extract metadata (colors, type).

**Request** (multipart/form-data):

```
image: <file>  (required) - Garment image (JPG, PNG, WEBP, max 3MB)
type_hint: <string> (optional) - Garment type hint ("top", "bottom", "shoes", etc.)
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/process/segment \
  -F "image=@shirt.jpg" \
  -F "type_hint=top"
```

**Response** (200 OK) - Phase 2 Implementation:

```json
{
  "mask_png": "base64_encoded_png_data...",
  "tags": {
    "colors": ["red", "white"],
    "color_hex": ["#FF0000", "#FFFFFF"],
    "garment_type": "top",
    "pattern": "solid"
  },
  "processing_time_ms": 1240
}
```

**Current Response** (501 Not Implemented - Phase 1):

```json
{
  "status": "not_implemented",
  "message": "Segmentation will be implemented in Phase 2",
  "type_hint": "top",
  "file_size": 245678,
  "mime_type": "image/jpeg"
}
```

**Errors**:

- `400 Bad Request` - No file provided or invalid file
- `413 Payload Too Large` - File exceeds max size
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Processing failed

---

### Create Thumbnail

#### `POST /api/process/thumbnail`

Generate a thumbnail collage from multiple garment images.

**Request** (multipart/form-data):

```
images[]: <file>  (required, multiple) - 2-10 garment images
layout_hint: <string> (optional) - "grid_2x3", "grid_3x2", etc.
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/process/thumbnail \
  -F "images[]=@shirt1.jpg" \
  -F "images[]=@shirt2.jpg" \
  -F "images[]=@pants.jpg" \
  -F "images[]=@shoes.jpg"
```

**Response** (200 OK) - Phase 2 Implementation:

```json
{
  "thumbnail_png": "base64_encoded_png_data...",
  "grid_size": [2, 3],
  "item_count": 6,
  "processing_time_ms": 450
}
```

**Current Response** (501 Not Implemented):

```json
{
  "status": "not_implemented",
  "message": "Thumbnail generation will be implemented in Phase 2",
  "file_count": 4
}
```

---

### Extract Garment (Gemini-based)

#### `POST /api/process/extract`

Extract a single garment from an image with transparent background using Google's Gemini AI.

**Requirements**:

- Requires `GOOGLE_STUDIO_KEY` environment variable to be set
- Uses Gemini API for AI-powered garment extraction

**Rate Limit**: 5 requests per minute (stricter due to API costs)

**Request** (multipart/form-data):

```
image: <file>  (required) - Image containing garment (worn by person or on hanger)
type_hint: <string> (optional) - "top", "bottom", "dress", "shoes" (helps extraction accuracy)
custom_prompt: <string> (optional) - Override default extraction prompt
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/process/extract \
  -F "image=@person_wearing_shirt.jpg" \
  -F "type_hint=top"
```

**Response** (200 OK) - S3 Upload Enabled (WITH METADATA) (Recommended):

```json
{
  "garment_url": "https://s3.amazonaws.com/bucket/extracted/abc123.png",
  "garment_key": "extracted/abc123.png",
  "wardrobe_item_id": "item_def456ghi789",
  "processing_time_ms": 3450,
  "model": "gemini-2.0-flash-exp",

  "metadata": {
    "title": "Blue Denim Button-Up Shirt",
    "description": "Light blue denim shirt with white buttons, long sleeves, button-down collar, and two chest pockets. Classic fit with slight texture in the fabric.",
    "category": "top",
    "subcategory": "shirt",
    "colors": ["light blue", "white"],
    "color_hex": ["#7BA5D6", "#FFFFFF"],
    "dominant_color": "light blue",
    "pattern": "solid",
    "fabric_type": "denim",
    "fabric_texture": "medium",
    "formality_level": "casual",
    "style_tags": ["classic", "versatile", "americana"],
    "occasion": ["casual", "work", "weekend"],
    "weather_suitability": ["warm", "mild"],
    "season": ["spring", "summer", "fall"],
    "mood": ["relaxed", "confident"],
    "works_well_with": ["jeans", "chinos", "shorts"],
    "layering_potential": ["can_be_layered_over", "can_be_worn_alone"],
    "confidence": {
      "category": 0.98,
      "colors": 0.95,
      "formality": 0.92,
      "style": 0.88
    }
  },

  "wardrobe_item": {
    "id": "item_abc123",
    "user_id": "user_456",
    "name": "Blue Denim Button-Up Shirt",
    "category": "top",
    "image_url": "https://s3.amazonaws.com/bucket/extracted/abc123.png",
    "created_at": "2024-12-16T10:00:00Z"
  }
}
```

**Response** (200 OK) - S3 Fallback (base64, NOT saved to wardrobe):

```json
{
  "garment_png": "iVBORw0KGgoAAAANSUhEUgAA...",
  "processing_time_ms": 3450,
  "model": "gemini-2.0-flash-exp"
}
```

**Behavior**:

- Extracts the primary garment from the image
- Removes person, background, hangers, and other objects
- Preserves all garment details (colors, patterns, textures, logos)
- Returns PNG with transparent background (alpha channel)
- If multiple garments present, extracts the most prominent one

**Errors**:

- `400 Bad Request` - No file provided, invalid file, or corrupted image
- `429 Too Many Requests` - Rate limit exceeded (Gemini API calls are limited)
- `503 Service Unavailable` - GOOGLE_STUDIO_KEY not configured or invalid API key
- `500 Internal Server Error` - Extraction failed or API error

**Notes**:

- Processing time typically 3-5 seconds depending on image complexity
- Uses Gemini's multimodal capabilities for accurate extraction AND metadata generation
- Output is always PNG format with RGBA (transparency support)
- Temp files are automatically cleaned up after processing
- **Persistence**: Successfully extracted garments are automatically saved to the authenticated user's wardrobe.

### Body Reference (User Uploaded)

#### `POST /api/bodies`

Upload a body reference image (selfie) for try-on.

**Authentication**: Required (Bearer token)

**Request** (multipart/form-data):

```
file: <file> (required) - Body image (JPG, PNG, WEBP)
```

**Response** (201 Created):

```json
{
  "message": "Body image uploaded successfully",
  "body": {
    "id": "body_123...",
    "user_id": "user_456...",
    "image_url": "https://s3.amazonaws.com/...",
    "created_at": "2024-12-16T12:00:00Z"
  }
}
```

#### `GET /api/bodies`

Get all body images for the authenticated user.

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "count": 2,
  "items": [
    {
      "id": "body_123...",
      "user_id": "user_456...",
      "image_url": "https://s3.amazonaws.com/...",
      "created_at": "2024-12-16T12:00:00Z"
    }
  ]
}
```

#### `DELETE /api/bodies/<id>`

Delete a body reference image for the authenticated user.

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "message": "Body deleted successfully",
  "id": "body_123..."
}
```

**Errors**:

- `401 Unauthorized` - Missing, invalid, or expired access token
- `403 Forbidden` - User does not own the body image
- `404 Not Found` - Body image with the given ID not found

### Get Wardrobe Items

#### `GET /api/wardrobe/items`

Retrieve all wardrobe items for the authenticated user.

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "count": 5,
  "items": [
    {
      "id": "item_123...",
      "user_id": 1,
      "category": "top",
      "image_url": "https://s3.amazonaws.com/...",
      "name": "Blue Denim Button-Up Shirt",
      "created_at": "2024-12-16T10:00:00Z",
      "description": "Light blue denim shirt with white buttons...",
      "colors": ["light blue", "white"],
      "dominant_color": "light blue",
      "occasion": ["casual", "work"],
      "mood": ["relaxed", "confident"],
      "formality_level": "casual"
    }
  ]
}
```

### Get Wardrobe Items by User ID

#### `GET /api/wardrobe/user/<user_id>`

Get all wardrobe items for a specific user (public endpoint, no authentication required).

**Authentication**: Not required

**Response** (200 OK):

```json
{
  "user_id": "user_123",
  "count": 5,
  "items": [
    {
      "id": "item_123...",
      "user_id": "user_123",
      "owner_id": "user_123",
      "category": "top",
      "image_url": "https://s3.amazonaws.com/...",
      "name": "Blue Denim Button-Up Shirt",
      "created_at": "2024-12-16T10:00:00Z"
    }
  ]
}
```

**Errors**:

- `500 Internal Server Error` - Database error

---

### Add Wardrobe Item

#### `POST /api/wardrobe/`

Add a new wardrobe item to a user's wardrobe.

**Authentication**: Not required (for MVP - specify user_id in request body)

**Request** (application/json):

```json
{
  "user_id": "user_123",
  "category": "top",
  "image_url": "https://s3.amazonaws.com/garments/abc123.png",
  "name": "Blue Shirt"
}
```

**Required Fields**:

- `user_id` (string) - User identifier
- `category` (string) - Item category (top, bottom, dress, shoes, outerwear, accessory)
- `image_url` (string) - URL to garment image

**Optional Fields**:

- `name` (string) - Item name/title

**Response** (201 Created):

```json
{
  "message": "Wardrobe item added successfully",
  "item": {
    "id": "item_123...",
    "user_id": "user_123",
    "owner_id": "user_123",
    "category": "top",
    "image_url": "https://s3.amazonaws.com/garments/abc123.png",
    "name": "Blue Shirt",
    "created_at": "2024-12-16T10:00:00Z"
  }
}
```

**Errors**:

- `400 Bad Request` - Missing required fields (user_id, category, or image_url)
- `500 Internal Server Error` - Database error

---

### Update Wardrobe Item Attributes

#### `POST /api/wardrobe/items/<id>/attributes`

Manually override or refine AI-generated metadata for a wardrobe item.

**Authentication**: Required (Bearer token)

**Request** (application/json):

```json
{
  "name": "My Favorite Denim Shirt",
  "occasion": ["work", "date_night"],
  "mood": ["confident", "stylish"],
  "formality_level": "business_casual",
  "style_tags": ["go-to", "versatile"]
}
```

**Updatable Fields** (all optional):

- `name`, `description`
- `occasion`, `mood`, `weather_suitability`, `season`
- `formality_level`, `style_tags`
- `colors`, `color_hex`, `dominant_color`, `pattern`, `fabric_type`
- `works_well_with`, `layering_potential`

**Response** (200 OK):

```json
{
  "message": "Attributes updated successfully",
  "item": {
    "id": "item_123...",
    "user_id": "user_456",
    "name": "My Favorite Denim Shirt",
    "category": "top",
    "occasion": ["work", "date_night"],
    "mood": ["confident", "stylish"],
    "formality_level": "business_casual",
    "user_edited": true,
    "user_edits": {
      "fields_changed": ["name", "occasion", "mood", "formality_level"],
      "changed_at": "2024-12-16T11:30:00Z"
    }
  },
  "fields_changed": ["name", "occasion", "mood", "formality_level"]
}
```

**Errors**:

- `400 Bad Request` - No update data provided
- `401 Unauthorized` - Missing or invalid access token
- `404 Not Found` - Item not found or access denied

### Filter Wardrobe Items

#### `GET /api/wardrobe/filter`

Filter wardrobe items by metadata attributes for context-based outfit selection.

**Authentication**: Required (Bearer token)

**Query Parameters** (all optional):

- `category`: top | bottom | dress | shoes | outerwear | accessory
- `occasion`: work, casual, special_event, sports, weekend, date_night, formal_event, beach, outdoor
- `weather_suitability`: hot, warm, mild, cold, rainy
- `season`: spring, summer, fall, winter
- `mood`: confident, relaxed, bold, elegant, playful, professional, edgy, romantic, casual, sophisticated
- `formality_level`: casual, business_casual, formal, athletic

**cURL Example**:

```bash
curl "http://localhost:5001/wardrobe/filter?category=top&occasion=work&weather_suitability=cold" \
  -H "Authorization: Bearer <token>"
```

**Response** (200 OK):

```json
{
  "count": 3,
  "filters_applied": {
    "category": "top",
    "occasion": "work",
    "weather_suitability": "cold"
  },
  "items": [
    {
      "id": "item_123",
      "name": "Navy Wool Blazer",
      "category": "top",
      "formality_level": "business_casual",
      "occasion": ["work", "formal_event"],
      "weather_suitability": ["cold", "mild"],
      "mood": ["professional", "confident"]
    },
    {
      "id": "item_456",
      "name": "Gray Turtleneck Sweater",
      "category": "top",
      "formality_level": "casual",
      "occasion": ["work", "casual"],
      "weather_suitability": ["cold"],
      "mood": ["relaxed", "sophisticated"]
    }
  ]
}
```

**Errors**:

- `401 Unauthorized` - Missing or invalid access token
- `500 Internal Server Error` - Database query error

**Use Cases**:

- Find outfits for specific occasions ("What can I wear to work?")
- Weather-appropriate clothing ("Show me warm-weather tops")
- Mood-based selection ("I want to look bold today")
- Context-aware outfit building ("Casual weekend outfits for mild weather")

---

---

### Favorites

#### `POST /api/favorites`

Add a new favorite outfit.

**Authentication**: Required (Bearer token)

**Request** (application/json):

```json
{
  "outfit_items": ["item_id_1", "item_id_2"],
  "outfit_context": {
    "occasion": "work",
    "weather": "cold",
    "styling_note": "Perfect for winter meetings"
  },
  "outfit_thumbnail_url": "https://s3.amazonaws.com/..."
}
```

**Response** (201 Created):

```json
{
  "id": "fav_123...",
  "user_id": "user_456...",
  "outfit_items": [
    {
      "id": "item_id_1",
      "name": "Navy Blazer",
      ...
    },
    ...
  ],
  "outfit_context": {
    "occasion": "work",
    "weather": "cold",
    "styling_note": "Perfect for winter meetings"
  },
  "outfit_thumbnail_url": "https://s3.amazonaws.com/...",
  "created_at": "2026-02-10T14:30:00Z",
  "updated_at": "2026-02-10T14:30:00Z"
}
```

**Errors**:

- `400 Bad Request` - Missing data or empty items list
- `404 Not Found` - One or more items not found
- `403 Forbidden` - User does not own one of the items

#### `GET /api/favorites`

List user's favorites with pagination.

**Authentication**: Required (Bearer token)

**Query Parameters**:

- `limit` (int, default 20)
- `offset` (int, default 0)
- `sort` (string: "recent" | "oldest", default "recent")

**Response** (200 OK):

```json
{
  "count": 5,
  "total": 12,
  "favorites": [
    {
      "id": "fav_123...",
      "outfit_items": [...],
      "outfit_context": {...},
      "created_at": "..."
    },
    ...
  ]
}
```

#### `GET /api/favorites/<id>`

Get details of a specific favorite.

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "id": "fav_123...",
  "outfit_items": [...],
  ...
}
```

#### `DELETE /api/favorites/<id>`

Remove a favorite.

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "message": "Favorite removed successfully"
}
```

---

### Get Common Items (System Baseline Catalog)

#### `GET /wardrobe/common-items`

**Description:** Returns the full read-only library of neutral Common Items used as a reasoning baseline by the Recommendation Engine. These items are owned by the system (`owner_id = "SYSTEM"`) and cannot be edited or deleted.

**Authentication:** Not required

**Rate Limit:** 60 requests/minute

**Response (200):**

```json
{
  "count": 18,
  "items": [
    {
      "id": "<uuid>",
      "owner_id": "SYSTEM",
      "user_id": null,
      "human_readable_id": "SYS_L2_TEE_WHT_REG_01",
      "category": "top",
      "category_code": "TEE",
      "layer_code": "L2",
      "name": "White T-Shirt",
      "image_url": "",
      "styling_metadata": {
        "formality_score": 3,
        "warmth_level": 2,
        "versatility_score": 10,
        "visual_weight": 2,
        "climate_fit": "HOT"
      },
      "physical_attributes": {
        "color_code": "WHT",
        "fit_code": "REG",
        "pattern_type": "SOLID",
        "is_tuckable": true,
        "is_water_resistant": false
      },
      "gender_tags": ["M", "W", "U"],
      "is_common_item": true,
      "is_deleted": false,
      "created_at": "2026-02-04T10:00:00+00:00",
      "updated_at": "2026-02-04T10:00:00+00:00"
    }
  ]
}
```

**Errors:**

- `500 Internal Server Error` - Database query error

---

### Clone a Common Item

#### `POST /wardrobe/common-items/<item_id>/clone`

**Description:** Creates a deep copy of a Common Item into the authenticated user's personal wardrobe. The clone receives a `USR_` human-readable ID with an auto-incremented index if the user already owns copies with the same attributes. The source system item is not modified.

**Authentication:** Required (`@require_auth`)

**Rate Limit:** 20 requests/minute

**Request:**

- Headers: `Authorization: Bearer <token>`
- Path parameter: `item_id` — UUID of the Common Item to clone

**Response (201):**

```json
{
  "message": "Common item cloned successfully",
  "item": {
    "id": "<new-uuid>",
    "owner_id": "<user-uuid>",
    "user_id": "<user-uuid>",
    "human_readable_id": "USR_L2_TEE_WHT_REG_01",
    "category": "top",
    "category_code": "TEE",
    "layer_code": "L2",
    "name": "White T-Shirt",
    "image_url": "",
    "styling_metadata": { "..." },
    "physical_attributes": { "..." },
    "gender_tags": ["M", "W", "U"],
    "is_common_item": false,
    "is_deleted": false,
    "created_at": "2026-02-04T10:05:00+00:00",
    "updated_at": "2026-02-04T10:05:00+00:00"
  }
}
```

**Errors:**

- `401 Unauthorized` - Missing or invalid access token
- `404 Not Found` - Common item with given `item_id` does not exist
- `500 Internal Server Error` - Database error

---

### Gender Tagging System

**Overview**: The wardrobe system uses a multi-dimensional gender tagging approach based on **Style Archetypes** rather than biological gender. Items can have multiple tags to accurately represent their styling characteristics.

**Gender Tags**:

- `M` (Menswear): Structured silhouettes, broad shoulders, angular cuts
- `W` (Womenswear): Curved silhouettes, decorative elements, fitted designs
- `U` (Unisex): Neutral styling, relaxed fit, minimal gender-coded elements

**Tag Examples**:

- `["M"]` - Men-only (e.g., structured blazer)
- `["W"]` - Women-only (e.g., dress)
- `["M", "W", "U"]` - Universal (e.g., t-shirt, jeans, sneakers)
- `["M", "U"]` - Menswear + Unisex (e.g., oxford shirt, chinos)

**Filtering Behavior**:

- **MASCULINE users**: See items with `"M"` tag (excludes W-only items)
- **FEMININE users**: See items with `"W"` tag (excludes M-only items)
- **UNISEX/null preference**: See all items (no filtering)

**Scoring Priority** (for sorting recommendations):

1. **Exact match** (100 points): Item has user's preferred tag
2. **Unisex fallback** (80 points): Item has `"U"` tag but not preferred tag
3. **Cross-gender** (10 points): Item has opposite tag (low priority)

**Example**:

```json
{
  "id": "item_123",
  "name": "White T-Shirt",
  "gender_tags": ["M", "W", "U"], // Universal item
  "category": "top"
}
```

For MASCULINE user: Score 100 (has "M"), shown in results
For FEMININE user: Score 100 (has "W"), shown in results
For UNISEX user: Score 100 (all items equal), shown in results

**See also**:

- Recommendation Engine (`POST /api/recommendation/start`) - Uses gender_tags for outfit filtering
- Common Items catalog - All items have gender_tags assigned

---

### Delete a Wardrobe Item (Soft Delete)

#### `DELETE /api/wardrobe/items/<item_id>`

**Description:** Soft-deletes a wardrobe item by setting `is_deleted = true`. The row is preserved in the database. System / Common Items are protected and cannot be deleted; only the owning user may delete their own items.

**Authentication:** Required (`@require_auth`)

**Rate Limit:** 20 requests/minute

**Request:**

- Headers: `Authorization: Bearer <token>`
- Path parameter: `item_id` — UUID of the item to delete

**Response (200):**

```json
{
  "message": "Item deleted successfully",
  "item": {
    "id": "<uuid>",
    "owner_id": "<user-uuid>",
    "is_deleted": true,
    "..."
  }
}
```

**Errors:**

- `401 Unauthorized` - Missing or invalid access token
- `403 Forbidden` - Attempted to delete a System Integrity Item, or item belongs to another user
- `404 Not Found` - Item with given `item_id` does not exist
- `500 Internal Server Error` - Database error

---

## Outfit Suggestions

### Suggest Outfits

#### `POST /api/suggest`

Generate outfit combinations based on wardrobe item metadata.

**Request** (application/json):

```json
{
  "items": [
    {
      "id": "item_001",
      "garment_type": "top",
      "colors": ["red", "white"],
      "tags": ["casual", "summer"]
    },
    {
      "id": "item_002",
      "garment_type": "bottom",
      "colors": ["blue"],
      "tags": ["denim", "casual"]
    }
  ],
  "context": {
    "weather": "sunny",
    "occasion": "casual",
    "style_pref": "minimalist"
  },
  "limit": 3
}
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"id": "1", "garment_type": "top", "colors": ["red"]},
      {"id": "2", "garment_type": "bottom", "colors": ["blue"]}
    ],
    "context": {"occasion": "casual"},
    "limit": 3
  }'
```

**Response** (200 OK) - Phase 6 (Deferred):

```json
{
  "outfits": [
    {
      "items": ["item_001", "item_002", "item_003"],
      "score": 8.5,
      "reason_tags": [
        "color_harmony_complementary",
        "type_compatible",
        "occasion_match"
      ]
    }
  ]
}
```

**Current Response** (501 Not Implemented):

```json
{
  "status": "not_implemented",
  "message": "Outfit suggestion deferred to Phase 6 (post-MVP)",
  "received_items": 2
}
```

---

## Virtual Try-On

### Low-Res Try-On (Preview)

#### `POST /api/tryon/lowres`

Create a fast low-resolution composite preview.

**Authentication**: Required (Bearer token)

**Mode 1: Multipart File Upload** (backward compatible)

**Request** (multipart/form-data):

```
selfie: <file> (required) - User selfie image
garment: <file> (required) - Garment image
garment_mask: <file> (optional) - Pre-generated mask
garment_type: <string> (optional) - 'top', 'bottom', 'dress', 'shoes', 'accessory'
match_lighting: <boolean> (optional) - Match lighting (default: false)
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/tryon/lowres \
  -H "Authorization: Bearer <your_access_token>" \
  -F "selfie=@selfie.jpg" \
  -F "garment=@shirt.jpg" \
  -F "garment_mask=@shirt_mask.png" \
  -F "garment_type=top" \
  -F "match_lighting=true"
```

**Mode 2: JSON with IDs** (new)

**Request** (application/json):

```json
{
  "body_id": "body_123",
  "wardrobe_item_ids": ["item_456", "item_789"],
  "options": {
    "output_format": "png_base64",
    "match_lighting": false
  }
}
```

**Request Parameters**:

- `body_id` (string, required): Body reference ID from `/bodies`
- `wardrobe_item_ids` (array, required): 1-4 wardrobe item IDs (order matters - composited in array order)
- `options` (object, optional):
  - `output_format` (string): `"png_base64"` or `"s3_url"` (default: `"png_base64"`)
  - `match_lighting` (boolean): Match garment lighting to body (default: `false`)

**cURL Example (JSON mode)**:

```bash
curl -X POST http://localhost:5001/api/tryon/lowres \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "body_id": "body_123abc",
    "wardrobe_item_ids": ["item_456def"],
    "options": {
      "output_format": "png_base64",
      "match_lighting": true
    }
  }'
```

**Response** (200 OK):

```json
{
  "composite_png": "base64_encoded_png_data...",
  "quality_hint": "preview",
  "pose_detected": true,
  "warnings": [],
  "processing_time_ms": 2800
}
```

**Response (S3 mode)** (200 OK):

```json
{
  "composite_url": "https://s3.amazonaws.com/bucket/tryon/lowres/abc123.png",
  "composite_key": "tryon/lowres/abc123.png",
  "quality_hint": "preview",
  "pose_detected": true,
  "warnings": [
    "Lighting not matched - enable match_lighting for better quality"
  ],
  "processing_time_ms": 2800
}
```

**Errors**:

- `400 Bad Request` - Missing required fields, invalid IDs, or failed to fetch images
- `401 Unauthorized` - Missing, invalid, or expired access token
- `403 Forbidden` - Body or wardrobe item not owned by user
- `404 Not Found` - Body or wardrobe item not found
- `422 Unprocessable Entity` - Pose detection failed or incompatible pose
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Processing error
- `501 Not Implemented` - Missing dependencies (mediapipe, opencv, rembg)

---

### High-Res Try-On (Gemini API)

#### `POST /api/tryon/highres`

**Mode 1: Multipart File Upload** (backward compatible)

**Request** (multipart/form-data):

```
selfie: <file> (required) - User selfie
garment_images[]: <file> (required, multiple) - Garments to composite
prompt_params: <json> (optional) - Additional prompt parameters
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/tryon/highres \
  -H "Authorization: Bearer <your_access_token>" \
  -F "selfie=@selfie.jpg" \
  -F "garment_images[]=@shirt.jpg" \
  -F "garment_images[]=@pants.jpg"
```

**Mode 2: JSON with IDs** (new)

**Request** (application/json):

```json
{
  "body_id": "body_123",
  "wardrobe_item_ids": ["item_456", "item_789"],
  "gemini_opt_in": true,
  "prompt_params": {
    "style": "realistic",
    "background": "keep_original"
  }
}
```

**Request Parameters**:

- `body_id` (string, required): Body reference ID from `/bodies`
- `wardrobe_item_ids` (array, required): 1-4 wardrobe item IDs (order matters)
- `gemini_opt_in` (boolean, required): Must be `true` - explicit consent for Gemini API
- `prompt_params` (object, optional): Additional Gemini parameters

**cURL Example (JSON mode)**:

```bash
curl -X POST http://localhost:5001/api/tryon/highres \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "body_id": "body_123abc",
    "wardrobe_item_ids": ["item_456def"],
    "gemini_opt_in": true,
    "prompt_params": {
      "style": "realistic",
      "background": "keep_original"
    }
  }'
```

**Response** (200 OK):

```json
{
  "composite_url": "https://s3.amazonaws.com/bucket/tryon/highres/abc123.png",
  "composite_key": "tryon/highres/abc123.png",
  "processing_time_ms": 15000,
  "message": "High-res try-on completed successfully"
}
```

**Errors**:

- `400 Bad Request` - Missing required fields, invalid IDs, `gemini_opt_in` not true, or failed to fetch images
- `401 Unauthorized` - Missing, invalid, or expired access token
- `403 Forbidden` - Body or wardrobe item not owned by user
- `404 Not Found` - Body or wardrobe item not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Failed to start Gemini job

---

### Get Try-On History

#### `GET /api/tryon/images`

Retrieve all high-resolution try-on results for the authenticated user.

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "count": 2,
  "items": [
    {
      "id": "tryon_123...",
      "job_id": "job_abc...",
      "user_id": 1,
      "image_url": "https://s3.amazonaws.com/...",
      "processing_time_ms": 42000,
      "created_at": "2024-12-16T12:00:00Z"
    }
  ]
}
```

---

## Feedback

### Submit Feedback

#### `POST /api/feedback`

Submit user feedback for outfit suggestions or try-ons.

**Request** (application/json):

```json
{
  "type": "like" | "dislike",
  "context": {
    "outfit_ids": ["item_001", "item_002"],
    "reason": "Great color combination"
  }
}
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "type": "like",
    "context": {"outfit_ids": ["1", "2"], "reason": "Perfect match"}
  }'
```

**Response** (200 OK):

```json
{
  "status": "ok"
}
```

**Errors**:

- `400 Bad Request` - Invalid feedback type or missing data

---

### Get Feedback Statistics

#### `GET /api/feedback/stats`

Get feedback statistics for monitoring and admin purposes.

**Authentication**: Not required

**Response** (200 OK):

```json
{
  "total_files": 15,
  "total_feedback": 42,
  "last_feedback_date": "2024-12-16T15:30:00Z"
}
```

**Response Fields**:

- `total_files` (int): Number of feedback log files
- `total_feedback` (int): Total feedback entries recorded
- `last_feedback_date` (string): ISO timestamp of most recent feedback

**Errors**:

- `500 Internal Server Error` - Failed to read feedback logs

**Notes**:

- Used for monitoring user engagement and system health
- Feedback is stored in log files (`logs/feedback/`)
- No authentication required (statistics only, no sensitive data)

---

## File Upload Requirements

### Allowed Formats

- **Extensions**: `.jpg`, `.jpeg`, `.png`, `.webp`
- **MIME Types**: `image/jpeg`
  , `image/png`, `image/webp`

### File Size Limits

- **Default**: 3MB per file
- **Maximum Request Size**: 16MB total (for multiple files)
- **Configurable**: Set `MAX_UPLOAD_SIZE_MB` environment variable

### Validation

All uploaded files are validated for:

1.  **Extension** - Must be in allowed list
2.  **MIME Type** - Detected using python-magic (not just extension)
3.  **File Size** - Within limits
4.  **Path Traversal** - Filename sanitized

**Invalid File Response** (400 Bad Request):

```json
{
  "error": "Invalid file",
  "details": [
    "File too large: 4.2MB (max: 3MB)",
    "Invalid MIME type: application/pdf"
  ]
}
```

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "error": "<Error Type>",
  "message": "<Human-readable message>",
  "details": [] // Optional array of specific issues
}
```

### Common HTTP Status Codes

| Code | Meaning               | Common Causes                          |
| :--- | :-------------------- | :------------------------------------- |
| 200  | OK                    | Request successful                     |
| 202  | Accepted              | Async job created                      |
| 400  | Bad Request           | Invalid input, missing required fields |
| 404  | Not Found             | Endpoint or resource doesn't exist     |
| 413  | Payload Too Large     | File(s) exceed size limit              |
| 429  | Too Many Requests     | Rate limit exceeded                    |
| 500  | Internal Server Error | Server-side processing error           |
| 501  | Not Implemented       | Feature not yet implemented (MVP)      |

---

## Environment Configuration

### Required Variables

```bash
SECRET_KEY=<random-secret-key>  # Required in production
```

### Optional Variables

```bash
# Server
FLASK_ENV=development|production|testing
PORT=5001

# Upload Limits
MAX_UPLOAD_SIZE_MB=3
TEMP_DIR=/tmp/wardrobe_temp
TEMP_FILE_TTL_MINUTES=30

# Rate Limiting
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_ENABLED=true

# Models
MODEL_INPUT_SIZE=320
MODEL_CACHE_DIR=models/weights
USE_REMBG=true

# Gemini API (Optional - Phase 4)
GOOGLE_STUDIO_KEY=<your-api-key>
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TIMEOUT_SECONDS=60
GEMINI_JOB_TTL_HOURS=1

# CORS
CORS_ORIGINS=*

# Logging
LOG_LEVEL=INFO|DEBUG|WARNING|ERROR
```

---

## Implementation Phases

### ✅ Phase 1: Foundation (Complete)

- Blueprint architecture
- Ephemeral file management
- Image utilities
- Validation
- Rate limiting
- 85+ tests

### 🔄 Phase 2: Garment Processing (In Progress)

- Segmentation with rembg
- Color extraction
- Thumbnail generation
- **Endpoints**: `/process/segment`, `/process/thumbnail`

### ⏳ Phase 3: Low-Res Try-On (Pending)

- Affine transformations
- Alpha blending
- Exposure compensation
- **Endpoint**: `/tryon/lowres`

### ⏳ Phase 4: High-Res Try-On (Pending)

- Gemini API integration
- Async job management
- Job polling
- **Endpoints**: `/tryon/highres`, `/tryon/result/<job_id>`

### ⏸️ Phase 6: Deferred Features

- Outfit suggestion engine (`/suggest`)
- Advanced analytics
- ONNX optimization

---

## Example Workflows

### Workflow 1: Add Garment to Wardrobe

```bash
# 1. Upload and segment garment
curl -X POST http://localhost:5001/process/segment \
  -F "image=@new_shirt.jpg" \
  -F "type_hint=top"

# Response: mask_png, colors, type
# Client saves mask and metadata locally

# 2. (Optional) Generate thumbnail for multiple items
curl -X POST http://localhost:5001/process/thumbnail \
  -F "images[]=@shirt1.jpg" \
  -F "images[]=@shirt2.jpg" \
  -F "images[]=@pants.jpg"

# Response: thumbnail_png
# Client saves thumbnail locally
```

### Workflow 2: Virtual Try-On (File Upload)

```bash
# 1. Quick preview (low-res)
curl -X POST http://localhost:5001/api/tryon/lowres \
  -H "Authorization: Bearer <token>" \
  -F "selfie=@selfie.jpg" \
  -F "garment=@shirt.jpg" \
  -F "garment_type=top"

# Response: composite_png (immediate)

# 2. High-quality export (opt-in)
curl -X POST http://localhost:5001/api/tryon/highres \
  -H "Authorization: Bearer <token>" \
  -F "selfie=@selfie.jpg" \
  -F "garment_images[]=@shirt.jpg"

# Response: { job_id: "abc123", status: "processing" }

# 3. Poll for result
curl http://localhost:5001/tryon/result/abc123 \
  -H "Authorization: Bearer <token>"

# Response (when ready): { status: "completed", result_png: "..." }
```

### Workflow 3: ID-Based Try-On (Recommended)

```bash
# 1. Upload body reference (one-time)
curl -X POST http://localhost:5001/bodies \
  -H "Authorization: Bearer <token>" \
  -F "file=@my_selfie.jpg"

# Response: { body: { id: "body_abc123", image_url: "..." } }

# 2. Add garments to wardrobe (using Gemini extraction)
curl -X POST http://localhost:5001/process/extract \
  -H "Authorization: Bearer <token>" \
  -F "image=@shirt_photo.jpg" \
  -F "type_hint=top"

# Response: { garment_url: "...", ... }
# (Automatically saved to wardrobe)

# 3. List wardrobe items
curl http://localhost:5001/wardrobe/items \
  -H "Authorization: Bearer <token>"

# Response: { items: [{ id: "item_def456", category: "top", ... }] }

# 4. Try-on using IDs (low-res preview)
curl -X POST http://localhost:5001/api/tryon/lowres \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "body_id": "body_abc123",
    "wardrobe_item_ids": ["item_def456"]
  }'

# Response: { composite_png: "...", pose_detected: true, ... }

# 5. Try-on using IDs (high-res with Gemini)
curl -X POST http://localhost:5001/api/tryon/highres \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "body_id": "body_abc123",
    "wardrobe_item_ids": ["item_def456", "item_ghi789"],
    "gemini_opt_in": true
  }'

# Response: { job_id: "job_xyz", status: "processing" }

# 6. Poll for result
curl http://localhost:5001/tryon/result/job_xyz \
  -H "Authorization: Bearer <token>"

# Response (when ready): { status: "completed", result_png: "..." }
```

### Workflow 4: Outfit Suggestion

```bash
# Send wardrobe metadata (no images)
curl -X POST http://localhost:5001/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"id": "1", "garment_type": "top", "colors": ["red"]},
      {"id": "2", "garment_type": "bottom", "colors": ["blue"]},
      {"id": "3", "garment_type": "shoes", "colors": ["white"]}
    ],
    "context": {"occasion": "casual", "weather": "sunny"},
    "limit": 3
  }'

# Response: ranked outfit combinations
```

---

## Security Considerations

### Implemented

- ✅ File extension validation
- ✅ MIME type verification (python-magic)
- ✅ File size limits
- ✅ Path traversal protection (filename sanitization)
- ✅ Rate limiting per IP
- ✅ CORS configuration
- ✅ Automatic file cleanup (ephemeral storage)

### Recommended for Production

- [ ] Add authentication (API keys or JWT)
- [ ] HTTPS/TLS encryption
- [ ] Input sanitization for JSON payloads
- [ ] Request ID tracking for debugging
- [ ] Structured logging with correlation IDs
- [ ] DDoS protection (Cloudflare, etc.)
- [ ] Network-level restrictions (firewall, VPC)

---

## Chat Agent (LangGraph)

The chat agent provides a natural language interface for interacting with your wardrobe. It can search items, create try-ons, and help you build outfits through conversation.

**Note**: Chat feature must be enabled via `CHAT_ENABLED` environment variable.

### Send Chat Message

#### `POST /api/chat/message`

Send a message to the chat agent and receive a response. Supports both streaming (SSE) and non-streaming modes.

**Authentication**: Required (Bearer token)

**Rate Limit**: 100 messages per hour per user

**Request** (application/json):

```json
{
  "message": "Show me blue tops for work",
  "session_id": "session_abc123", // optional, creates new if missing
  "stream": true, // optional, default: true
  "opt_in_logging": false // optional, default: false
}
```

**Response** (200 OK, SSE stream):

```
event: message
data: {"type": "text", "content": "Found 8 blue tops suitable for work."}

event: tool_call
data: {"tool": "wardrobe_search", "args": {"category": "top", "colors": ["blue"]}}

event: tool_result
data: {"result": "Found 8 matching item(s)..."}

event: message
data: {"type": "text", "content": "Here are your best matches:"}

event: done
data: {"session_id": "session_abc123", "cost_usd": 0.006}
```

**Response** (Non-streaming, 200 OK):

```json
{
  "session_id": "session_abc123",
  "response": "Found 8 blue tops suitable for work. Here are your best matches:",
  "tool_calls": [
    {"tool": "wardrobe_search", "args": {...}}
  ],
  "cost_usd": 0.006
}
```

**SSE Event Types**:

- `message`: Text response from agent
- `tool_call`: Agent is calling a tool (wardrobe_search, tryon_preview, etc.)
- `tool_result`: Result from tool execution
- `done`: Stream complete with session ID and cost
- `error`: Error occurred during processing

**Errors**:

- `400 Bad Request` - Empty message, invalid JSON
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Session belongs to different user
- `404 Not Found` - Session not found
- `429 Too Many Requests` - Rate limit exceeded (100 messages/hour)
- `503 Service Unavailable` - Chat feature not enabled

**cURL Example (Streaming)**:

```bash
curl -X POST http://localhost:5001/api/chat/message \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me blue tops for work",
    "stream": true
  }'
```

**cURL Example (Non-streaming)**:

```bash
curl -X POST http://localhost:5001/api/chat/message \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me blue tops for work",
    "stream": false
  }'
```

---

### List Chat Sessions

#### `GET /api/chat/sessions`

List all conversation sessions for the authenticated user.

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "count": 3,
  "sessions": [
    {
      "id": "session_abc123",
      "created_at": "2024-12-16T10:00:00Z",
      "updated_at": "2024-12-16T10:05:00Z",
      "message_count": 12,
      "summary": "Work outfit search, blue theme"
    }
  ]
}
```

**Errors**:

- `401 Unauthorized` - Missing/invalid token
- `503 Service Unavailable` - Chat feature not enabled

---

### Delete Chat Session

#### `DELETE /api/chat/sessions/<session_id>`

Delete a conversation session (GDPR compliance).

**Authentication**: Required (Bearer token)

**Response** (200 OK):

```json
{
  "message": "Session deleted successfully"
}
```

**Errors**:

- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Session belongs to different user
- `404 Not Found` - Session not found
- `503 Service Unavailable` - Chat feature not enabled

---

### Chat Agent Capabilities

The chat agent can perform the following actions:

1. **Search Wardrobe**: "Show me blue tops for work"
2. **Get Item Details**: "Tell me about item_123"
3. **List Body References**: "What selfies do I have?"
4. **Create Try-On Preview**: "Try the first shirt on me"
5. **Create High-Res Try-On**: "Create a high-quality try-on of this outfit" (requires Gemini opt-in)
6. **Check Try-On Status**: "What's the status of job_abc123?"

**Agent Rules**:

- Never invents item IDs - always uses IDs from search results
- Validates item IDs before using in try-on operations
- Requires body reference for try-on operations
- **Automatic Gemini Consent**: If user requests a try-on, agent assumes consent to use Gemini API (sets `gemini_opt_in=True` automatically)
- Calls `tryon_highres` immediately when user requests try-on if necessary IDs are available
- Maintains conversation context across multiple turns
- Suggests alternatives when searches return no results
- Uses explicit attachment URLs in text for tools when images are attached

**Cost Tracking**:

- Each conversation session tracks LLM API costs
- Costs are calculated based on prompt and completion tokens
- Session cost is returned in the `done` event (streaming) or response (non-streaming)
- Alerts logged if session cost exceeds $0.50

**Session Management**:

- Sessions are stored in Redis with TTL (default: 1 hour)
- Each session maintains conversation state (filters, selected items, body ID)
- Last 5 conversation turns are kept for context
- Sessions are user-scoped (users can only access their own sessions)

**Internal Tool Endpoints** (used by chat agent):

The chat agent uses the following internal endpoints when calling tools:

- `tryon_highres`: Calls `/api/tryon/highres`
- `get_tryon_history`: Calls `/api/tryon/images`

These endpoints are accessed with the user's authentication token automatically.

---

## Support & Troubleshooting

### Common Issues

**"Rate limit exceeded"**

- Wait for `retry_after` seconds
- Reduce request frequency
- Contact admin to increase limit

**"File too large"**

- Compress image before upload
- Check `max_upload_size_mb` in `/health`

**"Invalid MIME type"**

- Ensure file is actual image (not renamed)
- Use allowed formats: JPG, PNG, WEBP

**"Not Implemented (501)"**

- Feature is planned but not yet available
- Check `PROGRESS.md` for implementation timeline

### Getting Help

- Check `/health` endpoint for server status
- Review logs for detailed error messages
- Consult `IMPLEMENTATION_PLAN.md` for feature roadmap
- Open GitHub issue for bugs or feature requests

---

## Decision Engine

The Decision Engine provides guided outfit selection using Gemini-powered mutations.
It generates one outfit at a time, allowing users to refine preferences through natural language.

### Start Decision Session

#### `POST /api/decision/init`

Start a new outfit decision session with context.

**Authentication**: Required

**Request Body**:

```json
{
  "context": {
    "occasion": "work",
    "weather": "warm",
    "formality_pref": "business_casual",
    "custom_context": "professional but comfortable"
  }
}
```

**Context Fields**:

- `occasion`: work | casual | special_event | sports | weekend | date_night | formal_event | beach | outdoor
- `weather`: hot | warm | mild | cold | rainy
- `formality_pref`: casual | business_casual | formal | athletic
- `custom_context`: Optional free-text user intent

**Response** (201 Created):

```json
{
  "session_id": "sess_abc123def456",
  "decision_id": "dec_xyz789",
  "outfit": {
    "items": [
      {
        "id": "item-uuid-1",
        "name": "Blue Oxford Shirt",
        "category": "top",
        "colors": ["blue", "white"]
      },
      {
        "id": "item-uuid-2",
        "name": "Khaki Chinos",
        "category": "bottom",
        "colors": ["beige"]
      }
    ],
    "reasoning": "Classic work-appropriate combination with comfortable fit"
  },
  "custom_context_applied": "professional but comfortable",
  "processing_time_ms": 1200,
  "request_id": "uuid"
}
```

**Errors**:

- `400 Bad Request`: Invalid context or missing wardrobe items
- `401 Unauthorized`: Missing/invalid auth token
- `503 Service Unavailable`: Gemini API unavailable

---

### Generate Mutation

#### `POST /api/decision/mutate`

Generate next outfit variation. May return mutation or trigger correction mode.

**Authentication**: Required

**Request Body**:

```json
{
  "session_id": "sess_abc123def456",
  "decision_id": "dec_xyz789",
  "custom_context": "more colorful",
  "custom_context_mode": "append"
}
```

**Fields**:

- `session_id`: Required - Active session ID
- `decision_id`: Required - Current decision to reject
- `custom_context`: Optional - Refinement request
- `custom_context_mode`: "append" (default) or "replace"

**Response - Mutation Mode** (200 OK):

```json
{
  "mode": "mutation",
  "session_id": "sess_abc123def456",
  "decision_id": "dec_newid123",
  "axis": "color",
  "outfit": {
    "items": [...],
    "axis_change": "Changed to brighter color palette",
    "reasoning": "Added vibrant blue and coral accents"
  },
  "custom_context_applied": "professional but comfortable. more colorful",
  "reject_count": 1,
  "processing_time_ms": 2400,
  "request_id": "uuid"
}
```

**Response - Correction Mode** (200 OK):

When too many rejections occur without custom context:

```json
{
  "mode": "correction",
  "reason": "mutation_exhausted",
  "session_id": "sess_abc123def456",
  "reject_count": 3,
  "ask": {
    "type": "constraint",
    "prompt": "We've tried several variations. What should we avoid?",
    "options": [
      {
        "key": "no_blue",
        "label": "No Blue",
        "constraint": "exclude_color:blue"
      },
      {
        "key": "more_casual",
        "label": "More Casual",
        "constraint": "formality_direction:casual"
      },
      {
        "key": "no_item_abc123",
        "label": "Not this Blue Shirt",
        "constraint": "exclude_item:item-uuid-1"
      }
    ]
  },
  "request_id": "uuid"
}
```

**Errors**:

- `400 Bad Request`: Session not found or not active
- `401 Unauthorized`: Missing/invalid auth token
- `503 Service Unavailable`: Gemini API unavailable

---

### Accept Outfit

#### `POST /api/decision/accept`

Accept an outfit and close the session.

**Authentication**: Required

**Request Body**:

```json
{
  "session_id": "sess_abc123def456",
  "decision_id": "dec_xyz789"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "session_id": "sess_abc123def456",
  "decision_id": "dec_xyz789",
  "final_outfit": {
    "items": [...],
    "reasoning": "..."
  },
  "time_to_decision_ms": 45000,
  "total_decisions": 3,
  "reject_count": 2,
  "request_id": "uuid"
}
```

**Errors**:

- `400 Bad Request`: Session or decision not found
- `401 Unauthorized`: Missing/invalid auth token

---

### Apply Correction

#### `POST /api/decision/correct`

Apply a structured correction and regenerate outfit.

**Authentication**: Required

**Request Body**:

```json
{
  "session_id": "sess_abc123def456",
  "correction": {
    "key": "no_blue",
    "label": "No Blue",
    "constraint": "exclude_color:blue"
  }
}
```

**Response** (200 OK):

```json
{
  "mode": "mutation",
  "session_id": "sess_abc123def456",
  "decision_id": "dec_newid456",
  "axis": "color",
  "outfit": {...},
  "corrections_applied": [
    {
      "key": "no_blue",
      "label": "No Blue",
      "constraint": "exclude_color:blue"
    }
  ],
  "processing_time_ms": 2100,
  "request_id": "uuid"
}
```

---

### Get Session Status

#### `GET /api/decision/session/<session_id>`

Get current session state and decision history.

**Authentication**: Required

**Response** (200 OK):

```json
{
  "id": "sess_abc123def456",
  "user_id": "user-uuid",
  "status": "active",
  "context": {
    "occasion": "work",
    "weather": "warm"
  },
  "custom_context_history": [
    {"step": 0, "text": "professional but comfortable", "mode": "init", "timestamp": "..."},
    {"step": 2, "text": "more colorful", "mode": "append", "timestamp": "..."}
  ],
  "current_custom_context": "professional but comfortable. more colorful",
  "reject_count": 2,
  "variation_history": ["color", "silhouette"],
  "decisions": [
    {"id": "dec_1", "axis_used": null, "action": "rejected", ...},
    {"id": "dec_2", "axis_used": "color", "action": "rejected", ...},
    {"id": "dec_3", "axis_used": "silhouette", "action": "pending", ...}
  ],
  "created_at": "2024-01-21T10:00:00Z",
  "updated_at": "2024-01-21T10:05:00Z",
  "request_id": "uuid"
}
```

---

### List User Sessions

#### `GET /api/decision/sessions`

List user's decision sessions.

**Authentication**: Required

**Query Parameters**:

- `status`: Filter by status (active, closed, timeout)
- `limit`: Max sessions to return (default 10, max 50)

**Response** (200 OK):

```json
{
  "sessions": [
    {
      "id": "sess_abc123",
      "status": "active",
      "context": { "occasion": "work" },
      "reject_count": 2,
      "created_at": "2024-01-21T10:00:00Z",
      "closed_at": null,
      "time_to_decision_ms": null
    },
    {
      "id": "sess_xyz789",
      "status": "closed",
      "context": { "occasion": "casual" },
      "reject_count": 1,
      "created_at": "2024-01-20T15:00:00Z",
      "closed_at": "2024-01-20T15:03:00Z",
      "time_to_decision_ms": 180000
    }
  ],
  "count": 2,
  "request_id": "uuid"
}
```

---

**Last Updated**: February 4, 2026
**API Version**: 1.2.0

---

## Recommendation Engine V2

### Start Recommendation Session

#### `POST /api/recommendation/start`

Start a new recommendation session and generate an initial outfit.

**Authentication**: Required (Bearer token)

**Request** (application/json):

```json
{
  "weather": {
    "temp_c": 22
  },
  "user": {
    "gender": "MASCULINE", // Optional if user has gender set in profile (profile takes precedence)
    "occasion": "work"
  }
}
```

**Gender Filtering Behavior**:

- The recommendation engine uses `gender_tags` for **strict filtering** (Safety Funnel)
- **MASCULINE**: Only shows items with `"M"` tag (excludes W-only items like dresses)
- **FEMININE**: Only shows items with `"W"` tag (excludes M-only items like structured blazers)
- **UNISEX/null**: Shows all items (no filtering)
- Items with `["M", "W", "U"]` (universal) appear for all preferences
- See "Gender Tagging System" section for detailed scoring rules

**Response** (200 OK):

```json
{
  "outfit": {
    "items": [
      {
        "id": "SYS_...",
        "name": "White T-Shirt",
        "category_code": "TEE",
        "layer_code": "L2",
        ...
      },
      ...
    ],
    "styling_note": "A comfortable and professional look for work.",
    "outfit_hash": "TEE_WHT_REG|JNS_NVY_SLM|SNK_WHT_low",
    "fallback_flags": []
  },
  "session_id": "uuid-string",
  "fallback_flags": []
}
```

### Next Variation (Try Another)

#### `POST /api/recommendation/next`

Get the next variation in the cycle (Silhouette -> Layering -> Color -> New Anchor).

**Authentication**: Required (Bearer token)

**Request** (application/json):

```json
{
  "session_id": "uuid-string",
  "current_outfit_hash": "TEE_WHT_REG|JNS_NVY_SLM|SNK_WHT_low"
}
```

**Response** (200 OK):

```json
{
  "outfit": {
    "items": [...],
    "styling_note": "Changed the silhouette for a more relaxed fit.",
    "outfit_hash": "TEE_WHT_OVS|JNS_NVY_SLM|SNK_WHT_low",
    "fallback_flags": []
  },
  "variation_axis": "SILHOUETTE",
  "fallback_flags": []
}
```

**Response (Fallback)**:

```json
{
  "fallback": true,
  "message": "No more unique variations available."
}
```

---

### Batch Evaluate Scenarios

#### `POST /api/recommendation/evaluate`

Batch evaluate multiple recommendation scenarios for testing and analysis.

**Authentication**: Required (Bearer token)

**Rate Limit**: 50 requests per minute

**Request** (application/json):

```json
{
  "scenarios": [
    {
      "id": "scenario_1",
      "temp_c": 22,
      "occasion": "work",
      "gender": "MASCULINE"
    },
    {
      "id": "scenario_2",
      "temp_c": 15,
      "occasion": "casual",
      "gender": "FEMININE"
    }
  ]
}
```

**Request Fields**:

- `scenarios` (array, required): List of scenarios to evaluate
  - `id` (string): Unique identifier for scenario
  - `temp_c` (number): Temperature in Celsius
  - `occasion` (string): Occasion context
  - `gender` (string): MASCULINE | FEMININE | UNISEX

**Response** (200 OK):

```json
{
  "results": [
    {
      "id": "scenario_1",
      "outfit": {
        "items": [...],
        "styling_note": "...",
        "outfit_hash": "..."
      },
      "success": true
    },
    {
      "id": "scenario_2",
      "outfit": {...},
      "success": true
    }
  ]
}
```

**Errors**:

- `400 Bad Request` - Missing scenarios list
- `401 Unauthorized` - Missing/invalid token
- `500 Internal Server Error` - Evaluation failed

**Notes**:

- Used for testing recommendation engine performance
- Generates outfits without creating sessions
- Results include success status per scenario
- Failed scenarios return error message instead of outfit

---

### Get Recommendation History

#### `GET /api/recommendation/history`

Retrieve user's recommendation history grouped by session. Each session contains all API calls (start + next variations) with context, outfits, and performance metrics.

**Authentication**: Required (Bearer token)

**Rate Limit**: 30 requests per minute

**Query Parameters**:

- `limit` (integer, optional): Maximum number of logs to return (default: 50, max: 100)

**Request**:

```http
GET /api/recommendation/history?limit=20
Authorization: Bearer <access_token>
```

**Response** (200 OK):

```json
{
  "sessions": [
    {
      "session_id": "uuid-string",
      "started_at": "2026-02-15T10:30:00Z",
      "weather_context": {
        "temp_c": 22,
        "lat": 37.7749,
        "long": -122.4194
      },
      "user_context": {
        "gender": "MASCULINE",
        "occasion": "work"
      },
      "requests": [
        {
          "request_type": "start",
          "outfit_hash": "TEE_WHT_REG|JNS_NVY_SLM|SNK_WHT_low",
          "outfit_items": ["item_id_1", "item_id_2", "item_id_3"],
          "styling_note": "A comfortable and professional look for work.",
          "variation_axis": null,
          "processing_time_ms": 150,
          "created_at": "2026-02-15T10:30:00.123Z"
        },
        {
          "request_type": "next",
          "outfit_hash": "TEE_WHT_OVS|JNS_NVY_SLM|SNK_WHT_low",
          "outfit_items": ["item_id_4", "item_id_2", "item_id_3"],
          "styling_note": "Changed the silhouette for a more relaxed fit.",
          "variation_axis": "SILHOUETTE",
          "processing_time_ms": 120,
          "created_at": "2026-02-15T10:31:15.456Z"
        }
      ]
    },
    {
      "session_id": "another-uuid",
      "started_at": "2026-02-14T15:20:00Z",
      "weather_context": {...},
      "user_context": {...},
      "requests": [...]
    }
  ],
  "total_sessions": 2
}
```

**Response Fields**:

- `sessions` (array): List of recommendation sessions, ordered by most recent first
  - `session_id` (string): Unique session identifier
  - `started_at` (string): ISO 8601 timestamp of first request
  - `weather_context` (object): Weather data from first request
    - `temp_c` (number): Temperature in Celsius
    - `lat` (number, optional): Latitude coordinate
    - `long` (number, optional): Longitude coordinate
  - `user_context` (object): User preferences from first request
    - `gender` (string): MASCULINE | FEMININE | UNISEX
    - `occasion` (string): Occasion context (work, casual, etc.)
  - `requests` (array): All API calls in this session, chronologically ordered
    - `request_type` (string): "start" or "next"
    - `outfit_hash` (string): Outfit identifier hash
    - `outfit_items` (array): List of wardrobe item IDs in the outfit
    - `styling_note` (string): AI-generated styling description
    - `variation_axis` (string, nullable): Variation applied (SILHOUETTE, LAYERING, COLOR, NEW_ANCHOR)
    - `processing_time_ms` (integer): API processing time in milliseconds
    - `created_at` (string): ISO 8601 timestamp of this request
- `total_sessions` (integer): Total number of sessions returned

**Errors**:

- `401 Unauthorized` - Missing/invalid token
- `500 Internal Server Error` - Failed to retrieve history

**Use Cases**:

1. **User History View**: Display past outfit recommendations to user
2. **Analytics**: Track which variations users explore most
3. **Debugging**: Reproduce issues by reviewing session context and outputs
4. **Performance Monitoring**: Analyze `processing_time_ms` across requests
5. **User Preferences**: Identify patterns in occasions, weather conditions

**Example Use Case - Recently Viewed Outfits**:

```javascript
// Mobile app: Show "Recent Recommendations"
fetch('/api/recommendation/history?limit=5', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
})
  .then(res => res.json())
  .then(data => {
    // Show last 5 sessions as thumbnails
    data.sessions.forEach(session => {
      const firstOutfit = session.requests[0];
      renderOutfitThumbnail(firstOutfit.outfit_items);
    });
  });
```

**Notes**:

- Sessions are grouped by `session_id` - all `/start` and `/next` calls in same session appear together
- Logs are created automatically for every `/start` and `/next` API call
- Weather context includes coordinates if provided in original `/start` request
- `variation_axis` is null for `/start` requests, set for `/next` requests
- Limit parameter caps at 100 to prevent excessive data transfer
- Processing time helps identify performance bottlenecks

---

### Recommendation Test UI

#### `GET /api/recommendation/test-ui`

Serve the recommendation engine test interface (HTML page).

**Authentication**: Not required

**Response**: HTML page with interactive recommendation testing UI

**Notes**:

- Renders `recommendation_test.html` template
- Provides UI for manual testing of recommendation engine
- Includes controls for temperature, occasion, gender selection
- Real-time outfit generation and variation testing

---

### Recommendation Dashboard

#### `GET /api/recommendation/dashboard`

Serve the Recommendation Matrix Dashboard for visualization.

**Authentication**: Not required

**Response**: HTML page with recommendation matrix visualization

**Notes**:

- Renders `recommendation_dashboard.html` template
- Displays outfit recommendations across multiple scenarios
- Matrix view: temperature × occasion × gender
- Used for evaluating recommendation coverage and quality

---

## Admin Interface

The Admin Interface provides management tools for Common Items (system baseline catalog). These endpoints are used by administrators to create, update, and manage the wardrobe item templates used by the recommendation engine.

### List Common Items (Admin View)

#### `GET /admin/common-items`

List and filter Common Items with search functionality (admin interface, returns HTML).

**Authentication**: Not required (admin interface should be network-restricted)

**Query Parameters** (all optional):

- `category` (string): Filter by category code (TEE, SHR, BLZ, etc.)
- `layer` (string): Filter by layer code (L1, L2, L3, BT, SH)
- `color` (string): Filter by color code (WHT, BLK, NVY, etc.)
- `fit` (string): Filter by fit code (SLM, REG, OVS, TLR)
- `search` (string): Search by item name (case-insensitive)

**Response**: HTML page (`admin_common_items.html`) with:

- Filtered list of Common Items
- Search and filter controls
- Create/Edit/Delete actions
- Metadata editing forms

**Notes**:

- Returns rendered HTML template, not JSON
- Provides UI dropdowns for all available codes (ITEM_CODES, LAYERS, COLORS, FITS, etc.)
- Items are filtered by `is_common_item=True` and `is_deleted=False`
- Used for visual management of system catalog

---

### Create Common Item

#### `POST /admin/common-items/create`

Create a new Common Item in the system catalog.

**Authentication**: Not required (admin interface should be network-restricted)

**Request** (multipart/form-data):

```
name: <string> (required) - Item name (e.g., "White T-Shirt")
category_code: <string> (required) - Category code (TEE, SHR, BLZ, JNS, etc.)
layer_code: <string> (required) - Layer code (L1, L2, L3, BT, SH)
image: <file> (optional) - Item image file
attr:color_code: <string> - Physical attribute: color code (WHT, BLK, etc.)
attr:fit_code: <string> - Physical attribute: fit code (REG, SLM, OVS, TLR)
attr:pattern_type: <string> - Physical attribute: pattern (SOLID, STRIPED, PLAID)
attr:is_tuckable: <boolean> - Physical attribute: can be tucked
attr:is_water_resistant: <boolean> - Physical attribute: water resistant
meta:formality_score: <int> - Styling metadata: formality (1-10)
meta:warmth_level: <int> - Styling metadata: warmth (1-5)
meta:versatility_score: <int> - Styling metadata: versatility (1-10)
meta:visual_weight: <int> - Styling metadata: visual weight (1-5)
meta:climate_fit: <string> - Styling metadata: HOT | MILD | COOL
```

**Form Field Prefixes**:

- `attr:*` - Physical attributes (stored in `physical_attributes` JSON)
- `meta:*` - Styling metadata (stored in `styling_metadata` JSON)

**Response**: Redirect to `/admin/common-items` with flash message

**Success**: Flash message "Item '[name]' registered successfully"

**Errors**: Flash message "Error creating item: [error details]"

**Notes**:

- Automatically generates `human_readable_id`: `SYS_{LAYER}_{CATEGORY}_{COLOR}_{FIT}_{INDEX}`
- Example: `SYS_L2_TEE_WHT_REG_01`
- Sets `owner_id="SYSTEM"` and `is_common_item=True`
- Derives `category` from `category_code` using mapping
- Uploads image to S3 with prefix `common_items/`
- Auto-increments index if similar items exist

---

### Update Common Item

#### `POST /admin/common-items/<item_id>/update`

Update metadata and attributes for an existing Common Item.

**Authentication**: Not required (admin interface should be network-restricted)

**Request** (multipart/form-data):

```
name: <string> (optional) - Updated item name
category_code: <string> (optional) - Updated category code
layer_code: <string> (optional) - Updated layer code
image: <file> (optional) - New item image (replaces existing)
attr:*: <various> - Updated physical attributes
meta:*: <various> - Updated styling metadata
```

**Response**: Redirect to `/admin/common-items` with flash message

**Success**: Flash message "Item '[name]' updated successfully"

**Errors**: Flash message "Error updating item: [error details]"

**Notes**:

- Only provided fields are updated (partial update supported)
- New image replaces existing image URL
- Metadata is merged with existing values
- Physical attributes are merged with existing values
- Uses `_parse_metadata_forms()` helper for safe parsing

---

### Delete Common Item

#### `POST /admin/common-items/<item_id>/delete`

Soft-delete a Common Item (sets `is_deleted=True`).

**Authentication**: Not required (admin interface should be network-restricted)

**Request**: No body required

**Response**: Redirect to `/admin/common-items` with flash message

**Success**: Flash message "Item '[name]' deleted successfully"

**Errors**: Flash message "Error deleting item: [error details]"

**Notes**:

- Soft delete only (row preserved in database)
- Item will be excluded from future queries (filtered by `is_deleted=False`)
- Can be restored by setting `is_deleted=False` via database
- Does not delete associated S3 image

---

### AI Classify Gender

#### `POST /admin/common-items/<item_id>/ai-classify-gender`

Use AI to automatically classify the target gender for a Common Item based on its image.

**Authentication**: Not required (admin interface should be network-restricted)

**Request**: No body required (uses item's `image_url`)

**Response** (200 OK):

```json
{
  "success": true,
  "target_gender": "MASCULINE",
  "gender_weight": 0.85
}
```

**Response Fields**:

- `success` (boolean): Whether classification succeeded
- `target_gender` (string): MASCULINE | FEMININE | UNISEX
- `gender_weight` (float): Confidence score (0.0-1.0)

**Errors**:

- `400 Bad Request` - Item has no image URL
- `500 Internal Server Error` - AI classification failed

**Notes**:

- Requires item to have valid `image_url`
- Uses Fashion AI Service for gender classification
- Automatically updates item's `styling_metadata`:
  - `target_gender`: Classification result
  - `gender_weight`: Confidence score
- Used to enrich Common Items with gender targeting
- Helps recommendation engine filter by user gender preference

---

## Algorithm Cockpit (Admin API)

The Algorithm Cockpit provides administrative controls for configuring the Recommendation Engine dynamically. It allows admins to create, test, promote, and rollback algorithm configurations without code changes.

**Base URL**: `/api/admin`

**Authentication**: All endpoints require admin role (`@require_admin` decorator).

### Configuration Lifecycle

```
DRAFT → (promote) → ACTIVE → (new promote) → ARCHIVED
                        ↑___(rollback)_____|
```

- **DRAFT**: New configuration being tested in simulator
- **ACTIVE**: Currently serving production traffic (only ONE at a time)
- **ARCHIVED**: Previous versions, available for rollback

---

### List Configurations

#### `GET /api/admin/configs`

List algorithm configurations with optional status filter.

**Authentication**: Required (Admin role)

**Query Parameters**:

- `status` (string, optional): Filter by status - `DRAFT`, `ACTIVE`, `ARCHIVED`
- `limit` (integer, optional): Max results (default: 50)

**Response** (200 OK):

```json
{
  "configs": [
    {
      "id": "uuid-string",
      "name": "Winter Experiment A",
      "version": 12,
      "status": "DRAFT",
      "created_by": "admin-user-id",
      "created_at": "2026-02-16T10:00:00Z",
      "updated_at": "2026-02-16T12:00:00Z",
      "promoted_at": null,
      "archived_at": null
    }
  ],
  "count": 1
}
```

**Notes**:

- Parameters blob is excluded from list view for performance
- Use GET `/api/admin/configs/<id>` for full details

---

### Get Configuration

#### `GET /api/admin/configs/<config_id>`

Get a specific configuration with full parameters.

**Authentication**: Required (Admin role)

**Response** (200 OK):

```json
{
  "id": "uuid-string",
  "name": "Winter Experiment A",
  "version": 12,
  "status": "DRAFT",
  "parameters": {
    "weather_rules": {
      "cold_threshold_c": 15,
      "cool_threshold_c": 20,
      "hot_threshold_c": 28
    },
    "scoring_weights": {
      "formality_gap_max": 3,
      "visual_weight_gap_max": 2,
      "max_non_solid_patterns": 1,
      "formality_widen_range": 2
    },
    "llm_config": {
      "model_name": "gemini-2.0-flash",
      "temperature": 0.7,
      "max_retries": 1,
      "prompts": {
        "system_role": "You are Auxi...",
        "generation_template": "...",
        "stage_1_variation": "...",
        "stage_2_variation_cold": "...",
        "stage_2_variation_hot": "...",
        "stage_3_variation": "...",
        "variation_system_role": "...",
        "styling_note_directive": "..."
      }
    }
  },
  "created_by": "admin-user-id",
  "created_at": "2026-02-16T10:00:00Z",
  "updated_at": "2026-02-16T12:00:00Z",
  "promoted_at": null,
  "archived_at": null
}
```

**Errors**:

- `404 Not Found` - Config not found

---

### Create Draft Configuration

#### `POST /api/admin/configs`

Create a new DRAFT configuration.

**Authentication**: Required (Admin role)

**Request** (application/json):

```json
{
  "name": "Winter Experiment A",
  "parameters": { ... },
  "clone_from_active": true
}
```

**Request Fields**:

- `name` (string, required): Display name for the configuration
- `parameters` (object, optional): Full config parameters. If not provided and `clone_from_active=true`, clones from ACTIVE config
- `clone_from_active` (boolean, optional): Clone from ACTIVE if no parameters provided (default: true)

**Response** (201 Created):

```json
{
  "id": "uuid-string",
  "name": "Winter Experiment A",
  "version": 13,
  "status": "DRAFT",
  "parameters": { ... },
  "created_by": "admin-user-id",
  "created_at": "2026-02-16T10:00:00Z",
  "updated_at": "2026-02-16T10:00:00Z",
  "promoted_at": null,
  "archived_at": null
}
```

**Errors**:

- `400 Bad Request` - Missing config name

**Notes**:

- Version auto-increments from max existing version
- If no ACTIVE config exists and no parameters provided, uses DEFAULT_ALGORITHM_CONFIG

---

### Update Draft Configuration

#### `PUT /api/admin/configs/<config_id>`

Update a DRAFT configuration. Only DRAFT configs can be edited.

**Authentication**: Required (Admin role)

**Request** (application/json):

```json
{
  "name": "Updated Name",
  "parameters": {
    "weather_rules": {
      "cold_threshold_c": 12
    }
  }
}
```

**Response** (200 OK): Full config object

**Errors**:

- `400 Bad Request` - Cannot edit non-DRAFT config

---

### Delete Draft Configuration

#### `DELETE /api/admin/configs/<config_id>`

Delete a DRAFT configuration (hard delete).

**Authentication**: Required (Admin role)

**Response** (200 OK):

```json
{
  "message": "Config deleted successfully"
}
```

**Errors**:

- `400 Bad Request` - Can only delete DRAFT configs

---

### Promote Configuration

#### `POST /api/admin/configs/<config_id>/promote`

Promote a DRAFT config to ACTIVE.

**Authentication**: Required (Admin role)

**Atomic Transaction**:

1. Validates config parameters
2. Sets current ACTIVE → ARCHIVED
3. Sets target DRAFT → ACTIVE
4. Invalidates config cache

**Validation Rules**:

- `cold_threshold_c < cool_threshold_c < hot_threshold_c`
- `temperature` between 0.0 and 1.0
- All required prompt keys present

**Response** (200 OK):

```json
{
  "message": "Config 'Winter Experiment A' v13 is now ACTIVE",
  "promoted": true
}
```

**Errors**:

- `400 Bad Request` - Validation failed or not a DRAFT config

```json
{
  "error": "Validation failed: cold_threshold_c (20) must be < cool_threshold_c (15)",
  "promoted": false
}
```

---

### Rollback Configuration

#### `POST /api/admin/configs/<config_id>/rollback`

Rollback to an ARCHIVED config.

**Authentication**: Required (Admin role)

**Atomic Transaction**:

1. Sets current ACTIVE → ARCHIVED
2. Sets target ARCHIVED → ACTIVE
3. Invalidates config cache

**Response** (200 OK):

```json
{
  "message": "Rolled back to 'Production v10' v10",
  "rolled_back": true
}
```

**Errors**:

- `400 Bad Request` - Can only rollback ARCHIVED configs

---

### Simulate Recommendation

#### `POST /api/admin/simulate`

Run the recommendation engine with a specific config for testing. Returns detailed debug trace.

**Authentication**: Required (Admin role)

**Request** (application/json):

```json
{
  "config_id": "uuid-string",
  "mock_context": {
    "temp_c": 12,
    "occasion": "work",
    "gender": "MASCULINE"
  },
  "config_override": {
    "weather_rules": {
      "cold_threshold_c": 10
    }
  },
  "variation_test": {
    "enabled": false
  }
}
```

**Request Fields**:

- `config_id` (string, optional): Config UUID to use. If not provided, uses ACTIVE config
- `mock_context` (object, required):
  - `temp_c` (number, required): Temperature in Celsius
  - `occasion` (string, optional): Occasion context (default: "casual")
  - `gender` (string, optional): Gender preference - MASCULINE, FEMININE, UNISEX
- `config_override` (object, optional): Temporary tweaks merged into config
- `variation_test` (object, optional): Enable variation testing (see below)

**Response** (200 OK):

```json
{
  "success": true,
  "debug_trace": {
    "config_used": {
      "id": "uuid-string",
      "name": "Winter Experiment A",
      "version": 12,
      "status": "DRAFT",
      "overrides_applied": true
    },
    "safety_funnel": {
      "weather_thresholds": {
        "cold_threshold_c": 10,
        "cool_threshold_c": 20,
        "hot_threshold_c": 28
      },
      "temperature": 12,
      "allowed_warmth_levels": [3, 4, 5],
      "l3_required": true,
      "pool_counts": {
        "BT": 15,
        "L2": 25,
        "L3": 10,
        "SH": 15,
        "AC": 5
      },
      "total_pool_size": 70
    },
    "anchor_selection": {
      "anchor_hrid": "SYS_BT_JNS_NVY_SLM_01",
      "occasion": "work"
    },
    "llm_request": {
      "model": "gemini-2.0-flash",
      "temperature": 0.7
    },
    "validation": {
      "fallback_flags": [],
      "is_valid": true
    }
  },
  "final_outfit": {
    "items": [...],
    "styling_note": "A professional winter look combining...",
    "outfit_hash": "JNS_NVY_SLM|TEE_WHT_REG|JKT_BLK_REG|SNK_WHT"
  }
}
```

**Dead End Response**:

```json
{
  "success": false,
  "dead_end": true,
  "reason": "Not enough items pass safety funnel",
  "debug_trace": { ... },
  "suggestion": "Check weather_rules thresholds or add more common items"
}
```

---

### Simulate Variation

Add `variation_test` to the simulate request to test "Try Another" logic.

**Request**:

```json
{
  "config_id": "uuid-string",
  "mock_context": {
    "temp_c": 12,
    "occasion": "work",
    "gender": "MASCULINE"
  },
  "variation_test": {
    "enabled": true,
    "target_stage": 1,
    "current_outfit": {
      "items": [
        {
          "id": "item-uuid-1",
          "layer_code": "BT",
          "category_code": "JNS",
          "physical_attributes": { "fit_code": "SLM", "color_code": "NVY" }
        },
        {
          "id": "item-uuid-2",
          "layer_code": "L2",
          "category_code": "TEE",
          "physical_attributes": { "fit_code": "REG", "color_code": "WHT" }
        }
      ]
    }
  }
}
```

**Variation Stages**:

- Stage 1 (SILHOUETTE): Change L2 fit (same category & color)
- Stage 2 (LAYERING): Change L3 (cold) or SH (hot)
- Stage 3 (COLOR): Change L2 color (same category & fit)
- Stage 4 (NEW_ANCHOR): Full regeneration required

**Response**:

```json
{
  "success": true,
  "variation_result": {
    "axis": "SILHOUETTE",
    "target_layer": "L2",
    "constraint_check": {
      "stage_1_color_unchanged": true,
      "stage_1_category_unchanged": true,
      "stage_1_fit_changed": true
    },
    "new_outfit": {
      "items": [...],
      "styling_note": "Changed the silhouette for a more relaxed fit.",
      "outfit_hash": "JNS_NVY_SLM|TEE_WHT_OVS|SNK_WHT"
    }
  },
  "debug_trace": { ... }
}
```

---

### Cache Management

#### `GET /api/admin/configs/cache`

Get current config cache status.

**Authentication**: Required (Admin role)

**Response**:

```json
{
  "is_cached": true,
  "is_expired": false,
  "cache_age_seconds": 120.5,
  "cache_ttl_seconds": 300,
  "config_meta": {
    "id": "uuid-string",
    "name": "Production v10",
    "version": 10
  }
}
```

---

#### `POST /api/admin/configs/cache/invalidate`

Force invalidate the config cache.

**Authentication**: Required (Admin role)

**Response**:

```json
{
  "message": "Cache invalidated"
}
```

---

#### `GET /api/admin/configs/default`

Get the default fallback configuration.

**Authentication**: Required (Admin role)

**Response**: Full DEFAULT_ALGORITHM_CONFIG object

---

### Configuration Parameters Schema

**Full Parameters JSON Structure**:

```json
{
  "weather_rules": {
    "cold_threshold_c": 15,
    "cool_threshold_c": 20,
    "hot_threshold_c": 28
  },
  "scoring_weights": {
    "formality_gap_max": 3,
    "visual_weight_gap_max": 2,
    "max_non_solid_patterns": 1,
    "formality_widen_range": 2
  },
  "llm_config": {
    "model_name": "gemini-1.5-flash",
    "temperature": 0.7,
    "max_retries": 1,
    "prompts": {
      "system_role": "You are Auxi, a Technical Fashion Archivist...",
      "generation_template": "CONTEXT: Temperature: {temp_c}C...",
      "stage_1_variation": "Replace ONLY the L2 item. Choose a new L2 with a different fit style.",
      "stage_2_variation_cold": "Replace ONLY the L3 item. Choose a different outerwear.",
      "stage_2_variation_hot": "Replace ONLY the SH item. Choose different shoes.",
      "stage_3_variation": "Replace ONLY the L2 item. Choose a new L2 with a different color.",
      "variation_system_role": "You are Auxi. Select exactly one item to replace the target layer item as requested.",
      "styling_note_directive": "Tone: Calm, practical. No 'amazing' or 'perfect'. Keep it short."
    }
  }
}
```

**Supported LLM Models**:

- Gemini: `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`
- OpenAI: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`, `o1-preview`
- Groq: `llama-3.1-70b-versatile`, `mixtral-8x7b-32768`

**Required Prompt Keys**:

- `system_role`
- `generation_template`
- `stage_1_variation`
- `stage_2_variation_cold`
- `stage_2_variation_hot`
- `stage_3_variation`
- `variation_system_role`
- `styling_note_directive`
