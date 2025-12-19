'use client';

import { useState } from 'react';
import {
  Layout,
  Typography,
  Card,
  Upload,
  Form,
  Input,
  Select,
  Button,
  Progress,
  message,
  Tabs,
  Row,
  Col,
  Space,
  Divider,
} from 'antd';
import {
  UploadOutlined,
  InboxOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { adminAPI } from '@/lib/api';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

interface UploadFormValues {
  title: string;
  description?: string;
  category: string;
  tags?: string;
  thumbnailUrl?: string;
  duration?: number;
}

const categories = [
  { value: 'movies', label: 'Movies' },
  { value: 'series', label: 'TV Series' },
  { value: 'sports', label: 'Sports' },
  { value: 'news', label: 'News' },
  { value: 'music', label: 'Music' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'kids', label: 'Kids' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

export default function AdminPage() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);

  const handleUpload = async (values: UploadFormValues) => {
    if (fileList.length === 0) {
      message.error('Please select a video file to upload');
      return;
    }

    // Get the actual file object
    const videoFile = fileList[0].originFileObj || fileList[0];
    
    if (!videoFile || !(videoFile instanceof File)) {
      message.error('Invalid video file. Please select the file again.');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    
    // Required fields
    formData.append('title', values.title);
    formData.append('category', values.category);
    
    // Optional fields
    if (values.description) {
      formData.append('description', values.description);
    }
    
    // Duration (default to 0 if not provided)
    formData.append('duration', String(values.duration || 0));
    
    // Thumbnail URL (text, not file)
    if (values.thumbnailUrl) {
      formData.append('thumbnail', values.thumbnailUrl);
    }
    
    // Tags as JSON string
    if (values.tags) {
      const tagsArray = values.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      formData.append('tags', JSON.stringify(tagsArray));
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);

    try {
      const response = await adminAPI.uploadVideo(formData, (percent) => {
        setUploadProgress(percent);
      });
      
      if (response.data?.success) {
        setUploadComplete(true);
        message.success('Video uploaded successfully!');
        
        // Reset form
        form.resetFields();
        setFileList([]);
        
        setTimeout(() => {
          setUploadComplete(false);
          setUploadProgress(0);
        }, 3000);
      } else {
        throw new Error(response.data?.error || 'Upload failed');
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      
      // Extract error message from axios error response
      let errorMessage = 'Failed to upload video';
      
      if (error && typeof error === 'object') {
        const axiosError = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      message.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const videoUploadProps: UploadProps = {
    name: 'video',
    multiple: false,
    maxCount: 1,
    accept: 'video/*,.mp4,.webm,.ogg,.avi,.mov,.mkv',
    fileList,
    beforeUpload: (file) => {
      // Check if it's a video file
      const isVideo = file.type.startsWith('video/') || 
        /\.(mp4|webm|ogg|avi|mov|mkv)$/i.test(file.name);
      
      if (!isVideo) {
        message.error('You can only upload video files!');
        return Upload.LIST_IGNORE;
      }
      
      const isLt500M = file.size / 1024 / 1024 < 500;
      if (!isLt500M) {
        message.error('Video must be smaller than 500MB!');
        return Upload.LIST_IGNORE;
      }
      
      // Store the file with originFileObj properly set
      const uploadFile: UploadFile = {
        uid: file.uid || `-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        originFileObj: file as unknown as UploadFile['originFileObj'],
        status: 'done',
      };
      
      setFileList([uploadFile]);
      return false; // Prevent auto upload
    },
    onRemove: () => {
      setFileList([]);
      return true;
    },
  };

  const tabItems = [
    {
      key: 'upload',
      label: (
        <span>
          <UploadOutlined />
          Upload Video
        </span>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <Card title="Video Details" bordered={false}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleUpload}
                requiredMark="optional"
              >
                <Form.Item
                  name="title"
                  label="Video Title"
                  rules={[{ required: true, message: 'Please enter video title' }]}
                >
                  <Input
                    placeholder="Enter video title"
                    size="large"
                    prefix={<VideoCameraOutlined />}
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Description"
                >
                  <TextArea
                    placeholder="Enter video description (optional)"
                    rows={4}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="category"
                      label="Category"
                      rules={[{ required: true, message: 'Please select a category' }]}
                    >
                      <Select
                        placeholder="Select category"
                        size="large"
                        options={categories}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="duration"
                      label="Duration (seconds)"
                    >
                      <Input
                        type="number"
                        placeholder="e.g., 120"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="tags"
                  label="Tags (comma separated)"
                >
                  <Input
                    placeholder="action, thriller, hindi"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="thumbnailUrl"
                  label="Thumbnail URL (Optional)"
                >
                  <Input
                    placeholder="https://example.com/thumbnail.jpg"
                    size="large"
                  />
                </Form.Item>

                <Divider />

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isUploading}
                    icon={uploadComplete ? <CheckCircleOutlined /> : <UploadOutlined />}
                    block
                    style={{
                      backgroundColor: uploadComplete ? '#52c41a' : undefined,
                      borderColor: uploadComplete ? '#52c41a' : undefined,
                    }}
                  >
                    {isUploading
                      ? 'Uploading...'
                      : uploadComplete
                      ? 'Upload Complete!'
                      : 'Upload Video'}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Select Video File" bordered={false}>
              <Dragger {...videoUploadProps} style={{ padding: '20px 0' }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">
                  Click or drag video file to this area
                </p>
                <p className="ant-upload-hint">
                  Support for MP4, WebM, AVI, MOV files. Max size: 500MB
                </p>
              </Dragger>

              {isUploading && (
                <div style={{ marginTop: 24 }}>
                  <Text strong>Upload Progress</Text>
                  <Progress
                    percent={uploadProgress}
                    status={uploadProgress === 100 ? 'success' : 'active'}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                  />
                </div>
              )}

              {fileList.length > 0 && !isUploading && (
                <div style={{ marginTop: 24 }}>
                  <Text type="secondary">Selected file:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space>
                      <VideoCameraOutlined />
                      <Text>{fileList[0].name}</Text>
                    </Space>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Upload Guidelines" bordered={false} style={{ marginTop: 16 }}>
              <Space direction="vertical" size="small">
                <Text>✓ Supported formats: MP4, WebM, AVI, MOV</Text>
                <Text>✓ Maximum file size: 500MB</Text>
                <Text>✓ Recommended resolution: 1080p or higher</Text>
                <Text>✓ Add relevant tags for better discoverability</Text>
                <Text>✓ Thumbnail is optional but recommended</Text>
              </Space>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'manage',
      label: (
        <span>
          <VideoCameraOutlined />
          Manage Videos
        </span>
      ),
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <VideoCameraOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />
            <Title level={4} style={{ marginTop: 16 }}>
              Video Management
            </Title>
            <Text type="secondary">
              Video management features coming soon. You will be able to edit, delete, and organize your videos here.
            </Text>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={2}>Admin Dashboard</Title>
            <Text type="secondary">
              Upload and manage videos for your streaming platform
            </Text>
          </div>

          <Tabs items={tabItems} size="large" />
        </div>
      </Content>
    </Layout>
  );
}
