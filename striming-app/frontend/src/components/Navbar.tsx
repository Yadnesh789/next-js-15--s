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
            <div>{session.deviceInfo}</div>
            <small style={{ color: '#999' }}>
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Header
      style={{
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px'
      }}
    >
      <div
        style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}
        onClick={() => router.push('/')}
      >
        Striming
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ color: '#fff' }}>{user?.phoneNumber}</span>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
        </Dropdown>
      </div>
    </Header>
  );
}

