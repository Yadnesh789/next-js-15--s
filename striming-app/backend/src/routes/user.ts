import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';

const router = express.Router();

// Get current user sessions
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      sessions: user.sessions.map(session => ({
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        lastActive: session.lastActive
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Logout from current session
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Remove current session
    user.sessions = user.sessions.filter(
      (s) => s.sessionId !== req.user!.sessionId
    );
    await user.save();

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Logout from specific session
router.post('/logout/:sessionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user!.userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Remove specified session
    const initialLength = user.sessions.length;
    user.sessions = user.sessions.filter((s) => s.sessionId !== sessionId);
    
    if (user.sessions.length === initialLength) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await user.save();

    res.json({ success: true, message: 'Session logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Logout from all sessions
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Clear all sessions
    user.sessions = [];
    await user.save();

    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        activeSessions: user.sessions.length,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

