import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Video } from '../models/Video';
import fs from 'fs';
import path from 'path';

let gridfsBucket: GridFSBucket;

export const initializeGridFS = (db: mongoose.mongo.Db) => {
  gridfsBucket = new GridFSBucket(db, { bucketName: 'videos' });
};

export interface VideoUploadOptions {
  filePath: string;
  title: string;
  description?: string;
  category?: string;
  duration: number;
  thumbnail?: string;
}

export const uploadVideoToGridFS = async (
  filePath: string,
  contentType: string = 'video/mp4'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!gridfsBucket) {
      reject(new Error('GridFS not initialized'));
      return;
    }

    const readableStream = fs.createReadStream(filePath);
    const uploadStream = gridfsBucket.openUploadStream(path.basename(filePath), {
      contentType
    });

    readableStream
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        resolve(uploadStream.id.toString());
      });
  });
};

export const createVideoWithQualities = async (
  options: VideoUploadOptions,
  qualityFiles: Array<{
    quality: '240p' | '480p' | '720p' | '1080p';
    filePath: string;
    bitrate: number;
    resolution: string;
  }>
): Promise<void> => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }

  initializeGridFS(db);

  const videoFiles = [];

  // Upload each quality version
  for (const qualityFile of qualityFiles) {
    const fileId = await uploadVideoToGridFS(qualityFile.filePath);
    videoFiles.push({
      quality: qualityFile.quality,
      fileId,
      bitrate: qualityFile.bitrate,
      resolution: qualityFile.resolution
    });
  }

  // Create video document
  const video = new Video({
    title: options.title,
    description: options.description || '',
    thumbnail: options.thumbnail || '',
    duration: options.duration,
    category: options.category || 'general',
    videoFiles
  });

  await video.save();
};

// Helper to get bitrate and resolution for common qualities
export const getQualitySpecs = (quality: string) => {
  const specs: Record<string, { bitrate: number; resolution: string }> = {
    '240p': { bitrate: 400000, resolution: '426x240' },
    '480p': { bitrate: 1000000, resolution: '854x480' },
    '720p': { bitrate: 2500000, resolution: '1280x720' },
    '1080p': { bitrate: 5000000, resolution: '1920x1080' }
  };
  return specs[quality] || specs['720p'];
};

