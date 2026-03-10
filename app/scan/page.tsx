'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const Html5QrcodeScanner = dynamic(
  () => import('@/components/scan/html5-qrcode-embedded').then((m) => m.Html5QrcodeEmbedded),
  { ssr: false }
);

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const hasCameraError = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (hasCameraError.current) return;
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-sm font-medium">스캔</h1>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-white/30 bg-transparent text-xs text-white"
          onClick={() => setIsScanning((prev) => !prev)}
        >
          {isScanning ? '스캔 종료' : '스캔 시작'}
        </Button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center">
        {isScanning ? (
          <>
            <Html5QrcodeScanner
              onScan={(result) => {
                setLastScanned(result);
                toast.success(`위치 스캔: ${result}`);
                if (navigator.vibrate) {
                  navigator.vibrate(100);
                }
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 900;
                osc.connect(ctx.destination);
                osc.start();
                setTimeout(() => {
                  osc.stop();
                  ctx.close();
                }, 120);

                const encoded = encodeURIComponent(result);
                router.push(`/inventory/${encoded}`);
              }}
              onError={(message) => {
                if (!hasCameraError.current) {
                  hasCameraError.current = true;
                  toast.error('카메라를 사용할 수 없습니다. 권한을 확인하세요.');
                }
                console.error(message);
              }}
              fullscreen
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_40px_rgba(16,185,129,0.7)]" />
            </div>
          </>
        ) : (
          <Card className="mx-4 w-full max-w-md bg-background/80 text-foreground">
            <CardHeader>
              <CardTitle className="text-base">바코드 / QR 스캔</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button
                className="h-14 w-full text-base"
                onClick={() => setIsScanning(true)}
              >
                스캔 시작
              </Button>
              {lastScanned && (
                <p className="text-xs text-muted-foreground">
                  마지막 스캔 값: <span className="font-mono">{lastScanned}</span>
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                먼저 위치 바코드를 스캔하면 해당 위치 재고 화면으로 이동합니다.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

