import express, { Response } from 'express';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Video } from '../models/Video';

const router = express.Router();

// Get GridFS bucket
const getGridFSBucket = (): GridFSBucket => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }
  return new GridFSBucket(db, { bucketName: 'videos' });
};

// Stream video chunk
router.get('/:fileId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const range = req.headers.range;
    
    if (!range) {
      res.status(400).json({ error: 'Range header required' });
      return;
    }
    
    // Verify file exists and user has access
    const video = await Video.findOne({
      'videoFiles.fileId': fileId
    });
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    const bucket = getGridFSBucket();
    
    // Find file in GridFS
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    if (files.length === 0) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }
    
    const file = files[0];
    const fileSize = file.length;
    
    // Parse range
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    
    // Set headers for streaming
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunkSize);
    res.setHeader('Content-Type', file.contentType || 'video/mp4');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Create read stream
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId), {
      start,
      end: end + 1
    });
    
    downloadStream.pipe(res);
    
    downloadStream.on('error', (err: Error) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });
  } catch (error: any) {
    console.error('Stream route error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get adaptive streaming manifest (HLS-style)
router.get('/:videoId/manifest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    
    if (!video || !video.isActive) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    // Return manifest with all available qualities
    const manifest = {
      videoId: video._id.toString(),
      title: video.title,
      duration: video.duration,
      qualities: video.videoFiles.map((file) => ({
        quality: file.quality,
        bitrate: file.bitrate,
        resolution: file.resolution,
        url: `/api/stream/${file.fileId}`
      })).sort((a, b) => {
        const order: Record<string, number> = { '240p': 1, '480p': 2, '720p': 3, '1080p': 4 };
        return (order[a.quality] || 0) - (order[b.quality] || 0);
      })
    };
    
    res.json(manifest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

