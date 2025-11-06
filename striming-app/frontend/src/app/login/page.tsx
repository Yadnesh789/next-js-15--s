'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      message.error('Please enter your phone number');
      return;
    }

    try {
      setLoading(true);
      await authAPI.sendOTP(phoneNumber);
      setStep('otp');
      setCountdown(60);
      message.success('OTP sent to your phone');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      message.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const deviceInfo = navigator.userAgent;
      await login(phoneNumber, otp, deviceInfo);
      message.success('Login successful!');
      router.push('/');
    } catch (error: any) {
      message.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: '8px' }}>
              Striming App
            </Title>
            <Text type="secondary">
              {step === 'phone' ? 'Enter your phone number' : 'Enter OTP to verify'}
            </Text>
          </div>

          {step === 'phone' ? (
            <Form onFinish={handleSendOTP} layout="vertical">
              <Form.Item
                name="phoneNumber"
                rules={[
                  { required: true, message: 'Please enter your phone number' },
                  { pattern: /^\+?[1-9]\d{1,14}$/, message: 'Invalid phone number format' }
                ]}
              >
                <Input
                  size="large"
                  prefix={<PhoneOutlined />}
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                Send OTP
              </Button>
            </Form>
          ) : (
            <Form onFinish={handleVerifyOTP} layout="vertical">
              <Form.Item
                name="otp"
                rules={[
                  { required: true, message: 'Please enter OTP' },
                  { len: 6, message: 'OTP must be 6 digits' }
                ]}
              >
                <Input
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </Form.Item>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                >
                  Verify OTP
                </Button>

                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">Didn't receive OTP? </Text>
                  <Button
                    type="link"
                    onClick={handleResendOTP}
                    disabled={countdown > 0}
                  >
                    Resend {countdown > 0 && `(${countdown}s)`}
                  </Button>
                </div>

                <Button
                  type="link"
                  block
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                  }}
                >
                  Change phone number
                </Button>
              </Space>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
}

