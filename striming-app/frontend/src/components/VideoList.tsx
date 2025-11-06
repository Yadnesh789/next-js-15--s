'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Spin, Input, message } from 'antd';
import { PlayCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { videoAPI } from '@/lib/api';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false });

interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  views: number;
  category: string;
}

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await videoAPI.getVideos();
      setVideos(response.data.videos);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await videoAPI.getVideos({ search: searchQuery });
      setVideos(response.data.videos);
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && videos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#fff', marginBottom: '20px', fontSize: '32px' }}>
          Striming App
        </h1>
        <Input
          size="large"
          placeholder="Search videos..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onPressEnter={handleSearch}
          style={{ maxWidth: '500px' }}
        />
      </div>

      <Row gutter={[16, 16]}>
        {videos.map((video) => (
          <Col xs={24} sm={12} md={8} lg={6} key={video._id}>
            <Link href={`/video/${video._id}`} style={{ textDecoration: 'none' }}>
              <Card
                hoverable
                cover={
                  <div style={{ position: 'relative', background: '#000' }}>
                    {video.thumbnail ? (
                      <img
                        alt={video.title}
                        src={video.thumbnail}
                        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '200px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#1a1a1a'
                        }}
                      >
                        <PlayCircleOutlined style={{ fontSize: '48px', color: '#666' }} />
                      </div>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                }
                styles={{ body: { background: '#1a1a1a', color: '#fff' } }}
              >
                <Card.Meta
                  title={
                    <div style={{ color: '#fff', marginBottom: '8px' }}>
                      {video.title}
                    </div>
                  }
                  description={
                    <div style={{ color: '#999', fontSize: '12px' }}>
                      {video.views} views • {video.category}
                    </div>
                  }
                />
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      {videos.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
          No videos found
        </div>
      )}
    </div>
  );
}

