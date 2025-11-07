import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import AuthProvider from '@/components/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Striming App - Watch Your Favorite Videos',
  description: 'Modern video streaming platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#FFD700',
                colorPrimaryHover: '#FFC107',
                colorPrimaryActive: '#F57F17',
                borderRadius: 8,
                colorBgContainer: '#ffffff',
                colorText: '#333333',
                colorTextSecondary: '#666666',
                colorBorder: '#e0e0e0',
                colorBorderSecondary: '#f0f0f0',
                boxShadow: '0 2px 8px rgba(255, 215, 0, 0.15)',
                boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.1)',
              },
              components: {
                Button: {
                  primaryShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                },
                Card: {
                  boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.1)',
                },
                Input: {
                  activeBorderColor: '#FFD700',
                  hoverBorderColor: '#FFC107',
                },
              },
            }}
          >
            <AuthProvider>
              {children}
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}


