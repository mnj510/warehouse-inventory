import { Suspense } from 'react';
import { ScanPageClient } from '@/components/scan/scan-page-client';

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">로딩 중...</div>}>
      <ScanPageClient />
    </Suspense>
  );
}
