# Setup Guide - Striming App

## Prerequisites

- Node.js 18+ installed
- MongoDB 6+ installed and running
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies

From the root directory, run:

```bash
npm run install:all
```

This will install dependencies for both frontend and backend.

### 2. Setup Environment Variables

#### Backend (.env)

Create a `.env` file in the `backend` directory:

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/striming-app

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=30d

# OTP
OTP_SECRET=your-otp-secret-key
OTP_EXPIRY_MINUTES=5

# Twilio (Optional - for SMS OTP)
# Leave empty for development mode (OTP will be logged to console)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=524288000
UPLOAD_PATH=./uploads
```

#### Frontend (.env.local)

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Start MongoDB

Make sure MongoDB is running:

```bash
# On Windows
mongod

# On macOS/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 4. Run the Application

#### Development Mode (both servers)

From the root directory:

```bash
npm run dev
```

This will start:
- Backend API: http://localhost:5000
- Frontend App: http://localhost:3000

#### Or run separately:

Backend only:
```bash
npm run dev:backend
```

Frontend only:
```bash
npm run dev:frontend
```

### 5. Testing the Application

1. Open http://localhost:3000 in your browser
2. You'll be redirected to the login page
3. Enter your phone number (format: +1234567890)
4. In development mode, check the backend console for the OTP code
5. Enter the OTP to login

## Features

### Authentication
- Phone-based authentication with OTP
- Multiple device sessions support
- JWT-based authentication
- Session management

### Video Streaming
- Adaptive bitrate streaming (240p, 480p, 720p, 1080p)
- Automatic quality adjustment based on network speed
- Video player controls:
  - Play/Pause
  - Forward/Backward (10s)
  - Volume control
  - Brightness control
  - Quality selection
  - Fullscreen mode

### Architecture
- **Frontend**: Next.js 15 with App Router, Ant Design, Zustand
- **Backend**: Node.js, Express, MongoDB with GridFS
- **Code Splitting**: Dynamic imports for optimal performance

## Video Upload

To upload videos, use the admin endpoint (requires authentication):

```bash
curl -X POST http://localhost:5000/api/admin/upload-video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@/path/to/video.mp4" \
  -F "title=My Video" \
  -F "description=Video description" \
  -F "category=general" \
  -F "duration=120"
```

## Development Notes

### OTP in Development

In development mode without Twilio configured, OTP codes will be logged to the backend console. Check the terminal running the backend server to see the OTP.

### Video Storage

Videos are stored in MongoDB GridFS. For production, consider:
- Using cloud storage (AWS S3, Google Cloud Storage)
- CDN for video delivery
- Video transcoding service for multiple quality versions

### Network Detection

The app automatically detects network speed using:
- Navigator Connection API (if available)
- Fallback to API response time

### Code Splitting

The frontend uses:
- Dynamic imports for video player
- Next.js automatic code splitting
- Ant Design tree-shaking

## Troubleshooting

### MongoDB Connection Error

- Ensure MongoDB is running
- Check MONGODB_URI in backend/.env
- Verify MongoDB is accessible on the specified port

### OTP Not Received

- In development, check backend console
- Verify phone number format (+1234567890)
- Check Twilio credentials if using SMS

### Video Not Playing

- Ensure video is uploaded correctly
- Check authentication token
- Verify GridFS bucket is initialized
- Check browser console for errors

## Production Deployment

1. Update all environment variables with production values
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up MongoDB replica set for production
5. Use CDN for video delivery
6. Implement rate limiting
7. Enable HTTPS
8. Set up proper logging and monitoring

