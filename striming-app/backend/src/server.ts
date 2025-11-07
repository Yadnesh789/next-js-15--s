import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import videoRoutes from './routes/video';
import userRoutes from './routes/user';
import streamRoutes from './routes/stream';
import adminRoutes from './routes/admin';
import debugRoutes from './routes/debug';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/user', userRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    // Server running on port
  });
}).catch((error) => {
  process.exit(1);
});

export default app;

