'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Slider, message, Select } from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  ForwardOutlined,
  BackwardOutlined,
  SoundOutlined,
  BgColorsOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { videoAPI } from '@/lib/api';
import Cookies from 'js-cookie';

interface VideoPlayerProps {
  videoId: string;
  videoTitle: string;
}

interface Quality {
  quality: string;
  bitrate: number;
  resolution: string;
  url: string;
}

interface Manifest {
  videoId: string;
  title: string;
  duration: number;
  qualities: Quality[];
}

export default function VideoPlayer({ videoId, videoTitle }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>('720p');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<'fast' | 'slow'>('fast');
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Load manifest
  useEffect(() => {
    loadManifest();
    detectNetworkSpeed();
  }, [videoId]);

  const loadManifest = async () => {
    try {
      const response = await videoAPI.getStreamManifest(videoId);
      setManifest(response.data);
      
      // Set initial quality based on network
      if (response.data.qualities.length > 0) {
        const initialQuality = networkQuality === 'slow' ? '240p' : '720p';
        const available = response.data.qualities.find(q => q.quality === initialQuality);
        setCurrentQuality(available ? initialQuality : response.data.qualities[0].quality);
      }
    } catch (error: any) {
      message.error('Failed to load video');
    }
  };

  const detectNetworkSpeed = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateNetworkQuality = () => {
          const effectiveType = connection.effectiveType;
          setNetworkQuality(effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' ? 'slow' : 'fast');
        };
        
        updateNetworkQuality();
        connection.addEventListener('change', updateNetworkQuality);
        
        return () => connection.removeEventListener('change', updateNetworkQuality);
      }
    }
    
    // Fallback: detect based on download speed
    const startTime = Date.now();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`)
      .then(() => {
        const duration = Date.now() - startTime;
        setNetworkQuality(duration > 1000 ? 'slow' : 'fast');
      });
  };

  // Adaptive quality switching
  useEffect(() => {
    if (!videoRef.current || !manifest) return;

    const video = videoRef.current;
    const handleWaiting = () => {
      // If buffering and network is slow, switch to lower quality
      if (networkQuality === 'slow' && currentQuality !== '240p') {
        switchQuality('240p');
        message.info('Switched to lower quality due to slow network');
      }
    };

    const handleCanPlay = () => {
      // If playing smoothly and network is fast, try higher quality
      if (networkQuality === 'fast' && currentQuality === '240p') {
        switchQuality('720p');
      }
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [networkQuality, currentQuality, manifest]);

  const switchQuality = (quality: string) => {
    if (!manifest) return;
    
    const qualityObj = manifest.qualities.find(q => q.quality === quality);
    if (!qualityObj || !videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;
    
    setCurrentQuality(quality);
    
    const token = Cookies.get('accessToken');
    const videoUrl = `${process.env.NEXT_PUBLIC_API_URL}${qualityObj.url}`;
    
    videoRef.current.src = videoUrl;
    videoRef.current.setAttribute('crossorigin', 'anonymous');
    
    // Add auth header via fetch
    fetch(videoUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(() => {
      if (videoRef.current) {
        videoRef.current.load();
        
        videoRef.current.addEventListener('loadedmetadata', () => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentTime;
            if (wasPlaying) {
              videoRef.current.play();
            }
          }
        }, { once: true });
      }
    });
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Update video source when quality changes
  useEffect(() => {
    if (!manifest || !videoRef.current) return;
    
    const qualityObj = manifest.qualities.find(q => q.quality === currentQuality);
    if (qualityObj) {
      const token = Cookies.get('accessToken');
      const videoUrl = `${process.env.NEXT_PUBLIC_API_URL}${qualityObj.url}`;
      
      videoRef.current.src = videoUrl;
      videoRef.current.setAttribute('crossorigin', 'anonymous');
      videoRef.current.load();
    }
  }, [currentQuality, manifest]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const seekForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
  };

  const seekBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
  };

  const handleTimeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
  };

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    if (videoRef.current) {
      videoRef.current.style.filter = `brightness(${value})`;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!manifest) {
    return <div style={{ textAlign: 'center', padding: '50px', color: '#fff' }}>Loading video...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="video-player-container"
      onMouseMove={handleMouseMove}
      style={{ position: 'relative', width: '100%', background: '#000' }}
    >
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          style={{
            filter: `brightness(${brightness})`,
            width: '100%',
            height: '100%'
          }}
          onClick={togglePlay}
          controls={false}
        />
      </div>

      {showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            padding: '20px',
            transition: 'opacity 0.3s'
          }}
        >
          {/* Progress bar */}
          <Slider
            value={currentTime}
            max={duration}
            step={0.1}
            onChange={handleTimeChange}
            tooltip={{ formatter: (value) => formatTime(value || 0) }}
            styles={{ track: { background: '#1890ff' } }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
            {/* Play/Pause */}
            <Button
              type="text"
              icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
              onClick={togglePlay}
              style={{ color: '#fff', fontSize: '24px' }}
            />

            {/* Seek backward */}
            <Button
              type="text"
              icon={<BackwardOutlined />}
              onClick={seekBackward}
              style={{ color: '#fff' }}
            >
              10s
            </Button>

            {/* Seek forward */}
            <Button
              type="text"
              icon={<ForwardOutlined />}
              onClick={seekForward}
              style={{ color: '#fff' }}
            >
              10s
            </Button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
              <SoundOutlined style={{ color: '#fff' }} />
              <Slider
                value={volume}
                min={0}
                max={1}
                step={0.1}
                onChange={handleVolumeChange}
                styles={{ track: { background: '#1890ff' } }}
                style={{ flex: 1 }}
              />
              <span style={{ color: '#fff', minWidth: '35px', fontSize: '12px' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Brightness */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
              <BgColorsOutlined style={{ color: '#fff' }} />
              <Slider
                value={brightness}
                min={0.3}
                max={1.5}
                step={0.1}
                onChange={handleBrightnessChange}
                styles={{ track: { background: '#1890ff' } }}
                style={{ flex: 1 }}
              />
            </div>

            {/* Quality selector */}
            <Select
              value={currentQuality}
              onChange={switchQuality}
              style={{ minWidth: '100px' }}
              options={manifest.qualities.map(q => ({
                label: q.quality,
                value: q.quality
              }))}
            />

            {/* Time display */}
            <span style={{ color: '#fff', marginLeft: 'auto' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Fullscreen */}
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              style={{ color: '#fff' }}
            />
          </div>
        </div>
      )}

      {!showControls && isPlaying && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}
        >
          <PlayCircleOutlined style={{ fontSize: '64px', color: 'rgba(255,255,255,0.3)' }} />
        </div>
      )}
    </div>
  );
}
