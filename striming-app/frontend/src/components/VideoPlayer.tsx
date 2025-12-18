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
  const [buffering, setBuffering] = useState(false);
  const [seekIndicator, setSeeking] = useState<{ show: boolean; direction: 'forward' | 'backward' | null }>({ show: false, direction: null });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  const [networkQuality, setNetworkQuality] = useState<'fast' | 'slow'>('fast');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Add CSS animation for seek indicator
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Periodic state synchronization to ensure React state matches video element state
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (videoRef.current) {
        const actuallyPlaying = !videoRef.current.paused && !videoRef.current.ended;
        if (actuallyPlaying !== isPlaying) {
          console.log('🔄 Syncing state - Video:', actuallyPlaying, 'React:', isPlaying);
          setIsPlaying(actuallyPlaying);
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(syncInterval);
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return; // Only if no input is focused
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          console.log('⌨️ Spacebar pressed - toggling play');
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          console.log('⌨️ Left arrow pressed - seeking backward');
          seekBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          console.log('⌨️ Right arrow pressed - seeking forward');
          seekForward();
          break;
        case 'KeyM':
          e.preventDefault();
          console.log('⌨️ M key pressed - mute toggle (not implemented)');
          // Toggle mute (if implemented)
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // Load manifest
  useEffect(() => {
    loadManifest();
    detectNetworkSpeed();
  }, [videoId]);

  const loadManifest = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading video manifest for:', videoId);
      
      // Check browser codec support
      checkCodecSupport();
      
      // Check if user is authenticated
      const token = Cookies.get('accessToken');
      console.log('🔑 Authentication status:', {
        hasToken: !!token,
        tokenLength: token?.length || 0
      });
      
      if (!token) {
        setError('Authentication required. Please log in to watch videos.');
        setLoading(false);
        return;
      }
      
      const response = await videoAPI.getStreamManifest(videoId);
      console.log('✅ Manifest loaded:', response.data);
      setManifest(response.data);
      
      // Set initial quality based on network
      if (response.data.qualities.length > 0) {
        const initialQuality = networkQuality === 'slow' ? '240p' : '720p';
        const available = response.data.qualities.find((q: Quality) => q.quality === initialQuality);
        setCurrentQuality(available ? initialQuality : response.data.qualities[0].quality);
        console.log('🎬 Initial quality set to:', available ? initialQuality : response.data.qualities[0].quality);
      }
    } catch (error: any) {
      console.error('❌ Failed to load manifest:', error);
      if (error.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(`Failed to load video: ${error.message}`);
      }
      message.error('Failed to load video');
    } finally {
      setLoading(false);
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

  // Check browser codec support
  const checkCodecSupport = () => {
    const video = document.createElement('video');
    const codecs = {
      h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
      h265: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
      vp8: video.canPlayType('video/webm; codecs="vp8"'),
      vp9: video.canPlayType('video/webm; codecs="vp9"'),
    };
    
    console.log('🎬 Browser codec support:', codecs);
    return codecs;
  };

  // Add video format validation
  const validateVideoFormat = async (url: string) => {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'Range': 'bytes=0-15'
        }
      });
      
      if (!response.ok) return false;
      
      const contentType = response.headers.get('Content-Type');
      const supportedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      
      console.log('📊 Content-Type:', contentType);
      
      if (contentType && supportedTypes.some(type => contentType.includes(type))) {
        console.log('✅ Video format supported:', contentType);
        return true;
      }
      
      // Check file signature for MP4
      try {
        const partialResponse = await fetch(url, { 
          headers: { 'Range': 'bytes=0-31' }
        });
        
        if (partialResponse.ok) {
          const buffer = await partialResponse.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          
          // Check for MP4 file signature (ftyp)
          if (bytes.length >= 8) {
            const ftypSignature = Array.from(bytes.slice(4, 8))
              .map(b => String.fromCharCode(b))
              .join('');
            
            console.log('📊 File signature:', ftypSignature);
            
            if (ftypSignature === 'ftyp') {
              console.log('✅ MP4 file signature detected');
              return true;
            }
          }
        }
      } catch (sigError) {
        console.warn('⚠️ Could not check file signature:', sigError);
      }
      
      console.warn('⚠️ Unsupported video format or corrupted file');
      return false;
    } catch (error) {
      console.error('❌ Format validation failed:', error);
      return false;
    }
  };

  const tryAlternativeVideoLoading = async () => {
    if (!manifest || !videoRef.current) return;
    
    console.log('🔄 Trying alternative video loading...');
    
    try {
      // Clear current source
      videoRef.current.src = '';
      videoRef.current.load();
      
      // Try loading with direct source assignment instead of source elements
      const qualityObj = manifest.qualities.find((q: Quality) => q.quality === currentQuality);
      if (qualityObj) {
        const token = Cookies.get('accessToken');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const videoUrl = `${baseUrl}${qualityObj.url}`;
        
        // Try different authentication methods and formats
        const authMethods = [
          // Try with token in query param
          token ? `${videoUrl}?token=${encodeURIComponent(token)}` : null,
          // Try with different token param name
          token ? `${videoUrl}?auth=${encodeURIComponent(token)}` : null,
          // Try with range header support
          token ? `${videoUrl}?token=${encodeURIComponent(token)}&range=bytes=0-` : null,
        ].filter(Boolean);
        
        for (const url of authMethods) {
          if (!url) continue;
          
          try {
            console.log('🔄 Trying URL:', url);
            
            // Test if URL is accessible with a small range request
            const response = await fetch(url, { 
              method: 'HEAD',
              headers: {
                ...(token && { 'Authorization': `Bearer ${token}` }),
                'Accept': 'video/mp4,video/webm,video/*,*/*;q=0.1',
                'Range': 'bytes=0-1023'
              }
            });
            
            console.log('📊 Response status:', response.status);
            console.log('📊 Content-Type:', response.headers.get('Content-Type'));
            console.log('📊 Accept-Ranges:', response.headers.get('Accept-Ranges'));
            
            if (response.ok) {
              console.log('✅ URL accessible, setting video source');
              
              // Validate video format before setting source
              const isValidFormat = await validateVideoFormat(url);
              if (!isValidFormat) {
                console.warn('⚠️ Invalid video format detected');
                continue;
              }
              
              // Set the video source and configure for streaming
              videoRef.current.src = url;
              
              // Add specific attributes for better streaming support
              videoRef.current.setAttribute('type', 'video/mp4');
              videoRef.current.preload = 'metadata';
              videoRef.current.crossOrigin = 'anonymous';
              
              videoRef.current.load();
              
              // Wait a bit and check if video is loadable
              setTimeout(() => {
                if (videoRef.current && videoRef.current.readyState >= 1) {
                  console.log('✅ Video metadata loaded successfully');
                } else {
                  console.warn('⚠️ Video metadata not loaded, may have format issues');
                }
              }, 2000);
              
              return;
            }
          } catch (error) {
            console.warn('⚠️ URL failed:', url, error);
            continue;
          }
        }
        
        throw new Error('No compatible video format found');
      }
    } catch (error) {
      console.error('❌ Alternative loading failed:', error);
      
      // Check if it's a format issue
      if (error instanceof Error && error.message.includes('format')) {
        setError('Video format is not web-compatible. The video needs to be transcoded for web playback. Please contact support to re-process this video.');
      } else {
        setError('Video format not supported. The video file may be corrupted or in an unsupported format. Please contact support.');
      }
    }
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
    
    const qualityObj = manifest.qualities.find((q: Quality) => q.quality === quality);
    if (!qualityObj || !videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;
    
    setCurrentQuality(quality);
    console.log('🔄 Switching to quality:', quality);
    
    const token = Cookies.get('accessToken');
    console.log('🔑 Token available:', !!token);
    
    // Construct the proper video URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const videoUrl = `${baseUrl}${qualityObj.url}`;
    console.log('🎥 Base video URL:', videoUrl);
    
    // Add auth token to URL if available
    const urlWithAuth = token ? `${videoUrl}?token=${encodeURIComponent(token)}` : videoUrl;
    console.log('🔐 Final video URL:', urlWithAuth);
    
    // Set the video source
    videoRef.current.src = urlWithAuth;
    videoRef.current.load();
    
    // Restore playback state after loading
    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current.play().catch((error) => {
            console.error('❌ Failed to resume playback:', error);
            message.error('Failed to resume video playback');
          });
        }
      }
    };
    
    videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set initial state based on video element
    setIsPlaying(!video.paused && !video.ended);

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      // Optional: Add debug logging
      // console.log('Time update:', video.currentTime);
    };
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => {
      console.log('▶️ Video play event fired');
      setIsPlaying(true);
      setBuffering(false); // Clear buffering when playing starts
    };
    
    const handlePause = () => {
      console.log('⏸️ Video pause event fired');
      setIsPlaying(false);
    };
    
    const handleEnded = () => {
      console.log('🏁 Video ended');
      setIsPlaying(false);
    };
    
    const handleWaiting = () => {
      console.log('⏳ Video buffering...');
      setBuffering(true);
    };
    
    const handleCanPlayThrough = () => {
      console.log('✅ Video can play through');
      setBuffering(false);
    };
    
    const handleError = (e: Event) => {
      console.error('❌ Video error:', e);
      const error = (e.target as HTMLVideoElement).error;
      if (error) {
        console.error('❌ Video error details:', {
          code: error.code,
          message: error.message,
          MEDIA_ERR_ABORTED: 1,
          MEDIA_ERR_NETWORK: 2, 
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4
        });
        
        let errorMessage = 'Video playback error';
        switch (error.code) {
          case 1:
            errorMessage = 'Video loading was aborted';
            break;
          case 2:
            errorMessage = 'Network error while loading video';
            break;
          case 3:
            errorMessage = 'Video decode error - corrupted file';
            break;
          case 4:
            errorMessage = 'Video format not supported by your browser';
            // Try to reload with different approach
            tryAlternativeVideoLoading();
            return;
          default:
            errorMessage = error.message || 'Unknown video error';
        }
        
        setError(`Video error: ${errorMessage}`);
        message.error(errorMessage);
      }
    };
    const handleLoadStart = () => {
      console.log('🔄 Video loading started');
    };
    const handleCanPlay = () => {
      console.log('✅ Video can play');
      setError(null); // Clear any previous errors
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, []);

  // Timer-based update for smooth slider synchronization
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isPlaying && videoRef.current && !isDragging) {
      intervalId = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused && !isDragging) {
          setCurrentTime(videoRef.current.currentTime);
        }
      }, 100); // Update every 100ms for smooth slider movement
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, isDragging]);

  // Update video source when quality changes
  useEffect(() => {
    if (!manifest || !videoRef.current) return;
    
    const qualityObj = manifest.qualities.find((q: Quality) => q.quality === currentQuality);
    if (qualityObj) {
      const token = Cookies.get('accessToken');
      console.log('🔑 Setting up video source. Token available:', !!token);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const videoUrl = `${baseUrl}${qualityObj.url}`;
      console.log('🎥 Base video URL:', videoUrl);
      
      const urlWithAuth = token ? `${videoUrl}?token=${encodeURIComponent(token)}` : videoUrl;
      console.log('🔐 Final video URL with auth:', urlWithAuth);
      
      // Clear any existing source first
      videoRef.current.src = '';
      videoRef.current.load();
      
      // Set new source with delay to ensure clean state
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = urlWithAuth;
          
          // Set proper MIME type and codec hints
          if (videoRef.current.canPlayType) {
            const mp4Support = videoRef.current.canPlayType('video/mp4; codecs="avc1.42E01E"');
            const webmSupport = videoRef.current.canPlayType('video/webm; codecs="vp8"');
            
            console.log('🎬 Video format support:', {
              mp4: mp4Support,
              webm: webmSupport
            });
          }
          
          videoRef.current.load();
        }
      }, 100);
      
      // Add error handling for source loading
      const handleError = (e: Event) => {
        console.error('❌ Video source error:', e);
        const video = e.target as HTMLVideoElement;
        if (video.error) {
          console.error('❌ Video error details:', {
            code: video.error.code,
            message: video.error.message
          });
          
          // Try alternative loading on format error
          if (video.error.code === 4) {
            console.log('🔄 Format error detected, trying alternative loading...');
            tryAlternativeVideoLoading();
          } else {
            setError(`Video loading failed: ${video.error.message || 'Unknown error'}`);
          }
        }
      };
      
      const handleLoadStart = () => {
        console.log('🔄 Video loading started');
        setError(null); // Clear previous errors
      };
      
      const handleCanPlay = () => {
        console.log('✅ Video can play');
        setError(null);
      };
      
      videoRef.current.addEventListener('error', handleError, { once: true });
      videoRef.current.addEventListener('loadstart', handleLoadStart, { once: true });
      videoRef.current.addEventListener('canplay', handleCanPlay, { once: true });
    }
  }, [currentQuality, manifest]);

  const togglePlay = () => {
    if (!videoRef.current) {
      console.warn('⚠️ Video ref not available');
      return;
    }
    
    console.log('🎮 Toggle play clicked. Current state:', {
      paused: videoRef.current.paused,
      isPlaying: isPlaying,
      src: videoRef.current.src,
      readyState: videoRef.current.readyState,
      currentTime: videoRef.current.currentTime
    });
    
    // Use the actual video element state as the source of truth
    const actuallyPlaying = !videoRef.current.paused;
    
    if (actuallyPlaying) {
      console.log('⏸️ Attempting to pause video');
      try {
        videoRef.current.pause();
        
        // Force state update if event doesn't fire
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused && isPlaying) {
            console.log('🔧 Force updating pause state');
            setIsPlaying(false);
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Pause failed:', error);
        setIsPlaying(false);
      }
    } else {
      // Check if video has a valid source before trying to play
      if (!videoRef.current.src) {
        console.warn('⚠️ No video source available');
        message.warning('Video source not available');
        return;
      }
      
      console.log('▶️ Attempting to play video');
      videoRef.current.play().catch((error) => {
        console.error('❌ Play failed:', error);
        message.error(`Failed to play video: ${error.message}`);
        
        // Reset playing state on error
        setIsPlaying(false);
        
        // Try to reload the video if play fails
        if (manifest && videoRef.current) {
          console.log('🔄 Attempting to reload video...');
          const qualityObj = manifest.qualities.find((q: Quality) => q.quality === currentQuality);
          if (qualityObj) {
            const token = Cookies.get('accessToken');
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const videoUrl = `${baseUrl}${qualityObj.url}`;
            const urlWithAuth = token ? `${videoUrl}?token=${encodeURIComponent(token)}` : videoUrl;
            
            videoRef.current.src = urlWithAuth;
            videoRef.current.load();
          }
        }
      });
    }
  };

  const seekForward = () => {
    if (!videoRef.current) {
      console.warn('⚠️ Video ref not available for seek forward');
      return;
    }
    
    const currentTime = videoRef.current.currentTime;
    const videoDuration = videoRef.current.duration || duration;
    const newTime = Math.min(currentTime + 10, videoDuration);
    
    console.log('⏩ Seeking forward:', {
      from: currentTime,
      to: newTime,
      duration: videoDuration
    });
    
    videoRef.current.currentTime = newTime;
    
    // Force update the state
    setCurrentTime(newTime);
    
    // Show visual feedback
    setSeeking({ show: true, direction: 'forward' });
    setTimeout(() => setSeeking({ show: false, direction: null }), 800);
  };

  const seekBackward = () => {
    if (!videoRef.current) {
      console.warn('⚠️ Video ref not available for seek backward');
      return;
    }
    
    const currentTime = videoRef.current.currentTime;
    const newTime = Math.max(currentTime - 10, 0);
    
    console.log('⏪ Seeking backward:', {
      from: currentTime,
      to: newTime
    });
    
    videoRef.current.currentTime = newTime;
    
    // Force update the state
    setCurrentTime(newTime);
    
    // Show visual feedback
    setSeeking({ show: true, direction: 'backward' });
    setTimeout(() => setSeeking({ show: false, direction: null }), 800);
  };

  const handleTimeChange = (value: number) => {
    console.log('🎯 Slider time change:', value, 'isDragging:', isDragging);
    setIsDragging(true); // Set dragging when slider changes
    
    // Clear any existing timeout
    if (dragTimeout) {
      clearTimeout(dragTimeout);
    }
    
    // Set a fallback timeout to reset dragging state
    const timeout = setTimeout(() => {
      console.log('🎯 Fallback: Resetting dragging state');
      setIsDragging(false);
    }, 1000);
    setDragTimeout(timeout);
    
    if (videoRef.current) {
      const oldTime = videoRef.current.currentTime;
      videoRef.current.currentTime = value;
      setCurrentTime(value); // Update state to sync slider
      console.log('🎯 Video time updated from', oldTime, 'to', value);
    }
  };

  const handleSliderAfterChange = (value: number) => {
    console.log('🎯 Slider drag end:', value);
    
    // Clear the fallback timeout
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    
    setIsDragging(false);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
      console.log('🎯 Final video time set to:', value);
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

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px', 
        background: '#ffffff',
        color: '#333333',
        borderRadius: '12px',
        border: '2px solid #FFD700'
      }}>
        <div className="spinner" style={{ margin: '0 auto 20px', borderColor: '#FFD700' }}></div>
        <span style={{ color: '#666666' }}>Loading video...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px', 
        background: '#ffffff',
        color: '#ff4d4f',
        borderRadius: '12px',
        border: '2px solid #FFD700'
      }}>
        <h3 style={{ color: '#ff4d4f' }}>❌ Error Loading Video</h3>
        <p style={{ color: '#666666' }}>{error}</p>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Button 
            onClick={loadManifest} 
            style={{ 
              backgroundColor: '#FFD700',
              borderColor: '#FFD700',
              color: '#333333'
            }}
            type="primary"
          >
            Retry
          </Button>
          {error.includes('Authentication') && (
            <Button 
              onClick={() => window.location.href = '/login'} 
              style={{ 
                backgroundColor: '#FFC107',
                borderColor: '#FFC107',
                color: '#333333'
              }}
              type="primary"
            >
              Go to Login
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px', 
        background: '#ffffff',
        color: '#333333',
        borderRadius: '12px',
        border: '2px solid #FFD700'
      }}>
        <span style={{ color: '#666666' }}>No video data available</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="video-player-container"
      onMouseMove={handleMouseMove}
      style={{ 
        position: 'relative', 
        width: '100%', 
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '3px solid #FFD700'
      }}
    >
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          style={{
            filter: `brightness(${brightness})`,
            width: '100%',
            height: '100%'
          }}
          onClick={(e) => {
            e.preventDefault();
            console.log('🖱️ Video clicked');
            togglePlay();
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            console.log('🖱️ Video double-clicked');
            togglePlay();
          }}
          controls={false}
          preload="metadata"
          crossOrigin="anonymous"
          playsInline
        >
          <p style={{ color: '#ff4d4f', padding: '20px', textAlign: 'center' }}>
            Your browser does not support the video tag or the video format.
            <br />
            Please try a different browser or contact support.
          </p>
        </video>

        {/* Center Play Overlay */}
        {(!isPlaying || loading || buffering) && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: (loading || buffering) ? 'none' : 'auto'
            }}
          >
            <Button
              type="text"
              icon={
                loading ? (
                  <div style={{ color: '#fff', fontSize: '16px' }}>Loading...</div>
                ) : buffering ? (
                  <div style={{ color: '#fff', fontSize: '16px' }}>Buffering...</div>
                ) : (
                  <PlayCircleOutlined />
                )
              }
              onClick={!loading && !buffering ? togglePlay : undefined}
              size="large"
              style={{
                color: '#fff',
                fontSize: buffering || loading ? '16px' : '80px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                border: '3px solid #fff',
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                opacity: (loading || buffering) ? 0.8 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading && !buffering) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !buffering) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)';
                }
              }}
              title={
                loading ? 'Loading...' : 
                buffering ? 'Buffering...' : 
                'Play Video'
              }
            />
          </div>
        )}

        {/* Seek Indicator Overlay */}
        {seekIndicator.show && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              padding: '20px 30px',
              borderRadius: '12px',
              border: '2px solid #FFD700',
              animation: 'fadeInOut 0.8s ease-in-out'
            }}
          >
            {seekIndicator.direction === 'forward' ? (
              <>
                <ForwardOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>+10s</span>
              </>
            ) : (
              <>
                <BackwardOutlined style={{ color: '#ff4d4f', fontSize: '24px' }} />
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>-10s</span>
              </>
            )}
          </div>
        )}
      </div>

      {showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(255,215,0,0.9), rgba(255,215,0,0.7), transparent)',
            padding: '20px',
            transition: 'opacity 0.3s',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px'
          }}
        >
          {/* Progress bar */}
          <Slider
            value={currentTime}
            max={duration}
            step={0.1}
            onChange={handleTimeChange}
            onChangeComplete={handleSliderAfterChange}
            tooltip={{ formatter: (value) => formatTime(value || 0) }}
            styles={{ 
              track: { background: '#FFC107' },
              handle: { borderColor: '#FFD700', backgroundColor: '#FFD700' },
              rail: { backgroundColor: 'rgba(255,255,255,0.3)' }
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
            {/* Play/Pause */}
            <Button
              type="text"
              icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
              onClick={togglePlay}
              size="large"
              style={{ 
                color: isPlaying ? '#ff4d4f' : '#52c41a', 
                fontSize: '28px', 
                backgroundColor: 'rgba(255,255,255,0.95)', 
                borderRadius: '50%',
                border: `2px solid ${isPlaying ? '#ff4d4f' : '#52c41a'}`,
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
              }}
              title={isPlaying ? 'Pause Video' : 'Play Video'}
            />

            {/* Seek backward */}
            <Button
              type="text"
              icon={<BackwardOutlined />}
              onClick={(e) => {
                e.preventDefault();
                console.log('🖱️ Seek backward button clicked');
                seekBackward();
              }}
              style={{ 
                color: '#333333', 
                backgroundColor: 'rgba(255,255,255,0.9)', 
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,1)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Seek backward 10 seconds"
            >
              10s
            </Button>

            {/* Seek forward */}
            <Button
              type="text"
              icon={<ForwardOutlined />}
              onClick={(e) => {
                e.preventDefault();
                console.log('🖱️ Seek forward button clicked');
                seekForward();
              }}
              style={{ 
                color: '#333333', 
                backgroundColor: 'rgba(255,255,255,0.9)', 
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,1)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Seek forward 10 seconds"
            >
              10s
            </Button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
              <SoundOutlined style={{ color: '#333333' }} />
              <Slider
                value={volume}
                min={0}
                max={1}
                step={0.1}
                onChange={handleVolumeChange}
                styles={{ 
                  track: { background: '#FFC107' },
                  handle: { borderColor: '#FFD700', backgroundColor: '#FFD700' },
                  rail: { backgroundColor: 'rgba(255,255,255,0.3)' }
                }}
                style={{ flex: 1 }}
              />
              <span style={{ color: '#333333', minWidth: '35px', fontSize: '12px', fontWeight: 'bold' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Brightness */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
              <BgColorsOutlined style={{ color: '#333333' }} />
              <Slider
                value={brightness}
                min={0.3}
                max={1.5}
                step={0.1}
                onChange={handleBrightnessChange}
                styles={{ 
                  track: { background: '#FFC107' },
                  handle: { borderColor: '#FFD700', backgroundColor: '#FFD700' },
                  rail: { backgroundColor: 'rgba(255,255,255,0.3)' }
                }}
                style={{ flex: 1 }}
              />
            </div>

            {/* Quality selector */}
            <Select
              value={currentQuality}
              onChange={switchQuality}
              style={{ 
                minWidth: '100px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '8px'
              }}
              dropdownStyle={{
                backgroundColor: '#ffffff',
                border: '2px solid #FFD700'
              }}
              options={manifest.qualities.map(q => ({
                label: q.quality,
                value: q.quality
              }))}
            />

            {/* Time display */}
            <span style={{ 
              color: '#333333', 
              marginLeft: 'auto',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Fullscreen */}
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              style={{ color: '#333333', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '8px' }}
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
          <PlayCircleOutlined style={{ fontSize: '64px', color: 'rgba(255,215,0,0.6)' }} />
        </div>
      )}
    </div>
  );
}
