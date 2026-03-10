'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpFromLine, Truck, Search, Package, Trash2 } from 'lucide-react';

const Html5QrcodeScanner = dynamic(
  () => import('@/components/scan/html5-qrcode-embedded').then((m) => m.Html5QrcodeEmbedded),
  { ssr: false }
);

type ScannedType = 'location' | 'sku' | 'unknown';

type BatchItem = {
  product_id: string;
  sku: string;
  name: string;
  barcode: string | null;
  quantity: number;
  location_id: string | null;
  location_code: string | null;
};

export function ScanPageClient() {
  const searchParams = useSearchParams();
  const isBatchMode = searchParams.get('batch') === '1';

  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [scannedValue, setScannedValue] = useState('');
  const [scannedType, setScannedType] = useState<ScannedType>('unknown');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [defaultLocation, setDefaultLocation] = useState<{ id: string; code: string } | null>(null);
  const [processing, setProcessing] = useState(false);
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

  const lookupByBarcodeOrSku = async (trimmed: string) => {
    const [byBarcode, bySku] = await Promise.all([
      supabase.from('products').select('id, sku, name, barcode').eq('barcode', trimmed).maybeSingle(),
      supabase.from('products').select('id, sku, name, barcode').eq('sku', trimmed).maybeSingle()
    ]);
    return byBarcode.data ?? bySku.data;
  };

  const addToBatch = async (trimmed: string) => {
    const product = await lookupByBarcodeOrSku(trimmed);
    if (!product) {
      toast.error('등록되지 않은 바코드입니다.');
      return;
    }
    const existing = batchItems.find(
      (i) => i.product_id === product.id && i.location_id === defaultLocation?.id
    );
    if (existing) {
      setBatchItems((prev) =>
        prev.map((it) =>
          it === existing ? { ...it, quantity: it.quantity + 1 } : it
        )
      );
    } else {
      setBatchItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          barcode: product.barcode,
          quantity: 1,
          location_id: defaultLocation?.id ?? null,
          location_code: defaultLocation?.code ?? null
        }
      ]);
    }
    toast.success(`${product.name} 추가`);
  };

  const setLocationToBatch = (data: { id: string; code: string }) => {
    setDefaultLocation(data);
    setBatchItems((prev) =>
      prev.map((it) => ({ ...it, location_id: data.id, location_code: data.code }))
    );
    toast.success(`기본 위치: ${data.code}`);
  };

  const handleBatchScan = async (trimmed: string) => {
    const [locRes, prodRes] = await Promise.all([
      supabase.from('locations').select('id, code').eq('code', trimmed).maybeSingle(),
      lookupByBarcodeOrSku(trimmed)
    ]);
    if (locRes.data) {
      setLocationToBatch(locRes.data);
    } else if (prodRes) {
      await addToBatch(trimmed);
    } else {
      toast.error('등록되지 않은 바코드입니다.');
    }
  };

  const detectAndShowDialog = async (trimmed: string) => {
    const [locRes, product] = await Promise.all([
      supabase.from('locations').select('id, code').eq('code', trimmed).maybeSingle(),
      lookupByBarcodeOrSku(trimmed)
    ]);

    const isLocation = locRes.data != null;
    const isSku = product != null;

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
        toast.error('등록되지 않은 바코드입니다.');
      }
    }
  };

  const handleScan = (result: string) => {
    const trimmed = String(result || '').trim();
    if (!trimmed) return;

    setLastScanned(trimmed);
    playSuccessFeedback();

    if (isBatchMode) {
      void handleBatchScan(trimmed);
    } else {
      if (scanHandled.current) return;
      scanHandled.current = true;
      void detectAndShowDialog(trimmed);
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
    if (isBatchMode) {
      void handleBatchScan(trimmed);
    } else {
      void detectAndShowDialog(trimmed);
    }
    setManualInput('');
    scanHandled.current = false;
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

  const updateBatchQuantity = (index: number, delta: number) => {
    setBatchItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
      )
    );
  };

  const removeBatchItem = (index: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== index));
  };

  const processBatch = async (action: '입고' | '출고' | '포장') => {
    if (batchItems.length === 0) {
      toast.error('배치 목록이 비어 있습니다.');
      return;
    }
    if ((action === '출고' || action === '포장') && !defaultLocation) {
      toast.error('출고/포장 시 기본 위치를 먼저 스캔하세요.');
      return;
    }
    setProcessing(true);
    let success = 0;
    let failed = 0;
    try {
      for (const item of batchItems) {
        const locId = item.location_id ?? defaultLocation?.id;
        if ((action === '출고' || action === '포장') && !locId) {
          toast.error(`${item.sku}: 위치 정보가 없습니다.`);
          failed++;
          continue;
        }
        if (action === '입고') {
          const { data: existing } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.product_id)
            .eq('location_id', locId!)
            .maybeSingle();
          const newQty = (existing?.quantity ?? 0) + item.quantity;
          if (existing) {
            await supabase.from('inventory').update({ quantity: newQty }).eq('id', existing.id);
          } else {
            await supabase.from('inventory').insert({
              product_id: item.product_id,
              location_id: locId!,
              quantity: item.quantity
            });
          }
          await supabase.from('audit_log').insert({
            action: '입고',
            product_id: item.product_id,
            location_to: locId,
            quantity_change: item.quantity,
            user_id: null
          });
          success++;
        } else {
          const { data: inv } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.product_id)
            .eq('location_id', locId!)
            .maybeSingle();
          if (!inv || inv.quantity < item.quantity) {
            toast.error(`${item.sku}: 재고 부족 (현재 ${inv?.quantity ?? 0}개)`);
            failed++;
            continue;
          }
          await supabase
            .from('inventory')
            .update({ quantity: inv.quantity - item.quantity })
            .eq('id', inv.id);
          await supabase.from('audit_log').insert({
            action,
            product_id: item.product_id,
            location_from: locId,
            quantity_change: item.quantity,
            user_id: null
          });
          success++;
        }
      }
      setBatchItems([]);
      setDefaultLocation(null);
      toast.success(`${action} 완료: ${success}건${failed > 0 ? `, 실패 ${failed}건` : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    scanHandled.current = false;
  }, [isBatchMode]);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-sm font-medium">
          {isBatchMode ? '배치 스캔' : '스캔'}
        </h1>
        <div className="flex gap-2">
          {isBatchMode && (
            <Link href="/scan">
              <Button variant="outline" size="sm" className="h-8 border-white/30 bg-transparent text-xs text-white">
                단일 모드
              </Button>
            </Link>
          )}
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
      </div>

      <div className="relative flex flex-1 flex-col">
        {isScanning ? (
          <>
            <div className="flex-1">
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
            </div>

            {isBatchMode && (
              <div className="max-h-[40vh] overflow-auto border-t border-white/20 bg-black/90 p-3">
                <p className="mb-2 text-xs text-white/80">
                  기본 위치: {defaultLocation?.code ?? '-'}
                </p>
                {batchItems.length === 0 ? (
                  <p className="py-4 text-center text-xs text-white/60">
                    바코드나 위치 코드를 스캔하세요
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20 hover:bg-transparent">
                          <TableHead className="text-xs text-white/80">상품명</TableHead>
                          <TableHead className="text-xs text-white/80">SKU</TableHead>
                          <TableHead className="text-xs text-white/80">바코드</TableHead>
                          <TableHead className="text-xs text-white/80">수량</TableHead>
                          <TableHead className="text-xs text-white/80">위치</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchItems.map((item, i) => (
                          <TableRow key={`${item.product_id}-${i}`} className="border-white/20">
                            <TableCell className="max-w-[80px] truncate text-xs text-white">
                              {item.name}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-white/90">
                              {item.sku}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-white/70">
                              {item.barcode ?? '-'}
                            </TableCell>
                            <TableCell className="text-xs text-white">
                              <span className="mr-1 inline-flex gap-0.5">
                                <button
                                  type="button"
                                  className="rounded bg-white/20 px-1"
                                  onClick={() => updateBatchQuantity(i, -1)}
                                >
                                  -
                                </button>
                                {item.quantity}
                                <button
                                  type="button"
                                  className="rounded bg-white/20 px-1"
                                  onClick={() => updateBatchQuantity(i, 1)}
                                >
                                  +
                                </button>
                              </span>
                            </TableCell>
                            <TableCell className="text-[11px] text-white/80">
                              {item.location_code ?? '-'}
                            </TableCell>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => removeBatchItem(i)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {batchItems.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      className="h-11 gap-1 text-xs"
                      onClick={() => processBatch('입고')}
                      disabled={processing || !defaultLocation}
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      입고
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 gap-1 border-white/30 bg-white/10 text-xs text-white"
                      onClick={() => processBatch('출고')}
                      disabled={processing}
                    >
                      <ArrowUpFromLine className="h-4 w-4" />
                      출고
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 gap-1 border-white/30 bg-white/10 text-xs text-white"
                      onClick={() => processBatch('포장')}
                      disabled={processing}
                    >
                      <Package className="h-4 w-4" />
                      포장
                    </Button>
                  </div>
                )}
              </div>
            )}
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
              {isBatchMode && (
                <p className="text-xs text-muted-foreground">배치 모드: 여러 상품/위치 스캔 후 일괄 처리</p>
              )}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  placeholder="수동 입력 (위치 또는 바코드)"
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

      {!isBatchMode && (
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <span className="font-mono">{scannedValue}</span> 선택
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-14 gap-2" onClick={() => handleAction('입고')}>
                <ArrowDownToLine className="h-5 w-5" />
                입고
              </Button>
              <Button variant="outline" className="h-14 gap-2" onClick={() => handleAction('출고')}>
                <ArrowUpFromLine className="h-5 w-5" />
                출고
              </Button>
              <Button variant="outline" className="h-14 gap-2" onClick={() => handleAction('이동')}>
                <Truck className="h-5 w-5" />
                이동
              </Button>
              <Button variant="outline" className="h-14 gap-2" onClick={() => handleAction('조회')}>
                <Search className="h-5 w-5" />
                조회
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
