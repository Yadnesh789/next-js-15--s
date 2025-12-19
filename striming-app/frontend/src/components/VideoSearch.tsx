'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Input,
  Select,
  Row,
  Col,
  Card,
  Spin,
  Empty,
  Tag,
  Pagination,
  message,
  AutoComplete,
  Slider,
  Collapse,
  Button,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { searchAPI, SearchParams, Video, Category } from '@/lib/api';
import Link from 'next/link';

const { Option } = Select;
const { Panel } = Collapse;
const { Text, Title } = Typography;

interface SearchState {
  videos: Video[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
  suggestions: string[];
  relatedCategories: { name: string; count: number }[];
}

export default function VideoSearch() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: '',
    category: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    limit: 12,
  });

  const [state, setState] = useState<SearchState>({
    videos: [],
    loading: false,
    pagination: {
      page: 1,
      limit: 12,
      total: 0,
      pages: 0,
      hasMore: false,
    },
    suggestions: [],
    relatedCategories: [],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [autocompleteOptions, setAutocompleteOptions] = useState<{ value: string; label: string }[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout>();

  // Load categories on mount
  useEffect(() => {
    loadCategories();
    loadTrending();
  }, []);

  // Search when params change
  useEffect(() => {
    performSearch();
  }, [searchParams.category, searchParams.sortBy, searchParams.sortOrder, searchParams.page]);

  const loadCategories = async () => {
    try {
      const response = await searchAPI.getCategories();
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTrending = async () => {
    try {
      const response = await searchAPI.getTrending(6);
      if (response.data.success) {
        setTrendingVideos(response.data.videos);
      }
    } catch (error) {
      console.error('Failed to load trending:', error);
    }
  };

  const performSearch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await searchAPI.search(searchParams);
      if (response.data.success) {
        setState({
          videos: response.data.videos,
          loading: false,
          pagination: response.data.pagination,
          suggestions: response.data.suggestions,
          relatedCategories: response.data.relatedCategories,
        });
      }
    } catch (error: any) {
      console.error('Search error:', error);
      message.error('Search failed. Please try again.');
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [searchParams]);

  const handleSearchInput = (value: string) => {
    setSearchParams((prev) => ({ ...prev, query: value, page: 1 }));

    // Debounce autocomplete
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const response = await searchAPI.getSuggestions(value);
          if (response.data.success) {
            setAutocompleteOptions(
              response.data.suggestions.map((s) => ({
                value: s.text,
                label: `${s.type === 'category' ? '📁' : '🎬'} ${s.text}`,
              }))
            );
          }
        } catch (error) {
          console.error('Autocomplete error:', error);
        }
      }, 300);
    } else {
      setAutocompleteOptions([]);
    }
  };

  const handleSearch = () => {
    setSearchParams((prev) => ({ ...prev, page: 1 }));
    performSearch();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Search Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>
          🎬 Video Search
        </Title>

        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12} lg={14}>
            <AutoComplete
              options={autocompleteOptions}
              onSelect={(value) => {
                setSearchParams((prev) => ({ ...prev, query: value, page: 1 }));
                performSearch();
              }}
              style={{ width: '100%' }}
            >
              <Input.Search
                size="large"
                placeholder="Search videos..."
                prefix={<SearchOutlined />}
                value={searchParams.query}
                onChange={(e) => handleSearchInput(e.target.value)}
                onSearch={handleSearch}
                enterButton="Search"
                allowClear
              />
            </AutoComplete>
          </Col>

          <Col xs={12} md={6} lg={5}>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={searchParams.category}
              onChange={(value) => setSearchParams((prev) => ({ ...prev, category: value, page: 1 }))}
              placeholder="Category"
            >
              <Option value="all">All Categories</Option>
              {categories.map((cat) => (
                <Option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={12} md={6} lg={5}>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={searchParams.sortBy}
              onChange={(value) => setSearchParams((prev) => ({ ...prev, sortBy: value, page: 1 }))}
              placeholder="Sort By"
            >
              <Option value="relevance">Relevance</Option>
              <Option value="date">Upload Date</Option>
              <Option value="views">Most Views</Option>
              <Option value="title">Title (A-Z)</Option>
            </Select>
          </Col>
        </Row>

        {/* Advanced Filters Toggle */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button
            type="link"
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Advanced Filters'}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card size="small" style={{ marginTop: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Text strong>Views Range:</Text>
                <Slider
                  range
                  min={0}
                  max={10000}
                  defaultValue={[0, 10000]}
                  onChange={(values) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      minViews: values[0],
                      maxViews: values[1],
                    }))
                  }
                  marks={{
                    0: '0',
                    2500: '2.5K',
                    5000: '5K',
                    7500: '7.5K',
                    10000: '10K+',
                  }}
                />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Duration (minutes):</Text>
                <Slider
                  range
                  min={0}
                  max={120}
                  defaultValue={[0, 120]}
                  onChange={(values) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      minDuration: values[0] * 60,
                      maxDuration: values[1] * 60,
                    }))
                  }
                  marks={{
                    0: '0',
                    30: '30m',
                    60: '1h',
                    90: '1.5h',
                    120: '2h+',
                  }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </div>

      {/* Search Results */}
      <Spin spinning={state.loading}>
        {state.videos.length > 0 ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">
                Found {state.pagination.total} videos
                {searchParams.query && ` for "${searchParams.query}"`}
              </Text>
            </div>

            <Row gutter={[16, 16]}>
              {state.videos.map((video) => (
                <Col xs={24} sm={12} md={8} lg={6} key={video._id}>
                  <Link href={`/video/${video._id}`}>
                    <Card
                      hoverable
                      cover={
                        <div
                          style={{
                            position: 'relative',
                            height: '160px',
                            background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <PlayCircleOutlined
                            style={{ fontSize: '48px', color: 'white', opacity: 0.8 }}
                          />
                          <Tag
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              border: 'none',
                            }}
                          >
                            <ClockCircleOutlined /> {formatDuration(video.duration)}
                          </Tag>
                        </div>
                      }
                      bodyStyle={{ padding: '12px' }}
                    >
                      <Card.Meta
                        title={
                          <Text ellipsis style={{ fontSize: '14px', fontWeight: 500 }}>
                            {video.title}
                          </Text>
                        }
                        description={
                          <div>
                            <Tag color="blue">
                              {video.category}
                            </Tag>
                            <div style={{ marginTop: '8px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <EyeOutlined /> {formatViews(video.views)} views
                              </Text>
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>

            {/* Pagination */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Pagination
                current={state.pagination.page}
                total={state.pagination.total}
                pageSize={state.pagination.limit}
                onChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
                showSizeChanger={false}
                showTotal={(total) => `Total ${total} videos`}
              />
            </div>
          </>
        ) : !state.loading ? (
          <Empty
            description={
              <div>
                <Text>No videos found</Text>
                {state.suggestions.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <Text type="secondary">Try searching for:</Text>
                    <div style={{ marginTop: '8px' }}>
                      {state.suggestions.map((suggestion) => (
                        <Tag
                          key={suggestion}
                          color="blue"
                          style={{ cursor: 'pointer', marginBottom: '4px' }}
                          onClick={() => {
                            setSearchParams((prev) => ({ ...prev, query: suggestion, page: 1 }));
                            performSearch();
                          }}
                        >
                          {suggestion}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            }
          />
        ) : null}
      </Spin>

      {/* Trending Section (when no search) */}
      {!searchParams.query && trendingVideos.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <Title level={4}>
            <FireOutlined style={{ color: '#ff4d4f' }} /> Trending Now
          </Title>
          <Row gutter={[16, 16]}>
            {trendingVideos.map((video) => (
              <Col xs={24} sm={12} md={8} lg={4} key={video._id}>
                <Link href={`/video/${video._id}`}>
                  <Card
                    hoverable
                    size="small"
                    cover={
                      <div
                        style={{
                          height: '100px',
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PlayCircleOutlined style={{ fontSize: '32px', color: 'white' }} />
                      </div>
                    }
                    bodyStyle={{ padding: '8px' }}
                  >
                    <Text ellipsis style={{ fontSize: '12px' }}>
                      {video.title}
                    </Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: '10px' }}>
                        {formatViews(video.views)} views
                      </Text>
                    </div>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Related Categories */}
      {state.relatedCategories.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Text strong>Browse by Category:</Text>
          <div style={{ marginTop: '8px' }}>
            {state.relatedCategories.map((cat) => (
              <Tag
                key={cat.name}
                color="geekblue"
                style={{ cursor: 'pointer', marginBottom: '4px' }}
                onClick={() => {
                  setSearchParams((prev) => ({ ...prev, category: cat.name, page: 1 }));
                }}
              >
                {cat.name} ({cat.count})
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
