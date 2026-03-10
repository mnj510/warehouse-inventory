import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { RegisterSW } from './(pwa)/register-sw';

export const metadata: Metadata = {
  title: '창고 재고 관리',
  description: '모바일 PWA 창고 재고 관리 시스템'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#020817" />
      </head>
      <body className="h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col">
          {children}
        </div>
        <Toaster />
        <RegisterSW />
      </body>
    </html>
  );
}

