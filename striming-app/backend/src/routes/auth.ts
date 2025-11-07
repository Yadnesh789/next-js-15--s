import express, { Request, Response } from 'express';
import { OTPService } from '../services/otpService';
import { JWTService } from '../services/jwtService';
import { User } from '../models/User';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many OTP requests, please try again later'
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts, please try again later'
});

// Validation schemas
const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
});

const verifySchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

// Send OTP
router.post('/send-otp', otpLimiter, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = phoneSchema.parse(req.body);
    
    const result = await OTPService.sendOTP(phoneNumber);
    
    if (result.success) {
      // Prepare response
      const response: any = { 
        success: true, 
        message: 'OTP sent successfully',
        messageId: result.messageId
      };

      // In development mode or when OTP is included, return it for easy testing
      if (result.otp) {
        response.devOtp = result.otp;
        response.devMessage = result.error || 'OTP available in response for development';
      }

      res.json(response);
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Verify OTP and Sign Up/Login
router.post('/verify-otp', verifyLimiter, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp, deviceInfo } = verifySchema.extend({
      deviceInfo: z.string().optional()
    }).parse(req.body);

    // Verify OTP
    const verifyResult = await OTPService.verifyOTP(phoneNumber, otp);
    if (!verifyResult.success) {
      res.status(400).json({ success: false, error: verifyResult.error });
      return;
    }

    // Find or create user
    let user = await User.findOne({ phoneNumber });
    const isNewUser = !user;

    if (!user) {
      user = new User({
        phoneNumber,
        isVerified: true
      });
    } else {
      user.isVerified = true;
    }

    // Generate session
    const sessionId = JWTService.generateSessionId();
    const deviceName = deviceInfo || req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || '';

    user.sessions.push({
      sessionId,
      deviceInfo: deviceName,
      ipAddress,
      lastActive: new Date()
    });

    await user.save();

    // Generate tokens
    const tokenPayload = {
      userId: (user._id as any).toString(),
      phoneNumber: user.phoneNumber,
      sessionId
    };

    const accessToken = JWTService.generateAccessToken(tokenPayload);
    const refreshToken = JWTService.generateRefreshToken(tokenPayload);

    // Update session with refresh token
    const session = user.sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.refreshToken = refreshToken;
      await user.save();
    }

    res.json({
      success: true,
      isNewUser,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified
      },
      tokens: {
        accessToken,
        refreshToken
      },
      session: {
        sessionId,
        deviceInfo: deviceName
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Refresh token
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = JWTService.verifyRefreshToken(refreshToken);
    
    // Verify user and session
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const session = user.sessions.find(s => 
      s.sessionId === decoded.sessionId && s.refreshToken === refreshToken
    );

    if (!session) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Generate new tokens
    const tokenPayload = {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      sessionId: decoded.sessionId
    };

    const newAccessToken = JWTService.generateAccessToken(tokenPayload);
    const newRefreshToken = JWTService.generateRefreshToken(tokenPayload);

    // Update session
    session.refreshToken = newRefreshToken;
    session.lastActive = new Date();
    await user.save();

    res.json({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

export default router;

