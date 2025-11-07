# 🎬 Streaming App - Complete API Documentation

**Base URL:** `http://localhost:5000`

## 📋 Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Video APIs](#video-apis)
3. [User Management APIs](#user-management-apis)
4. [Streaming APIs](#streaming-apis)
5. [Admin APIs](#admin-apis)
6. [Health Check](#health-check)

---

## 🔐 Authentication APIs

### 1. Send OTP
**POST** `/api/auth/send-otp`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "devOtp": "123456"  // Only in development mode
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

---

### 2. Verify OTP & Login/Signup
**POST** `/api/auth/verify-otp`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "otp": "123456",
  "deviceInfo": "Chrome Browser" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "isNewUser": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "phoneNumber": "+1234567890",
    "isVerified": true
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "otp": "123456"}'
```

---

### 3. Refresh Token
**POST** `/api/auth/refresh-token`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🎥 Video APIs

### 4. Get All Videos (with pagination & filters)
**GET** `/api/videos`

**Query Parameters:**
- `category` (optional): Filter by category
- `search` (optional): Search in title/description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "videos": [
    {
      "_id": "6909a3d157d37bbe9560bcb3",
      "title": "New song",
      "description": "This is a demo video upload",
      "thumbnail": "https://api.mightyshare.io/...",
      "duration": 120,
      "videoFiles": [
        {
          "quality": "720p",
          "bitrate": 2500000,
          "resolution": "1280x720",
          "_id": "6909a3d157d37bbe9560bcb4"
        }
      ],
      "category": "melody song",
      "views": 13,
      "isActive": true,
      "uploadDate": "2025-11-04T06:57:21.189Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "pages": 1
  }
}
```

**cURL Examples:**
```bash
# Get all videos
curl -X GET http://localhost:5000/api/videos

# Get videos with filters
curl -X GET "http://localhost:5000/api/videos?category=melody%20song&page=1&limit=10"

# Search videos
curl -X GET "http://localhost:5000/api/videos?search=demo&page=1"
```

---

### 5. Get Video by ID
**GET** `/api/videos/:id`

**Response:**
```json
{
  "video": {
    "_id": "6909a3d157d37bbe9560bcb3",
    "title": "New song",
    "description": "This is a demo video upload",
    "thumbnail": "https://api.mightyshare.io/...",
    "duration": 120,
    "videoFiles": [
      {
        "quality": "720p",
        "bitrate": 2500000,
        "resolution": "1280x720",
        "_id": "6909a3d157d37bbe9560bcb4"
      }
    ],
    "category": "melody song",
    "views": 14,
    "isActive": true,
    "uploadDate": "2025-11-04T06:57:21.189Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/videos/6909a3d157d37bbe9560bcb3
```

---

### 6. Get Video Stream Info (Authenticated)
**GET** `/api/videos/:id/stream-info`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "streamInfo": {
    "videoId": "6909a3d157d37bbe9560bcb3",
    "qualities": [
      {
        "quality": "720p",
        "bitrate": 2500000,
        "resolution": "1280x720",
        "streamUrl": "/api/stream/fileId123"
      }
    ]
  }
}
```

---

## 👤 User Management APIs

### 7. Get User Sessions (Authenticated)
**GET** `/api/user/sessions`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "sess_123456789",
      "deviceInfo": "Chrome Browser",
      "ipAddress": "192.168.1.100",
      "lastActive": "2025-11-06T12:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

---

### 8. Logout Current Session (Authenticated)
**POST** `/api/user/logout`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 9. Logout Specific Session (Authenticated)
**POST** `/api/user/logout/:sessionId`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Session logged out successfully"
}
```

---

### 10. Logout All Sessions (Authenticated)
**POST** `/api/user/logout-all`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "All sessions logged out successfully"
}
```

---

### 11. Get User Profile (Authenticated)
**GET** `/api/user/profile`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "phoneNumber": "+1234567890",
    "isVerified": true,
    "sessions": [...]
  }
}
```

---

## 🎬 Streaming APIs

### 12. Get Video Stream (with Authentication)
**GET** `/api/stream/:fileId`

**Authentication Options:**
- **Header:** `Authorization: Bearer <token>`
- **Query Parameter:** `?token=<token>`

**Headers (for range requests):**
```
Range: bytes=0-1023
```

**Response:** Binary video stream with proper headers for video playback

**cURL Example:**
```bash
# Stream with token in query
curl -X GET "http://localhost:5000/api/stream/fileId123?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Stream with header auth
curl -X GET http://localhost:5000/api/stream/fileId123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 13. Get Streaming Manifest
**GET** `/api/stream/:videoId/manifest`

**Note:** Currently configured without authentication for testing

**Response:**
```json
{
  "videoId": "6909a3d157d37bbe9560bcb3",
  "title": "New song",
  "duration": 120,
  "qualities": [
    {
      "quality": "720p",
      "resolution": "1280x720",
      "bitrate": 2500000,
      "streamUrl": "/api/stream/fileId123"
    }
  ],
  "defaultQuality": "720p"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/stream/6909a3d157d37bbe9560bcb3/manifest
```

---

## 🔧 Admin APIs

### 14. Upload Video (Authenticated Admin)
**POST** `/api/admin/upload-video`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data
```

**Form Data:**
```
video: [File] - Video file to upload
title: "My Video Title"
description: "Video description"
category: "entertainment"
duration: "120"
thumbnail: "https://example.com/thumb.jpg" (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/admin/upload-video \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "video=@/path/to/video.mp4" \
  -F "title=My Video Title" \
  -F "description=This is a test video" \
  -F "category=entertainment" \
  -F "duration=120"
```

---

## ❤️ Health Check

### 15. Health Check
**GET** `/api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-06T12:34:56.789Z"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/health
```

---

## 🔑 Authentication Flow

### Complete Authentication Example:

```bash
# 1. Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# 2. Verify OTP (get tokens)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "otp": "123456"}'

# 3. Use access token for authenticated requests
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 📝 Notes

- **CORS:** Currently set to `origin: '*'` (allow all origins)
- **Rate Limiting:** Applied to OTP endpoints
- **File Upload:** Max 50MB limit for video uploads
- **Authentication:** JWT-based with access & refresh tokens
- **Video Storage:** Uses MongoDB GridFS for video file storage
- **Quality Support:** Currently supports 720p, with infrastructure for multiple qualities

---

## 🚀 Quick Test Commands

```bash
# Test server health
curl http://localhost:5000/api/health

# Get all videos
curl http://localhost:5000/api/videos

# Get specific video
curl http://localhost:5000/api/videos/6909a3d157d37bbe9560bcb3

# Get manifest for streaming
curl http://localhost:5000/api/stream/6909a3d157d37bbe9560bcb3/manifest
```
