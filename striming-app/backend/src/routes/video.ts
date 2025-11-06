import express, { Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Video } from '../models/Video';

const router = express.Router();

// Get all videos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    
    const query: any = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$text = { $search: search as string };
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const videos = await Video.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : { uploadDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-videoFiles.fileId'); // Don't expose internal file IDs
    
    const total = await Video.countDocuments(query);
    
    res.json({
      videos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get video by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.id).select('-videoFiles.fileId');
    
    if (!video || !video.isActive) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    // Increment view count
    video.views += 1;
    await video.save();
    
    res.json({ video });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get video streaming info (available qualities)
router.get('/:id/stream-info', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video || !video.isActive) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    // Return available qualities with file IDs
    const streamInfo = {
      videoId: video._id,
      title: video.title,
      duration: video.duration,
      qualities: video.videoFiles.map(file => ({
        quality: file.quality,
        bitrate: file.bitrate,
        resolution: file.resolution,
        fileId: file.fileId
      })).sort((a, b) => {
        const order = { '240p': 1, '480p': 2, '720p': 3, '1080p': 4 };
        return (order[a.quality as keyof typeof order] || 0) - (order[b.quality as keyof typeof order] || 0);
      })
    };
    
    res.json(streamInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

