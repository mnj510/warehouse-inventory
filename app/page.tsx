import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ScanLine, PackageSearch, MapPinned, Plus } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">
      <header className="mb-2">
        <h1 className="text-xl font-semibold">창고 재고 관리</h1>
        <p className="text-xs text-muted-foreground">
          모바일에서 바로 스캔하고 입고/출고/이동 처리하세요.
        </p>
      </header>

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">검색</CardTitle>
        </CardHeader>
        <CardContent>
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

