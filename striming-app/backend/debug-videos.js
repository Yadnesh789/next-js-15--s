const mongoose = require('mongoose');

// Video model definition inline
const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  thumbnail: { type: String, default: '' },
  duration: { type: Number, required: true },
  videoFiles: [{
    quality: { type: String, enum: ['240p', '480p', '720p', '1080p'], required: true },
    fileId: { type: String, required: true },
    bitrate: { type: Number, required: true },
    resolution: { type: String, required: true }
  }],
  category: { type: String, default: 'general' },
  views: { type: Number, default: 0 },
  uploadDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Video = mongoose.model('Video', VideoSchema);

async function addTestVideo() {
  try {
    await mongoose.connect('mongodb://localhost:27017/striming-app');
    console.log('Connected to MongoDB');

    // Check if there are any videos
    const videoCount = await Video.countDocuments();
    console.log(`Current videos in database: ${videoCount}`);

    // Add a test video if none exist
    if (videoCount === 0) {
      const testVideo = new Video({
        title: 'Sample Test Video',
        description: 'This is a test video for debugging the streaming app',
        thumbnail: 'https://via.placeholder.com/640x360.png?text=Test+Video',
        duration: 120,
        videoFiles: [{
          quality: '720p',
          fileId: new mongoose.Types.ObjectId().toString(),
          bitrate: 2500000,
          resolution: '1280x720'
        }],
        category: 'test',
        views: 0,
        isActive: true
      });

      await testVideo.save();
      console.log('✅ Test video added');
    }

    // List all videos
    const videos = await Video.find({});
    console.log('Videos in database:');
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title} - Duration: ${video.duration}s - Active: ${video.isActive} - Category: ${video.category}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

addTestVideo();
