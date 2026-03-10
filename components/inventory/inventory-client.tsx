'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/use-debounce';

type Location = { id: string; code: string; name: string };

type InventoryRow = {
  id: string;
  quantity: number;
  lot: string | null;
  updated_at: string;
  product: { id: string; sku: string; name: string } | null;
  location: { id: string; code: string; name: string } | null;
};

interface Props {
  location: Location;
  initialItems: InventoryRow[];
  initialAction?: string;
  initialSku?: string;
}

const inoutSchema = z.object({
  sku: z.string().min(1, 'SKU를 입력하세요.'),
  quantity: z.coerce.number().int().positive('1 이상 입력').max(100000, '수량이 너무 큽니다.'),
  lot: z.string().optional()
});

type InOutForm = z.infer<typeof inoutSchema>;

const moveSchema = inoutSchema.extend({
  toLocationCode: z.string().min(1, '이동할 위치 코드를 입력하세요.')
});

type MoveForm = z.infer<typeof moveSchema>;

export function InventoryClient({ location, initialItems, initialAction, initialSku }: Props) {
  const [items, setItems] = useState<InventoryRow[]>(initialItems);
  const [mode, setMode] = useState<'입고' | '출고' | '이동' | '조회' | null>(
    (initialAction as '입고' | '출고' | '이동' | '조회') ?? null
  );

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const refetch = () => {
      supabase
        .from('inventory')
        .select('id, quantity, lot, updated_at, product:products(id, sku, name), location:locations(id, code, name)')
        .eq('location_id', location.id)
        .order('updated_at', { ascending: false })
        .then((res) => {
          if (res.data)
            setItems(
              res.data.map((row: { product?: unknown; location?: unknown }) => ({
                ...row,
                product: Array.isArray(row.product) ? row.product[0] ?? null : row.product,
                location: Array.isArray(row.location) ? row.location[0] ?? null : row.location
              })) as InventoryRow[]
            );
        });
    };

    try {
      channel = supabase
        .channel('inventory-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory',
            filter: `location_id=eq.${location.id}`
          },
          () => refetch()
        )
        .subscribe();
    } catch {
      /* Realtime 미지원 시 무시 */
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [location.id, supabase]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        (a.product?.sku ?? '').localeCompare(b.product?.sku ?? '')
      ),
    [items]
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            위치 {location.code}{' '}
            <span className="ml-1 text-xs text-muted-foreground">{location.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-12 text-sm" onClick={() => setMode('입고')}>
              입고
            </Button>
            <Button className="h-12 text-sm" variant="outline" onClick={() => setMode('출고')}>
              출고
            </Button>
            <Button className="h-12 text-sm" variant="outline" onClick={() => setMode('이동')}>
              이동
            </Button>
            <Button className="h-12 text-sm" variant="outline" onClick={() => setMode('조회')}>
              상세 조회
            </Button>
          </div>

          {sorted.length === 0 ? (
            <p className="text-xs text-muted-foreground">이 위치에 재고가 없습니다.</p>
          ) : (
            <div className="max-h-[40vh] overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">SKU</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">상품명</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground">수량</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">LOT</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="px-2 py-2 font-mono text-[11px]">{row.product?.sku ?? '-'}</td>
                      <td className="px-2 py-2 font-semibold">{row.product?.name ?? '-'}</td>
                      <td className="px-2 py-2 text-right font-bold">{row.quantity.toLocaleString()}</td>
                      <td className="px-2 py-2 text-muted-foreground">{row.lot ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InOutDialog
        mode={mode}
        onOpenChange={(open) => !open && setMode(null)}
        location={location}
        items={sorted}
        initialSku={initialSku}
        supabase={supabase}
        onUpdated={() => {
          void supabase
            .from('inventory')
            .select(
              'id, quantity, lot, updated_at, product:products(id, sku, name), location:locations(id, code, name)'
            )
            .eq('location_id', location.id)
            .order('updated_at', { ascending: false })
            .then(({ data }) => {
              if (data)
                setItems(
                  data.map((row: { product?: unknown; location?: unknown }) => ({
                    ...row,
                    product: Array.isArray(row.product) ? row.product[0] ?? null : row.product,
                    location: Array.isArray(row.location) ? row.location[0] ?? null : row.location
                  })) as InventoryRow[]
                );
            });
        }}
      />
    </main>
  );
}

interface InOutDialogProps {
  mode: '입고' | '출고' | '이동' | '조회' | null;
  onOpenChange: (open: boolean) => void;
  location: Location;
  items: InventoryRow[];
  initialSku?: string;
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
  onUpdated: () => void;
}

function InOutDialog({ mode, onOpenChange, location, items, initialSku, supabase, onUpdated }: InOutDialogProps) {
  const [skuSearch, setSkuSearch] = useState('');
  const [skuSuggestions, setSkuSuggestions] = useState<{ id: string; sku: string; name: string }[]>([]);
  const debouncedSku = useDebounce(skuSearch, 300);
  const inoutForm = useForm<InOutForm>({
    resolver: zodResolver(inoutSchema),
    defaultValues: { sku: initialSku ?? '', quantity: 1, lot: '' }
  });

  const moveForm = useForm<MoveForm>({
    resolver: zodResolver(moveSchema),
    defaultValues: { sku: initialSku ?? '', quantity: 1, lot: '', toLocationCode: '' }
  });

  const open = mode !== null;

  useEffect(() => {
    if (initialSku && open && mode !== '조회') {
      inoutForm.setValue('sku', initialSku);
      moveForm.setValue('sku', initialSku);
      setSkuSearch(initialSku);
    }
  }, [initialSku, open, mode]);

  useEffect(() => {
    if (debouncedSku.length < 1) {
      setSkuSuggestions([]);
      return;
    }
    supabase
      .from('products')
      .select('id, sku, name')
      .or(`sku.ilike.%${debouncedSku}%,name.ilike.%${debouncedSku}%`)
      .limit(10)
      .then(({ data }) => setSkuSuggestions(data ?? []));
  }, [debouncedSku, supabase]);

  const handleSubmitInOut = async (values: InOutForm) => {
    const { sku, quantity, lot } = values;

    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .maybeSingle();
    if (pErr || !product) {
      toast.error('해당 SKU 상품을 찾을 수 없습니다.');
      return;
    }

    const sign = mode === '출고' ? -1 : 1;

    const { data: existing } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', product.id)
      .eq('location_id', location.id)
      .eq('lot', lot ?? null)
      .maybeSingle();

    const newQuantity = (existing?.quantity ?? 0) + sign * quantity;
    if (newQuantity < 0) {
      toast.error('재고가 부족합니다.');
      return;
    }

    if (existing) {
      await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', existing.id);
    } else {
      await supabase.from('inventory').insert({
        product_id: product.id,
        location_id: location.id,
        quantity: newQuantity,
        lot: lot || null
      });
    }

    await supabase.from('audit_log').insert({
      action: mode,
      product_id: product.id,
      location_from: mode === '출고' ? location.id : null,
      location_to: mode === '입고' ? location.id : null,
      quantity_change: sign * quantity,
      user_id: null
    });

    toast.success(`${mode} 완료`);
    onUpdated();
    onOpenChange(false);
    inoutForm.reset({ sku: '', quantity: 1, lot: '' });
  };

  const handleSubmitMove = async (values: MoveForm) => {
    const { sku, quantity, lot, toLocationCode } = values;

    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .maybeSingle();
    if (pErr || !product) {
      toast.error('해당 SKU 상품을 찾을 수 없습니다.');
      return;
    }

    const { data: toLoc } = await supabase
      .from('locations')
      .select('id')
      .eq('code', toLocationCode)
      .maybeSingle();
    if (!toLoc) {
      toast.error('이동할 위치를 찾을 수 없습니다.');
      return;
    }

    const { data: fromInv } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', product.id)
      .eq('location_id', location.id)
      .eq('lot', lot ?? null)
      .maybeSingle();

    if (!fromInv || fromInv.quantity < quantity) {
      toast.error('이 위치의 재고가 부족합니다.');
      return;
    }

    await supabase
      .from('inventory')
      .update({ quantity: fromInv.quantity - quantity })
      .eq('id', fromInv.id);

    const { data: toInv } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', product.id)
      .eq('location_id', toLoc.id)
      .eq('lot', lot ?? null)
      .maybeSingle();

    if (toInv) {
      await supabase
        .from('inventory')
        .update({ quantity: toInv.quantity + quantity })
        .eq('id', toInv.id);
    } else {
      await supabase.from('inventory').insert({
        product_id: product.id,
        location_id: toLoc.id,
        quantity,
        lot: lot || null
      });
    }

    await supabase.from('audit_log').insert({
      action: '이동',
      product_id: product.id,
      location_from: location.id,
      location_to: toLoc.id,
      quantity_change: quantity,
      user_id: null
    });

    toast.success('이동 완료');
    onUpdated();
    onOpenChange(false);
    moveForm.reset({ sku: '', quantity: 1, lot: '', toLocationCode: '' });
  };

  const isMove = mode === '이동';
  const isView = mode === '조회';
  const [selectedRow, setSelectedRow] = useState<InventoryRow | null>(null);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedRow(null); onOpenChange(o); }}>
      <DialogContent>
        {mode && (
          <>
            <DialogHeader>
              <DialogTitle>{mode}</DialogTitle>
            </DialogHeader>

            {isView ? (
              <div className="space-y-3 max-h-[50vh] overflow-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">재고가 없습니다.</p>
                ) : selectedRow ? (
                  <div className="space-y-2 rounded-lg border border-border p-3 text-xs">
                    <p><span className="text-muted-foreground">SKU:</span> {selectedRow.product?.sku}</p>
                    <p><span className="text-muted-foreground">상품명:</span> {selectedRow.product?.name}</p>
                    <p><span className="text-muted-foreground">수량:</span> {selectedRow.quantity}개</p>
                    <p><span className="text-muted-foreground">LOT:</span> {selectedRow.lot ?? '-'}</p>
                    <p><span className="text-muted-foreground">위치:</span> {location.code}</p>
                    <Button variant="outline" size="sm" onClick={() => setSelectedRow(null)}>목록으로</Button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {items.map((row) => (
                      <li
                        key={row.id}
                        className="flex cursor-pointer items-center justify-between rounded border border-border px-3 py-2 text-xs hover:bg-muted"
                        onClick={() => setSelectedRow(row)}
                      >
                        <span className="font-mono">{row.product?.sku}</span>
                        <span>{row.product?.name}</span>
                        <span className="font-bold">{row.quantity}개</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : !isMove ? (
              <form
                className="space-y-3"
                onSubmit={inoutForm.handleSubmit(handleSubmitInOut)}
              >
                <div className="space-y-1">
                  <Label htmlFor="sku">SKU {mode === '출고' && items.length > 0 && '(아래 선택 가능)'}</Label>
                  {mode === '출고' && items.length > 0 ? (
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...inoutForm.register('sku')}
                    >
                      <option value="">선택...</option>
                      {items.map((row) => (
                        <option key={row.id} value={row.product?.sku ?? ''}>
                          {row.product?.sku} - {row.product?.name} ({row.quantity}개)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <Input
                        id="sku"
                        value={skuSearch || inoutForm.watch('sku')}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSkuSearch(v);
                          inoutForm.setValue('sku', v);
                        }}
                      />
                      {skuSuggestions.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded border border-border bg-background py-1 text-xs">
                          {skuSuggestions.map((p) => (
                            <li
                              key={p.id}
                              className="cursor-pointer px-3 py-2 hover:bg-muted"
                              onClick={() => {
                                inoutForm.setValue('sku', p.sku);
                                setSkuSearch(p.sku);
                                setSkuSuggestions([]);
                              }}
                            >
                              {p.sku} - {p.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {inoutForm.formState.errors.sku && (
                    <p className="text-[11px] text-destructive">
                      {inoutForm.formState.errors.sku.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quantity">수량</Label>
                  <Input
                    id="quantity"
                    type="number"
                    inputMode="numeric"
                    {...inoutForm.register('quantity')}
                  />
                  {inoutForm.formState.errors.quantity && (
                    <p className="text-[11px] text-destructive">
                      {inoutForm.formState.errors.quantity.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lot">LOT (선택)</Label>
                  <Input id="lot" {...inoutForm.register('lot')} />
                </div>
                <Button type="submit" className="mt-1 h-10 w-full text-sm">
                  {mode} 실행
                </Button>
              </form>
            ) : (
              <form
                className="space-y-3"
                onSubmit={moveForm.handleSubmit(handleSubmitMove)}
              >
                <div className="space-y-1">
                  <Label htmlFor="sku-move">SKU</Label>
                  <Input id="sku-move" {...moveForm.register('sku')} />
                  {moveForm.formState.errors.sku && (
                    <p className="text-[11px] text-destructive">
                      {moveForm.formState.errors.sku.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quantity-move">수량</Label>
                  <Input
                    id="quantity-move"
                    type="number"
                    inputMode="numeric"
                    {...moveForm.register('quantity')}
                  />
                  {moveForm.formState.errors.quantity && (
                    <p className="text-[11px] text-destructive">
                      {moveForm.formState.errors.quantity.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lot-move">LOT (선택)</Label>
                  <Input id="lot-move" {...moveForm.register('lot')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="to">이동할 위치 코드</Label>
                  <Input id="to" {...moveForm.register('toLocationCode')} />
                  {moveForm.formState.errors.toLocationCode && (
                    <p className="text-[11px] text-destructive">
                      {moveForm.formState.errors.toLocationCode.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="mt-1 h-10 w-full text-sm">
                  이동 실행
                </Button>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

