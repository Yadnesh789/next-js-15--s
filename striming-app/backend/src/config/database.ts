import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export const connectDB = async (): Promise<void> => {
  try {
    console.log('🔗 Connecting to MongoDB...',process.env.MONGODB_URI);
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB connected successfully');
    
    // Initialize GridFS for video storage
    const db = mongoose.connection.db;
    if (db) {
      const gridfsBucket = new GridFSBucket(db, { bucketName: 'videos' });
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};

