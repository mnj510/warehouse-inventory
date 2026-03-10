import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ScanLine, PackageSearch, MapPinned, Plus, History } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LowStockSection } from '@/components/home/low-stock-section';

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const { data: inventory } = await supabase
    .from('inventory')
    .select('id, quantity, product:products(id, sku, name, min_stock), location:locations(id, code, name)')
    .gt('quantity', 0);

  const lowStock: { sku: string; name: string; quantity: number; minStock: number; locationCode: string }[] = [];
  for (const row of inventory ?? []) {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    const location = Array.isArray(row.location) ? row.location[0] : row.location;
    const minStock = (product as { min_stock?: number })?.min_stock ?? 0;
    if (minStock > 0 && row.quantity < minStock) {
      lowStock.push({
        sku: (product as { sku: string })?.sku ?? '',
        name: (product as { name: string })?.name ?? '',
        quantity: row.quantity,
        minStock,
        locationCode: (location as { code: string })?.code ?? ''
      });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">
      <header className="mb-2">
        <h1 className="text-xl font-semibold">창고 재고 관리</h1>
        <p className="text-xs text-muted-foreground">
          모바일에서 바로 스캔하고 입고/출고/이동 처리하세요.
        </p>
      </header>

      {lowStock.length > 0 && <LowStockSection items={lowStock} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">빠른 작업</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/scan" className="w-full">
            <Button className="flex h-14 w-full items-center justify-center gap-2 text-base">
              <ScanLine className="h-5 w-5" />
              위치 / 상품 스캔
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Link href="/locations">
              <Button variant="outline" className="flex h-12 w-full items-center gap-2">
                <MapPinned className="h-4 w-4" />
                위치 조회
              </Button>
            </Link>
            <Link href="/locations?add=1">
              <Button variant="outline" className="flex h-12 w-full items-center gap-2">
                <Plus className="h-4 w-4" />
                위치 등록
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="flex h-12 w-full items-center gap-2">
                <PackageSearch className="h-4 w-4" />
                SKU 조회
              </Button>
            </Link>
            <Link href="/products?add=1">
              <Button variant="outline" className="flex h-12 w-full items-center gap-2">
                <Plus className="h-4 w-4" />
                SKU 등록
              </Button>
            </Link>
          </div>
          <Link href="/history">
            <Button variant="outline" className="flex h-12 w-full items-center gap-2">
              <History className="h-4 w-4" />
              이력 조회
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">검색</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/search">
            <Button variant="outline" className="flex h-12 w-full items-center gap-2 justify-start">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                SKU, 상품명, 위치 코드로 검색
              </span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

