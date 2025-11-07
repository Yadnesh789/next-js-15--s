# Striming App - JioCinema Clone

A modern video streaming application built with Next.js 15, Node.js, MongoDB, and Ant Design.

## Features

- 🔐 Phone-based authentication with OTP verification
- 👥 Multiple login/logout sessions
- 🎬 Full-featured video player with controls
- 🎨 Modern UI with Ant Design
- 📦 Code splitting and scalable architecture

## Tech Stack

- **Frontend**: Next.js 15, React 19, Ant Design
- **Backend**: Node.js, Express, MongoDB
- **Authentication**: JWT tokens
- **Video Streaming**: Adaptive bitrate with HLS/DASH

## Project Structure

```
next js 15/
├── striming-app/
│   ├── frontend/          # Next.js 15 application
│   ├── backend/           # Node.js/Express API
│   ├── package.json       # Root workspace configuration
│   └── API_DOCUMENTATION.md
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB 6+
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd "next js 15/striming-app"
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Setup environment variables:

Create `.env` files in both frontend and backend directories (see `.env.example` files)

4. Start development servers:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/striming-app
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
OTP_SECRET=your-otp-secret-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
```

## Development

### Running Individual Services

Backend only:
```bash
cd striming-app/backend
npm run dev
```

Frontend only:
```bash
cd striming-app/frontend
npm run dev
```

## API Documentation

API endpoints are available at `/api` routes. See `striming-app/API_DOCUMENTATION.md` for details.

## License

MIT
