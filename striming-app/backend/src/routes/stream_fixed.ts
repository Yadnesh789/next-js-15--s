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

// Debug endpoint to check video file details
router.get('/debug/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    
    // Check for authentication
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    // Verify token
    try {
      const { JWTService } = await import('../services/jwtService');
      const decoded = JWTService.verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const bucket = getGridFSBucket();
    
    // Get file info from GridFS
    const fileArray = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (fileArray.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    const fileInfo = fileArray[0];
    
    // Get first few bytes to check file signature
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const maxBytes = 64; // Get first 64 bytes for signature analysis
    
    downloadStream.on('data', (chunk: Buffer) => {
      if (totalBytes < maxBytes) {
        const remainingBytes = maxBytes - totalBytes;
        const chunkToAdd = chunk.slice(0, remainingBytes);
        chunks.push(chunkToAdd);
        totalBytes += chunkToAdd.length;
        
        if (totalBytes >= maxBytes) {
          downloadStream.destroy();
        }
      }
    });
    
    downloadStream.on('end', () => {
      const headerBytes = Buffer.concat(chunks);
      const signature = headerBytes.slice(4, 8).toString('ascii');
      
      res.json({
        fileInfo: {
          id: fileInfo._id,
          filename: fileInfo.filename,
          contentType: fileInfo.contentType || 'unknown',
          length: fileInfo.length,
          uploadDate: fileInfo.uploadDate,
          metadata: fileInfo.metadata
        },
        fileSignature: {
          firstBytes: Array.from(headerBytes.slice(0, 16)).map(b => `0x${b.toString(16).padStart(2, '0')}`),
          ftypSignature: signature,
          isMP4: signature === 'ftyp',
          detectedFormat: signature === 'ftyp' ? 'MP4' : 'Unknown'
        },
        webCompatibility: {
          hasCorrectContentType: fileInfo.contentType === 'video/mp4',
          isExpectedSize: fileInfo.length > 1000, // Basic size check
          recommendation: signature === 'ftyp' ? 
            'File appears to be MP4 format' : 
            'File may need transcoding to web-compatible format'
        }
      });
    });
    
    downloadStream.on('error', (error) => {
      res.status(500).json({ error: 'Error reading file' });
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stream video chunk with enhanced web compatibility
router.get('/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params;
    const range = req.headers.range;
    
    // Check for authentication - either via header or query parameter
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    // Verify token
    try {
      const { JWTService } = await import('../services/jwtService');
      const decoded = JWTService.verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
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
    const fileArray = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    if (fileArray.length === 0) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }
    
    const fileInfo = fileArray[0];
    const fileSize = fileInfo.length;
    
    // Set proper headers for video streaming with web compatibility
    res.set({
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range, Authorization',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    
    if (!range) {
      // No range request - serve entire file (useful for some players)
      res.set({
        'Content-Type': 'video/mp4', // Force MP4 for better compatibility
        'Content-Length': fileSize.toString(),
        'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`
      });
      
      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream error' });
        }
      });
      
      return;
    }
    
    // Parse range for partial content
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    
    // Set headers for partial content
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);
    res.setHeader('Content-Type', 'video/mp4'); // Force MP4 for better compatibility
    
    // Create read stream with range
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId), {
      start,
      end: end + 1
    });
    
    downloadStream.pipe(res);
    
    downloadStream.on('error', (err: Error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
