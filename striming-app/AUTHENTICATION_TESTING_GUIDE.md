# 🧪 Testing Authenticated APIs - Step by Step Guide

## 📋 Prerequisites
- Backend server running on `http://localhost:5000`
- Phone number for testing (e.g., `+1234567890`)

---

## 🔄 Complete Authentication Flow Testing

### Step 1: Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**💡 In Development Mode:** The OTP will also be logged in the backend console.

---

### Step 2: Verify OTP and Get Tokens
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "otp": "123456",
    "deviceInfo": "Test Client"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "isNewUser": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzJjMjg...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzJjMjg...",
  "user": {
    "id": "672c2845a1b2c3d4e5f67890",
    "phoneNumber": "+1234567890",
    "isVerified": true
  }
}
```

**🔑 IMPORTANT:** Copy the `accessToken` from this response - you'll need it for all authenticated requests!

---

## 🔐 Testing Authenticated APIs

### Save Your Token as a Variable (for easier testing):
```bash
# Replace with your actual token
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzJjMjg..."
```

---

### 1. Get User Profile
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "user": {
    "id": "672c2845a1b2c3d4e5f67890",
    "phoneNumber": "+1234567890",
    "isVerified": true,
    "sessions": [
      {
        "sessionId": "sess_abc123def456",
        "deviceInfo": "Test Client",
        "ipAddress": "::1",
        "lastActive": "2025-11-06T13:00:00.000Z"
      }
    ]
  }
}
```

---

### 2. Get User Sessions
```bash
curl -X GET http://localhost:5000/api/user/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "sessions": [
    {
      "sessionId": "sess_abc123def456",
      "deviceInfo": "Test Client",
      "ipAddress": "::1",
      "lastActive": "2025-11-06T13:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

---

### 3. Get Video Stream Info (Authenticated)
```bash
curl -X GET http://localhost:5000/api/videos/6909a3d157d37bbe9560bcb3/stream-info \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "streamInfo": {
    "videoId": "6909a3d157d37bbe9560bcb3",
    "qualities": [
      {
        "quality": "720p",
        "bitrate": 2500000,
        "resolution": "1280x720",
        "streamUrl": "/api/stream/6909a3d157d37bbe9560bcb4"
      }
    ]
  }
}
```

---

### 4. Stream Video Content
```bash
# Method 1: Using Authorization Header
curl -X GET http://localhost:5000/api/stream/6909a3d157d37bbe9560bcb4 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Range: bytes=0-1023" \
  --output video_chunk.mp4

# Method 2: Using Token as Query Parameter
curl -X GET "http://localhost:5000/api/stream/6909a3d157d37bbe9560bcb4?token=$ACCESS_TOKEN" \
  -H "Range: bytes=0-1023" \
  --output video_chunk_query.mp4
```

---

### 5. Upload Video (Admin Function)
```bash
curl -X POST http://localhost:5000/api/admin/upload-video \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "video=@/path/to/your/video.mp4" \
  -F "title=Test Video Upload" \
  -F "description=This is a test video uploaded via API" \
  -F "category=test" \
  -F "duration=120"
```

---

### 6. Logout Current Session
```bash
curl -X POST http://localhost:5000/api/user/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 7. Logout All Sessions
```bash
curl -X POST http://localhost:5000/api/user/logout-all \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 🔄 Token Refresh Example

### Refresh Access Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN_HERE"}'
```

---

## 🧪 Complete Test Script

Here's a complete bash script to test the entire flow:

```bash
#!/bin/bash

echo "🚀 Starting API Authentication Test"

# Step 1: Send OTP
echo "📱 Step 1: Sending OTP..."
OTP_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}')

echo "OTP Response: $OTP_RESPONSE"

# Step 2: Get OTP from backend logs or use default test OTP
echo "🔑 Step 2: Verifying OTP (use the OTP from backend console)..."
read -p "Enter the OTP: " OTP

AUTH_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"+1234567890\", \"otp\": \"$OTP\", \"deviceInfo\": \"Test Script\"}")

echo "Auth Response: $AUTH_RESPONSE"

# Extract access token
ACCESS_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

echo "✅ Access Token obtained: ${ACCESS_TOKEN:0:50}..."

# Step 3: Test authenticated endpoints
echo "👤 Step 3: Testing User Profile..."
curl -s -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo "📱 Step 4: Testing User Sessions..."
curl -s -X GET http://localhost:5000/api/user/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo "🎥 Step 5: Testing Video Stream Info..."
curl -s -X GET http://localhost:5000/api/videos/6909a3d157d37bbe9560bcb3/stream-info \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo "✅ All tests completed!"
```

---

## 🚨 Common Error Responses

### Invalid Token
```json
{
  "error": "Authentication failed"
}
```

### Missing Token
```json
{
  "error": "No token provided"
}
```

### Expired Token
```json
{
  "error": "Token expired"
}
```

---

## 💡 Tips for Testing

1. **Save your token**: Store the access token in an environment variable for easier testing
2. **Check backend logs**: OTP is logged in development mode
3. **Use Postman**: For a GUI alternative to curl commands
4. **Monitor headers**: Check response headers for debugging
5. **Test token expiry**: Tokens expire after 7 days by default

---

## 🔍 Debug Commands

```bash
# Check if server is running
curl http://localhost:5000/api/health

# Check backend logs for OTP
tail -f /path/to/backend/logs

# Test non-authenticated endpoints first
curl http://localhost:5000/api/videos
```
