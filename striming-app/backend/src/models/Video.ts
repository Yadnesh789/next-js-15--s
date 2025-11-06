import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
  title: string;
  description: string;
  thumbnail: string;
  duration: number; // in seconds
  videoFiles: {
    quality: string; // '240p', '480p', '720p', '1080p'
    fileId: string; // GridFS file ID
    bitrate: number;
    resolution: string;
  }[];
  category: string;
  views: number;
  uploadDate: Date;
  isActive: boolean;
}

const VideoSchema = new Schema<IVideo>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    thumbnail: {
      type: String,
      default: ''
    },
    duration: {
      type: Number,
      required: true
    },
    videoFiles: [{
      quality: {
        type: String,
        enum: ['240p', '480p', '720p', '1080p'],
        required: true
      },
      fileId: {
        type: String,
        required: true
      },
      bitrate: {
        type: Number,
        required: true
      },
      resolution: {
        type: String,
        required: true
      }
    }],
    category: {
      type: String,
      default: 'general'
    },
    views: {
      type: Number,
      default: 0
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

VideoSchema.index({ title: 'text', description: 'text' });
VideoSchema.index({ category: 1 });
VideoSchema.index({ uploadDate: -1 });

export const Video = mongoose.model<IVideo>('Video', VideoSchema);

