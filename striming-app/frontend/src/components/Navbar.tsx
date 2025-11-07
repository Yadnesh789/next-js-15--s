'use client';

import { useRouter } from 'next/navigation';
import { Layout, Menu, Button, Dropdown, Avatar } from 'antd';
import { LogoutOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

const { Header } = Layout;

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loadSessions, sessions } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated, loadSessions]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Home',
      onClick: () => router.push('/')
    },
    {
      key: 'sessions',
      label: `Sessions (${sessions.length})`,
      children: sessions.map((session, index) => ({
        key: `session-${index}`,
        label: (
          <div>
            <div style={{ color: '#333333' }}>{session.deviceInfo}</div>
            <small style={{ color: '#666666' }}>
              {new Date(session.lastActive).toLocaleString()}
            </small>
          </div>
        ),
        onClick: () => {
          // Option to logout specific session
        }
      }))
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout
    }
  ];

  // Temporarily show navbar even if not authenticated for debugging
  // if (!isAuthenticated) {
  //   return null;
  // }

  if (!isAuthenticated) {
    return (
      <Header
        className="navbar"
        style={{
          background: '#ffffff',
          borderBottom: '3px solid #FFD700',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          style={{ 
            color: '#333333', 
            fontSize: '20px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            textShadow: '1px 1px 2px rgba(255, 215, 0, 0.3)'
          }}
          onClick={() => router.push('/')}
        >
          🎬 Striming (Debug Mode)
        </div>
        <Button onClick={() => router.push('/login')}>Login</Button>
      </Header>
    );
  }

  return (
    <Header
      className="navbar"
      style={{
        background: '#ffffff',
        borderBottom: '3px solid #FFD700',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div
        style={{ 
          color: '#333333', 
          fontSize: '20px', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          textShadow: '1px 1px 2px rgba(255, 215, 0, 0.3)'
        }}
        onClick={() => router.push('/')}
      >
        🎬 Striming
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ 
          color: '#333333',
          fontWeight: '500',
          background: '#FFF9C4',
          padding: '4px 12px',
          borderRadius: '16px',
          border: '1px solid #FFD700'
        }}>
          {user?.phoneNumber}
        </span>
        <Dropdown 
          menu={{ items: menuItems }} 
          placement="bottomRight"
        >
          <Avatar 
            icon={<UserOutlined />} 
            style={{ 
              cursor: 'pointer',
              background: '#FFD700',
              color: '#333333',
              border: '2px solid #FFC107'
            }} 
          />
        </Dropdown>
      </div>
    </Header>
  );
}

