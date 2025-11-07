import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createVideoWithQualities, getQualitySpecs } from '../utils/videoUpload';
import mongoose from 'mongoose';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000') // 500MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|webm|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Admin route to upload video (single quality - for demo)
// In production, you'd upload multiple quality versions
router.post(
  '/upload-video',
  authenticate,
  upload.single('video'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No video file uploaded' });
        return;
      }

      const { title, description, category, duration } = req.body;

      if (!title || !duration) {
        res.status(400).json({ error: 'Title and duration are required' });
        return;
      }

      // For demo: create a single quality version
      // In production, you'd transcode to multiple qualities
      const qualityFiles = [
        {
          quality: '720p' as const,
          filePath: req.file.path,
          bitrate: getQualitySpecs('720p').bitrate,
          resolution: getQualitySpecs('720p').resolution
        }
      ];

      await createVideoWithQualities(
        {
          filePath: req.file.path,
          title,
          description,
          category: category || 'general',
          duration: parseInt(duration),
          thumbnail: req.body.thumbnail || ''
        },
        qualityFiles
      );

      // Clean up uploaded file after processing to GridFS
      try {
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        // Failed to cleanup temporary file
      }

      res.json({ success: true, message: 'Video uploaded successfully' });
    } catch (error: any) {
      
      // Clean up file even on error
      try {
        const fs = require('fs');
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        // Failed to cleanup temporary file after error
      }
      
      res.status(500).json({ 
        error: error.message,
        stack: error.stack
      });
    }
  }
);

export default router;

