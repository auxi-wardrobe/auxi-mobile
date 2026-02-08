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

#### `POST /api/v1/register`

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
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-12-07T10:00:00Z",
    "is_active": true
  }
}
```

**Errors**:

- `400 Bad Request` - Missing email or password
- `409 Conflict` - Email already registered
- `500 Internal Server Error` - Database error

### Login

#### `POST /api/v1/login`

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

#### `POST /api/v1/token/refresh`

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

#### `GET /api/v1/me`

Get profile information for the current authenticated user.

**Header**: `Authorization: Bearer <access_token>`

**Response** (200 OK):

```json
{
  "id": "1",
  "email": "user@example.com",
  "role": "user",
  "is_first_login": true,
  "user_metadata": {},
  "created_at": "2024-12-07T10:00:00Z",
  "is_active": true
}
```

### Update User Profile

#### `PUT /api/v1/me`

Update profile information for the current authenticated user.

**Header**: `Authorization: Bearer <access_token>`

**Request** (application/json):

```json
{
  "is_first_login": false,
  "user_metadata": {
    "onboarding_step": 2,
    "preferences": "dark_mode"
  }
}
```

**Response** (200 OK):

```json
{
  "id": "1",
  "email": "user@example.com",
  "role": "user",
  "is_first_login": false,
  "user_metadata": {
    "onboarding_step": 2,
    "preferences": "dark_mode"
  },
  "created_at": "2024-12-07T10:00:00Z",
  "is_active": true
}
```

**Errors**:

- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Missing or invalid access token
- `500 Internal Server Error` - Update failed

### Logout

#### `POST /api/v1/logout`

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

#### `POST /upload/file`

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
curl -X POST http://localhost:5001/upload/file \
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

## Garment Processing

### Segment Garment

#### `POST /process/segment`

Segment a garment image and extract metadata (colors, type).

**Request** (multipart/form-data):

```
image: <file>  (required) - Garment image (JPG, PNG, WEBP, max 3MB)
type_hint: <string> (optional) - Garment type hint ("top", "bottom", "shoes", etc.)
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/process/segment \
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

#### `POST /process/thumbnail`

Generate a thumbnail collage from multiple garment images.

**Request** (multipart/form-data):

```
images[]: <file>  (required, multiple) - 2-10 garment images
layout_hint: <string> (optional) - "grid_2x3", "grid_3x2", etc.
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/process/thumbnail \
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

#### `POST /process/extract`

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
curl -X POST http://localhost:5001/process/extract \
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

#### `POST /bodies`

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

#### `GET /bodies`

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

#### `DELETE /bodies/<id>`

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

#### `GET /wardrobe/items`

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

### Update Wardrobe Item Attributes

#### `POST /wardrobe/items/<id>/attributes`

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

#### `GET /wardrobe/filter`

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

### Delete a Wardrobe Item (Soft Delete)

#### `DELETE /wardrobe/items/<item_id>`

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

#### `POST /suggest`

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
curl -X POST http://localhost:5001/suggest \
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

#### `POST /tryon/lowres`

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
curl -X POST http://localhost:5001/tryon/lowres \
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
curl -X POST http://localhost:5001/tryon/lowres \
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

#### `POST /tryon/highres`

**Mode 1: Multipart File Upload** (backward compatible)

**Request** (multipart/form-data):

```
selfie: <file> (required) - User selfie
garment_images[]: <file> (required, multiple) - Garments to composite
prompt_params: <json> (optional) - Additional prompt parameters
```

**cURL Example**:

```bash
curl -X POST http://localhost:5001/tryon/highres \
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
curl -X POST http://localhost:5001/tryon/highres \
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

#### `GET /tryon/images`

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

#### `POST /feedback`

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
curl -X POST http://localhost:5001/feedback \
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
curl -X POST http://localhost:5001/tryon/lowres \
  -H "Authorization: Bearer <token>" \
  -F "selfie=@selfie.jpg" \
  -F "garment=@shirt.jpg" \
  -F "garment_type=top"

# Response: composite_png (immediate)

# 2. High-quality export (opt-in)
curl -X POST http://localhost:5001/tryon/highres \
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
curl -X POST http://localhost:5001/tryon/lowres \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "body_id": "body_abc123",
    "wardrobe_item_ids": ["item_def456"]
  }'

# Response: { composite_png: "...", pose_detected: true, ... }

# 5. Try-on using IDs (high-res with Gemini)
curl -X POST http://localhost:5001/tryon/highres \
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

#### `POST /api/v1/chat/message`

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
curl -X POST http://localhost:5001/api/v1/chat/message \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me blue tops for work",
    "stream": true
  }'
```

**cURL Example (Non-streaming)**:

```bash
curl -X POST http://localhost:5001/api/v1/chat/message \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me blue tops for work",
    "stream": false
  }'
```

---

### List Chat Sessions

#### `GET /api/v1/chat/sessions`

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

#### `DELETE /api/v1/chat/sessions/<session_id>`

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

- `tryon_highres`: Calls `/tryon/highres` (not `/api/v1/tryon/highres`)
- `get_tryon_history`: Calls `/tryon/images` (not `/api/v1/tryon/images`)

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

#### `POST /api/v1/decision/init`

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

#### `POST /api/v1/decision/mutate`

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

#### `POST /api/v1/decision/accept`

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

#### `POST /api/v1/decision/correct`

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

#### `GET /api/v1/decision/session/<session_id>`

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

#### `GET /api/v1/decision/sessions`

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

#### `POST /api/v2/recommendation/start`

Start a new recommendation session and generate an initial outfit.

**Authentication**: Required (Bearer token)

**Request** (application/json):

```json
{
  "weather": {
    "temp_c": 22
  },
  "user": {
    "gender": "MASCULINE",
    "occasion": "work"
  }
}
```

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

#### `POST /api/v2/recommendation/next`

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
