'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
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
import { ArrowDownToLine, ArrowUpFromLine, MapPinned, Package, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { getStoredLocation, setStoredLocation, StoredLocation } from '@/lib/location-storage';

const Html5QrcodeScanner = dynamic(
  () => import('@/components/scan/html5-qrcode-embedded').then((m) => m.Html5QrcodeEmbedded),
  { ssr: false }
);

type ScanMode = 'location' | 'product' | null;

type InventoryRow = {
  id: string;
  quantity: number;
  lot: string | null;
  product_id: string;
  product: { sku: string; name: string; barcode: string | null };
};

type BatchItem = {
  product_id: string;
  sku: string;
  name: string;
  barcode: string | null;
  quantity_adjust: number;
  location_id: string | null;
  location_code: string | null;
};

export function ScanPageClient() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') as ScanMode | null;
  const [scanMode, setScanMode] = useState<ScanMode>(initialMode === 'location' || initialMode === 'product' ? initialMode : null);
  const [currentLocation, setCurrentLocation] = useState<StoredLocation | null>(null);
  const [locationProducts, setLocationProducts] = useState<InventoryRow[]>([]);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [changeLocationTarget, setChangeLocationTarget] = useState<{ from: StoredLocation; items: InventoryRow[] } | null>(null);
  const [newLocationScanned, setNewLocationScanned] = useState<StoredLocation | null>(null);
  const [manualInput, setManualInput] = useState('');
  const hasCameraError = useRef(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    setCurrentLocation(getStoredLocation());
  }, []);

  const playSuccessFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(100);
    try {
      const Ctx = (window as Window & { AudioContext?: typeof AudioContext }).AudioContext ||
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
          } catch {}
        }, 120);
      }
    } catch {}
  };

  const lookupLocation = useCallback(async (code: string) => {
    const { data } = await supabase.from('locations').select('id, code, name').eq('code', code.trim()).maybeSingle();
    return data;
  }, [supabase]);

  const lookupProduct = useCallback(async (trimmed: string) => {
    try {
      const bySku = await supabase.from('products').select('id, sku, name').eq('sku', trimmed).maybeSingle();
      if (bySku.data) return { ...bySku.data, barcode: (bySku.data as { barcode?: string }).barcode ?? null };
      const byBarcode = await supabase.from('products').select('id, sku, name').eq('barcode', trimmed).maybeSingle();
      if (byBarcode.error) return null;
      return byBarcode.data ? { ...byBarcode.data, barcode: trimmed } : null;
    } catch {
      return null;
    }
  }, [supabase]);

  const fetchInventoryAtLocation = useCallback(async (locationId: string) => {
    const { data } = await supabase
      .from('inventory')
      .select('id, quantity, lot, product_id, product:products(sku, name, barcode)')
      .eq('location_id', locationId)
      .gt('quantity', 0)
      .order('updated_at', { ascending: false });
    const rows = (data ?? []).map((r: { product?: unknown }) => ({
      ...r,
      product: Array.isArray(r.product) ? r.product[0] : r.product
    })) as InventoryRow[];
    return rows;
  }, [supabase]);

  const handleLocationScanned = useCallback(async (code: string) => {
    const loc = await lookupLocation(code);
    if (!loc) {
      toast.error(t.messages.unknownBarcode);
      return;
    }
    playSuccessFeedback();
    const items = await fetchInventoryAtLocation(loc.id);
    setLocationProducts(items);
    setCurrentLocation(loc);
    setStoredLocation(loc);
    setScanMode(null);
    toast.success(`${loc.code} - ${loc.name}`);
  }, [lookupLocation, fetchInventoryAtLocation]);

  const handleProductScanned = useCallback(async (code: string) => {
    const loc = currentLocation ?? getStoredLocation();
    if (!loc) {
      toast.error(t.messages.noLocationSet);
      return;
    }
    const product = await lookupProduct(code);
    if (!product) {
      toast.error(t.messages.unknownBarcode);
      return;
    }
    playSuccessFeedback();
    const existing = batchItems.find((i) => i.product_id === product.id && i.location_id === loc.id);
    if (existing) {
      setBatchItems((prev) =>
        prev.map((it) => (it === existing ? { ...it, quantity_adjust: it.quantity_adjust + 1 } : it))
      );
    } else {
      setBatchItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          barcode: product.barcode,
          quantity_adjust: 1,
          location_id: loc.id,
          location_code: loc.code
        }
      ]);
    }
    toast.success(`${product.name}`);
  }, [currentLocation, batchItems, lookupProduct]);

  const handleScan = useCallback((result: unknown) => {
    const trimmed = String(result ?? '').trim();
    if (!trimmed) return;

    if (scanMode === 'location') {
      void handleLocationScanned(trimmed);
    } else if (scanMode === 'product') {
      void handleProductScanned(trimmed);
    }
  }, [scanMode, handleLocationScanned, handleProductScanned]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (!trimmed) {
      toast.error(t.messages.enterCode);
      return;
    }
    if (scanMode === 'location') {
      void handleLocationScanned(trimmed);
    } else if (scanMode === 'product') {
      void handleProductScanned(trimmed);
    }
    setManualInput('');
  };

  const startChangeLocation = () => {
    if (!currentLocation || locationProducts.length === 0) return;
    setChangeLocationTarget({ from: currentLocation, items: locationProducts });
    setNewLocationScanned(null);
    setScanMode('location');
  };

  const handleChangeLocationScan = useCallback(async (code: string) => {
    if (!changeLocationTarget) return;
    const loc = await lookupLocation(code);
    if (!loc) {
      toast.error(t.messages.unknownBarcode);
      return;
    }
    playSuccessFeedback();
    setNewLocationScanned(loc);
    setScanMode(null);
  }, [lookupLocation]);

  const confirmLocationChange = async () => {
    if (!changeLocationTarget || !newLocationScanned) return;
    setProcessing(true);
    try {
      for (const item of changeLocationTarget.items) {
        await supabase.from('inventory').update({ location_id: newLocationScanned.id }).eq('id', item.id);
        await supabase.from('audit_log').insert({
          action: '이동',
          product_id: item.product_id,
          location_from: changeLocationTarget.from.id,
          location_to: newLocationScanned.id,
          quantity_change: item.quantity,
          user_id: null
        });
      }
      setCurrentLocation(newLocationScanned);
      setStoredLocation(newLocationScanned);
      setLocationProducts(await fetchInventoryAtLocation(newLocationScanned.id));
      setChangeLocationTarget(null);
      setNewLocationScanned(null);
      toast.success(t.messages.locationUpdated);
    } catch (err) {
      console.error(err);
      toast.error(t.messages.unknownBarcode);
    } finally {
      setProcessing(false);
    }
  };

  const updateBatchQuantity = (index: number, value: number) => {
    setBatchItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity_adjust: value } : it))
    );
  };

  const removeBatchItem = (index: number) => {
    setBatchItems((prev) => prev.filter((_, i) => i !== index));
  };

  const processBatch = async (action: '입고' | '출고' | '포장') => {
    if (batchItems.length === 0) {
      toast.error(t.messages.batchEmpty);
      return;
    }
    const loc = currentLocation ?? getStoredLocation();
    if (!loc) {
      toast.error(t.messages.noLocationSet);
      return;
    }
    if ((action === '출고' || action === '포장') && !loc) {
      toast.error(t.messages.locationRequired);
      return;
    }
    setProcessing(true);
    let success = 0;
    let failed = 0;
    try {
      for (const item of batchItems) {
        const qty = Math.abs(item.quantity_adjust) || 1;
        const locId = item.location_id ?? loc.id;

        if (action === '입고') {
          const amt = Math.max(1, item.quantity_adjust);
          const { data: existing } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.product_id)
            .eq('location_id', locId)
            .maybeSingle();
          const newQty = (existing?.quantity ?? 0) + amt;
          if (existing) {
            await supabase.from('inventory').update({ quantity: newQty }).eq('id', existing.id);
          } else {
            await supabase.from('inventory').insert({
              product_id: item.product_id,
              location_id: locId,
              quantity: amt
            });
          }
          await supabase.from('audit_log').insert({
            action: '입고',
            product_id: item.product_id,
            location_to: locId,
            quantity_change: amt,
            user_id: null
          });
          success++;
        } else {
          const { data: inv } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.product_id)
            .eq('location_id', locId)
            .maybeSingle();
          if (!inv || inv.quantity < qty) {
            toast.error(t.messages.insufficientQty(item.sku, inv?.quantity ?? 0));
            failed++;
            continue;
          }
          await supabase.from('inventory').update({ quantity: inv.quantity - qty }).eq('id', inv.id);
          await supabase.from('audit_log').insert({
            action,
            product_id: item.product_id,
            location_from: locId,
            quantity_change: qty,
            user_id: null
          });
          success++;
        }
      }
      setBatchItems([]);
      toast.success(t.messages.itemsProcessed(success));
    } catch (err) {
      console.error(err);
      toast.error(t.messages.unknownBarcode);
    } finally {
      setProcessing(false);
    }
  };

  const isScanning = scanMode !== null;
  const scanHandler = useMemo(() => {
    if (changeLocationTarget) return handleChangeLocationScan;
    return handleScan;
  }, [changeLocationTarget, handleChangeLocationScan, handleScan]);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-sm font-medium">스캔 (Scan)</h1>
        {isScanning && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-white/30 bg-transparent text-xs text-white"
            onClick={() => {
              setScanMode(null);
              if (changeLocationTarget) setChangeLocationTarget(null);
              setNewLocationScanned(null);
            }}
          >
            {t.scan.stopScan}
          </Button>
        )}
      </div>

      {!isScanning ? (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-3">
            <Button
              className="h-16 w-full gap-2 text-base"
              onClick={() => setScanMode('location')}
            >
              <MapPinned className="h-5 w-5" />
              {t.scan.locationScan}
            </Button>
            <Button
              variant="outline"
              className="h-16 w-full gap-2 border-white/30 bg-white/10 text-base text-white"
              onClick={() => setScanMode('product')}
            >
              <Package className="h-5 w-5" />
              {t.scan.productBarcodeScan}
            </Button>
          </div>

          {currentLocation && (
            <p className="text-xs text-white/70">
              현재 위치 (Current): {currentLocation.code} - {currentLocation.name}
            </p>
          )}

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder={t.scan.manualInput}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 border-white/30 bg-white/5 text-white"
            />
            <Button type="submit" variant="outline" className="shrink-0 border-white/30 text-white">
              입력
            </Button>
          </form>

          {locationProducts.length > 0 && !changeLocationTarget && (
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm text-white">
                  {currentLocation?.code} - {t.table.location}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-xs text-white/80">{t.table.productName}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.sku}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.barcode}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.quantity}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.lot}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationProducts.map((row) => (
                        <TableRow key={row.id} className="border-white/20">
                          <TableCell className="text-xs text-white">{row.product?.name}</TableCell>
                          <TableCell className="font-mono text-[11px] text-white/90">{row.product?.sku}</TableCell>
                          <TableCell className="font-mono text-[11px] text-white/70">{row.product?.barcode ?? '-'}</TableCell>
                          <TableCell className="text-xs text-white">{row.quantity}</TableCell>
                          <TableCell className="text-[11px] text-white/70">{row.lot ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-white/30 bg-white/10 text-white"
                  onClick={startChangeLocation}
                >
                  {t.scan.changeLocation}
                </Button>
              </CardContent>
            </Card>
          )}

          {batchItems.length > 0 && (
            <Card className="border-white/20 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm text-white">배치 목록 (Batch List)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-xs text-white/80">{t.table.productName}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.sku}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.barcode}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.quantityChange}</TableHead>
                        <TableHead className="text-xs text-white/80">{t.table.location}</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchItems.map((item, i) => (
                        <TableRow key={`${item.product_id}-${i}`} className="border-white/20">
                          <TableCell className="max-w-[80px] truncate text-xs text-white">{item.name}</TableCell>
                          <TableCell className="font-mono text-[11px] text-white/90">{item.sku}</TableCell>
                          <TableCell className="font-mono text-[11px] text-white/70">{item.barcode ?? '-'}</TableCell>
                          <TableCell className="text-xs text-white">
                            <Input
                              type="number"
                              value={item.quantity_adjust}
                              onChange={(e) => updateBatchQuantity(i, parseInt(e.target.value, 10) || 0)}
                              className="h-8 w-16 border-white/30 bg-white/5 text-white"
                            />
                          </TableCell>
                          <TableCell className="text-[11px] text-white/80">{item.location_code ?? '-'}</TableCell>
                          <TableCell>
                            <button type="button" onClick={() => removeBatchItem(i)} className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    className="h-11 gap-1 text-xs"
                    onClick={() => processBatch('입고')}
                    disabled={processing || !(currentLocation ?? getStoredLocation())}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    {t.actions.stockIn}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 gap-1 border-white/30 bg-white/10 text-xs text-white"
                    onClick={() => processBatch('출고')}
                    disabled={processing}
                  >
                    <ArrowUpFromLine className="h-4 w-4" />
                    {t.actions.stockOut}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 gap-1 border-white/30 bg-white/10 text-xs text-white"
                    onClick={() => processBatch('포장')}
                    disabled={processing}
                  >
                    <Package className="h-4 w-4" />
                    {t.actions.pack}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col">
          <Html5QrcodeScanner
            onScan={(r) => {
              const trimmed = String(r ?? '').trim();
              if (!trimmed) return;
              if (changeLocationTarget) {
                void handleChangeLocationScan(trimmed);
              } else {
                handleScan(r);
              }
            }}
            onError={(msg) => {
              if (!hasCameraError.current) {
                hasCameraError.current = true;
                toast.error(t.messages.cameraError);
              }
              console.error(msg);
            }}
            fullscreen
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_40px_rgba(16,185,129,0.7)]" />
          </div>
          <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/70">
            {scanMode === 'location' ? t.scan.scanLocation : t.scan.scanProduct}
          </p>
        </div>
      )}

      <Dialog
        open={!!changeLocationTarget && !!newLocationScanned}
        onOpenChange={(o) => {
          if (!o) {
            setNewLocationScanned(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newLocationScanned ? t.messages.moveConfirm(newLocationScanned.code) : ''}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNewLocationScanned(null)}>취소 (Cancel)</Button>
            <Button onClick={confirmLocationChange} disabled={processing}>{t.scan.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
