'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Spin, Input, message, Button } from 'antd';
import { PlayCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { videoAPI, searchAPI } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const router = useRouter();

  useEffect(() => {
    setDebugInfo('Component mounted - Loading videos...');
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setDebugInfo('Loading videos...');
      
      // Direct API test
      try {
        setDebugInfo('Testing direct fetch...');
        const directResponse = await fetch('http://localhost:5000/api/videos');
        const directData = await directResponse.json();
        setDebugInfo(`Direct fetch successful: ${directData.videos.length} videos found`);
      } catch (directError: any) {
        setDebugInfo(`Direct fetch failed: ${directError.message}`);
      }
      
      setDebugInfo('Testing videoAPI...');
      const response = await videoAPI.getVideos();
      setVideos(response.data.videos);
      setDebugInfo(`VideoAPI successful: ${response.data.videos.length} videos loaded`);
    } catch (error: any) {
      setDebugInfo(`Error: ${error.message}`);
      message.error(error.response?.data?.error || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadVideos();
      return;
    }
    
    try {
      setLoading(true);
      // Use the new search API
      const response = await searchAPI.search({ query: searchQuery });
      if (response.data.success) {
        setVideos(response.data.videos);
      } else {
        const fallbackResponse = await videoAPI.getVideos({ search: searchQuery });
        setVideos(fallbackResponse.data.videos);
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  const goToAdvancedSearch = () => {
    router.push(`/search${searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : ''}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && videos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', background: '#ffffff' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '20px', color: '#333333' }}>Loading videos...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      minHeight: '100vh', 
      background: '#ffffff'
    }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          color: '#333333', 
          marginBottom: '20px', 
          fontSize: '32px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #FFD700, #FFC107)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '2px 2px 4px rgba(255, 215, 0, 0.3)'
        }}>
          🎬 Striming App
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Input
            className="input"
            size="large"
            placeholder="Search videos..."
            prefix={<SearchOutlined style={{ color: '#FFD700' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={handleSearch}
            style={{ maxWidth: '400px' }}
          />
          <Button 
            type="primary" 
            size="large"
            onClick={handleSearch}
            style={{ background: 'linear-gradient(135deg, #FFD700, #FFC107)', border: 'none' }}
          >
            Search
          </Button>
          <Button 
            size="large"
            onClick={goToAdvancedSearch}
            icon={<SearchOutlined />}
          >
            Advanced
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {videos.map((video) => (
          <Col xs={24} sm={12} md={8} lg={6} key={video._id}>
            <Link href={`/video/${video._id}`} style={{ textDecoration: 'none' }}>
              <Card
                className="card"
                hoverable
                cover={
                  <div style={{ position: 'relative', background: '#f5f5f5' }}>
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
                          background: 'linear-gradient(135deg, #FFF9C4, #FFD700)'
                        }}
                      >
                        <PlayCircleOutlined style={{ fontSize: '48px', color: '#333333' }} />
                      </div>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: '#FFD700',
                        color: '#333333',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid #FFC107'
                      }}
                    >
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                }
                style={{ 
                  background: '#ffffff',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Card.Meta
                  title={
                    <div style={{ color: '#333333', marginBottom: '8px', fontWeight: '600' }}>
                      {video.title}
                    </div>
                  }
                  description={
                    <div style={{ color: '#666666', fontSize: '12px' }}>
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
        <div style={{ 
          textAlign: 'center', 
          padding: '50px', 
          color: '#666666',
          background: '#FFF9C4',
          borderRadius: '12px',
          border: '2px dashed #FFD700',
          margin: '20px 0'
        }}>
          <PlayCircleOutlined style={{ fontSize: '48px', color: '#FFD700', marginBottom: '16px' }} />
          <h3 style={{ color: '#333333', marginBottom: '8px' }}>No videos found</h3>
          <p>Try adjusting your search terms or check back later for new content.</p>
        </div>
      )}
    </div>
  );
}

