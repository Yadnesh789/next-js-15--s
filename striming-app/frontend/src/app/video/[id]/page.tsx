'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spin, Typography, Button, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { videoAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import dynamic from 'next/dynamic';

// Use proper dynamic import with error handling
const VideoPlayerClient = dynamic(
  () => import('@/components/VideoPlayer'),
  { 
    ssr: false,
    loading: () => <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>Loading video player...</div>
  }
);

const { Title, Paragraph } = Typography;

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (videoId) {
      loadVideo();
    }
  }, [videoId, isAuthenticated, router]);

  const loadVideo = async () => {
    try {
      setLoading(true);
      const response = await videoAPI.getVideo(videoId);
      setVideo(response.data.video);
    } catch (error: any) {
      message.error('Failed to load video');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Navbar />
      <div style={{ padding: '20px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/')}
          style={{ marginBottom: '20px' }}
        >
          Back
        </Button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
        <VideoPlayerClient videoId={videoId} videoTitle={video.title} />

        <div style={{ marginTop: '30px', color: '#fff' }}>
          <Title level={2} style={{ color: '#fff', marginBottom: '10px' }}>
            {video.title}
          </Title>
          <Paragraph style={{ color: '#999', fontSize: '16px', marginBottom: '20px' }}>
            {video.description || 'No description available'}
          </Paragraph>
          <div style={{ color: '#666', fontSize: '14px' }}>
            {video.views} views • {video.category} • {new Date(video.uploadDate).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

