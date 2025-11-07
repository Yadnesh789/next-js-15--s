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
        background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 50%, #FFEB3B 100%)',
        padding: '20px'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(255, 215, 0, 0.3)',
          border: '2px solid #FFD700'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title 
              level={2} 
              style={{ 
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #FFD700, #FFC107)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '28px'
              }}
            >
              🎬 Striming App
            </Title>
            <Text style={{ color: '#666666', fontSize: '16px' }}>
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
                  className="input"
                  size="large"
                  prefix={<PhoneOutlined style={{ color: '#FFD700' }} />}
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </Form.Item>

              <Button
                className="btn-primary"
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
                  className="input"
                  size="large"
                  prefix={<LockOutlined style={{ color: '#FFD700' }} />}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </Form.Item>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  className="btn-primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                >
                  Verify OTP
                </Button>

                <div style={{ textAlign: 'center' }}>
                  <Text style={{ color: '#666666' }}>Didn't receive OTP? </Text>
                  <Button
                    type="link"
                    onClick={handleResendOTP}
                    disabled={countdown > 0}
                    style={{ 
                      color: countdown > 0 ? '#999999' : '#F57F17',
                      fontWeight: '600'
                    }}
                  >
                    Resend {countdown > 0 && `(${countdown}s)`}
                  </Button>
                </div>

                <Button
                  className="btn-secondary"
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

