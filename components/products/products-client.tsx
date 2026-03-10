'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';
import Link from 'next/link';

type Product = { id: string; sku: string; name: string; barcode: string | null; category: string | null };
type Location = { id: string; code: string; name: string };

const productSchema = z
  .object({
    sku: z.string().min(1, 'SKU를 입력하세요.'),
    name: z.string().min(1, '상품명을 입력하세요.'),
    barcode: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    quantity: z.coerce.number().int().min(0, '0 이상 입력').default(0),
    locationId: z.string().optional()
  })
  .refine((data) => data.quantity === 0 || data.locationId, {
    message: '수량 입력 시 입고 위치를 선택하세요.',
    path: ['locationId']
  });

type ProductForm = z.infer<typeof productSchema>;

const productEditSchema = z.object({
  sku: z.string().min(1, 'SKU를 입력하세요.'),
  name: z.string().min(1, '상품명을 입력하세요.'),
  barcode: z.string().optional(),
  category: z.string().optional()
});
type ProductEditForm = z.infer<typeof productEditSchema>;

interface Props {
  initialProducts: Product[];
  locations: Location[];
}

export function ProductsClient({ initialProducts, locations }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const searchParams = useSearchParams();

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (searchParams.get('add') === '1') setDialogOpen(true);
  }, [searchParams]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode?.toLowerCase().includes(q) ?? false) ||
        (p.category?.toLowerCase().includes(q) ?? false)
    );
  }, [products, searchQuery]);

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      name: '',
      barcode: '',
      category: '',
      description: '',
      quantity: 0,
      locationId: ''
    }
  });

  const onSubmit = async (values: ProductForm) => {
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({
        sku: values.sku.trim(),
        name: values.name.trim(),
        barcode: values.barcode?.trim() || null,
        category: values.category?.trim() || null,
        description: values.description?.trim() || null
      })
      .select('id')
      .single();

    if (productError) {
      if (productError.code === '23505') {
        const msg = productError.message.includes('barcode')
          ? '이미 등록된 바코드입니다.'
          : '이미 등록된 SKU입니다.';
        toast.error(msg);
      } else {
        toast.error(productError.message);
      }
      return;
    }

    if (values.quantity > 0 && values.locationId && newProduct) {
      const { error: invError } = await supabase.from('inventory').insert({
        product_id: newProduct.id,
        location_id: values.locationId,
        quantity: values.quantity
      });
      if (invError) {
        toast.error('재고 등록 실패: ' + invError.message);
      } else {
        await supabase.from('audit_log').insert({
          action: '입고',
          product_id: newProduct.id,
          location_to: values.locationId,
          quantity_change: values.quantity,
          user_id: null
        });
      }
    }

    toast.success(
      values.quantity > 0
        ? `SKU 등록 완료 (초기 수량 ${values.quantity}개)`
        : 'SKU가 등록되었습니다.'
    );
    setDialogOpen(false);
    form.reset({
      sku: '',
      name: '',
      barcode: '',
      category: '',
      description: '',
      quantity: 0,
      locationId: ''
    });

    const { data } = await supabase
      .from('products')
      .select('id, sku, name, barcode, category')
      .order('sku')
      .limit(2000);
    if (data) setProducts(data);
  };

  const editForm = useForm<ProductEditForm>({
    resolver: zodResolver(productEditSchema),
    defaultValues: { sku: '', name: '', barcode: '', category: '' }
  });

  useEffect(() => {
    if (editProduct) {
      editForm.reset({
        sku: editProduct.sku,
        name: editProduct.name,
        barcode: editProduct.barcode ?? '',
        category: editProduct.category ?? ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProduct]);

  const onSubmitEdit = async (values: ProductEditForm) => {
    if (!editProduct) return;
    const { error } = await supabase
      .from('products')
      .update({
        sku: values.sku.trim(),
        name: values.name.trim(),
        barcode: values.barcode?.trim() || null,
        category: values.category?.trim() || null
      })
      .eq('id', editProduct.id);

    if (error) {
      if (error.code === '23505') {
        toast.error(error.message.includes('barcode') ? '이미 등록된 바코드입니다.' : '이미 등록된 SKU입니다.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success('상품이 수정되었습니다.');
    setEditProduct(null);
    const { data } = await supabase.from('products').select('id, sku, name, barcode, category').order('sku').limit(2000);
    if (data) setProducts(data);
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">상품(SKU) 목록</CardTitle>
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            SKU 등록
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="SKU, 상품명, 카테고리로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10"
          />

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 상품이 없습니다.'}
            </p>
          ) : (
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filtered.map((p) => (
                <li
                  key={p.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"
                  onClick={() => setEditProduct(p)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {p.sku}
                      {p.barcode && (
                        <span className="ml-1 text-[10px]">· {p.barcode}</span>
                      )}
                    </p>
                    <p className="truncate text-xs font-semibold">{p.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {p.category && (
                      <span className="max-w-[60px] truncate text-[11px] text-muted-foreground">
                        {p.category}
                      </span>
                    )}
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SKU 등록</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
          >
            <div className="space-y-1">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                placeholder="예: ABC-001"
                {...form.register('sku')}
              />
              {form.formState.errors.sku && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.sku.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">상품명 *</Label>
              <Input
                id="name"
                placeholder="상품 이름"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="barcode">바코드</Label>
              <Input
                id="barcode"
                placeholder="선택사항 (등록 시 유니크)"
                {...form.register('barcode')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">카테고리</Label>
              <Input
                id="category"
                placeholder="선택사항"
                {...form.register('category')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                placeholder="선택사항"
                {...form.register('description')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity">초기 수량</Label>
              <Input
                id="quantity"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                {...form.register('quantity')}
              />
              {form.formState.errors.quantity && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="locationId">초기 입고 위치</Label>
              <select
                id="locationId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register('locationId')}
              >
                <option value="">
                  {locations.length === 0
                    ? '등록된 위치 없음 (아래에서 먼저 등록)'
                    : '선택사항 (수량 입력 시 필수)'}
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
              {locations.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  수량을 넣으려면 먼저{' '}
                  <Link
                    href="/locations?add=1"
                    className="underline text-primary hover:opacity-80"
                    onClick={() => setDialogOpen(false)}
                  >
                    위치 등록
                  </Link>
                  에서 A1-L 같은 위치를 추가하세요.
                </p>
              )}
              {form.formState.errors.locationId && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.locationId.message}
                </p>
              )}
            </div>
            <Button type="submit" className="mt-1 h-10 w-full">
              등록
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상품 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-sku">SKU *</Label>
              <Input id="edit-sku" {...editForm.register('sku')} />
              {editForm.formState.errors.sku && (
                <p className="text-[11px] text-destructive">{editForm.formState.errors.sku.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-name">상품명 *</Label>
              <Input id="edit-name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-[11px] text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-barcode">바코드</Label>
              <Input id="edit-barcode" placeholder="선택사항" {...editForm.register('barcode')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-category">카테고리</Label>
              <Input id="edit-category" {...editForm.register('category')} />
            </div>
            <Button type="submit" className="mt-1 h-10 w-full">저장</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
