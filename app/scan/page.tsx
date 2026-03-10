'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpFromLine, Truck, Search } from 'lucide-react';

const Html5QrcodeScanner = dynamic(
  () => import('@/components/scan/html5-qrcode-embedded').then((m) => m.Html5QrcodeEmbedded),
  { ssr: false }
);

type ScannedType = 'location' | 'sku' | 'unknown';

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [scannedValue, setScannedValue] = useState('');
  const [scannedType, setScannedType] = useState<ScannedType>('unknown');
  const hasCameraError = useRef(false);
  const scanHandled = useRef(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const playSuccessFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(100);
    try {
      const Ctx =
        (window as Window & { AudioContext?: typeof AudioContext }).AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 900;
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => {
          try {
            osc.stop();
            ctx.close();
          } catch {
            /* ignore */
          }
        }, 120);
      }
    } catch {
      /* ignore */
    }
  };

  const detectAndShowDialog = async (trimmed: string) => {
    const [locRes, prodRes] = await Promise.all([
      supabase.from('locations').select('id, code').eq('code', trimmed).maybeSingle(),
      supabase.from('products').select('id, sku').eq('sku', trimmed).maybeSingle()
    ]);

    const isLocation = locRes.data != null;
    const isSku = prodRes.data != null;

    if (isLocation) {
      setScannedType('location');
      setScannedValue(trimmed);
      setActionDialogOpen(true);
      toast.success(`위치 인식: ${trimmed}`);
    } else if (isSku) {
      setScannedType('sku');
      setScannedValue(trimmed);
      setActionDialogOpen(true);
      toast.success(`SKU 인식: ${trimmed}`);
    } else {
      const maybeLoc = /^[A-Za-z]\d/.test(trimmed) || trimmed.length <= 10;
      if (maybeLoc) {
        setScannedType('location');
        setScannedValue(trimmed);
        setActionDialogOpen(true);
        toast.success(`코드 인식: ${trimmed}`);
      } else {
        toast.error('등록되지 않은 코드입니다. 위치 또는 SKU를 먼저 등록하세요.');
      }
    }
  };

  const handleScan = (result: string) => {
    if (scanHandled.current) return;
    scanHandled.current = true;
    try {
      const trimmed = String(result || '').trim();
      if (!trimmed) {
        scanHandled.current = false;
        return;
      }
      setLastScanned(trimmed);
      playSuccessFeedback();
      void detectAndShowDialog(trimmed);
    } catch (err) {
      console.error(err);
      toast.error('스캔 처리 중 오류가 발생했습니다.');
      scanHandled.current = false;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (!trimmed) {
      toast.error('코드를 입력하세요.');
      return;
    }
    setLastScanned(trimmed);
    void detectAndShowDialog(trimmed);
    setManualInput('');
  };

  const handleAction = (action: '입고' | '출고' | '이동' | '조회') => {
    setActionDialogOpen(false);
    scanHandled.current = false;

    if (scannedType === 'location' || (scannedType === 'unknown' && /^[A-Za-z]/.test(scannedValue))) {
      const code = encodeURIComponent(scannedValue);
      if (action === '조회') {
        router.push(`/inventory/${code}`);
      } else {
        router.push(`/inventory/${code}?action=${action}`);
      }
    } else {
      if (action === '조회') {
        router.push(`/search?q=${encodeURIComponent(scannedValue)}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(scannedValue)}&action=${action}`);
      }
    }
  };

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
          onClick={() => {
            scanHandled.current = false;
            setIsScanning((prev) => !prev);
          }}
        >
          {isScanning ? '스캔 종료' : '스캔 시작'}
        </Button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center">
        {isScanning ? (
          <>
            <Html5QrcodeScanner
              onScan={handleScan}
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

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  placeholder="수동 입력 (위치 또는 SKU)"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="outline" className="shrink-0">
                  입력
                </Button>
              </form>

              {lastScanned && (
                <p className="text-xs text-muted-foreground">
                  마지막: <span className="font-mono">{lastScanned}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span className="font-mono">{scannedValue}</span> 선택
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-14 gap-2"
              onClick={() => handleAction('입고')}
            >
              <ArrowDownToLine className="h-5 w-5" />
              입고
            </Button>
            <Button
              variant="outline"
              className="h-14 gap-2"
              onClick={() => handleAction('출고')}
            >
              <ArrowUpFromLine className="h-5 w-5" />
              출고
            </Button>
            <Button
              variant="outline"
              className="h-14 gap-2"
              onClick={() => handleAction('이동')}
            >
              <Truck className="h-5 w-5" />
              이동
            </Button>
            <Button
              variant="outline"
              className="h-14 gap-2"
              onClick={() => handleAction('조회')}
            >
              <Search className="h-5 w-5" />
              조회
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
