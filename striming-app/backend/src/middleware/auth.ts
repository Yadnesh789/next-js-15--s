import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTService } from '../services/jwtService';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = JWTService.verifyAccessToken(token);

    // Verify user exists and session is valid
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if session exists
    const session = user.sessions.find(s => s.sessionId === decoded.sessionId);
    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    // Update last active
    session.lastActive = new Date();
    await user.save();

    req.user = decoded;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
};

