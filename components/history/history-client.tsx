'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { History } from 'lucide-react';

type AuditLogRow = {
  id: string;
  action: string;
  quantity_change: number;
  created_at: string;
  note: string | null;
  product: { id: string; sku: string; name: string } | null;
  location_from_data: { id: string; code: string; name: string } | null;
  location_to_data: { id: string; code: string; name: string } | null;
};

interface Props {
  initialLogs: AuditLogRow[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function HistoryClient({ initialLogs }: Props) {
  const [skuFilter, setSkuFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return initialLogs.filter((log) => {
      const sku = skuFilter.trim().toLowerCase();
      const loc = locationFilter.trim().toLowerCase();
      const product = log.product as { sku?: string; name?: string } | null;
      const prodSku = product?.sku?.toLowerCase() ?? '';
      const prodName = product?.name?.toLowerCase() ?? '';
      const locFrom = log.location_from_data as { code?: string; name?: string } | null;
      const locTo = log.location_to_data as { code?: string; name?: string } | null;
      const locFromCode = locFrom?.code?.toLowerCase() ?? '';
      const locFromName = locFrom?.name?.toLowerCase() ?? '';
      const locToCode = locTo?.code?.toLowerCase() ?? '';
      const locToName = locTo?.name?.toLowerCase() ?? '';

      if (sku && !prodSku.includes(sku) && !prodName.includes(sku)) return false;
      if (loc && !locFromCode.includes(loc) && !locFromName.includes(loc) && !locToCode.includes(loc) && !locToName.includes(loc))
        return false;

      const logDate = new Date(log.created_at);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (logDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (logDate > to) return false;
      }
      return true;
    });
  }, [initialLogs, skuFilter, locationFilter, dateFrom, dateTo]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">
      <header className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">이력 조회</h1>
          <p className="text-xs text-muted-foreground">
            입고/출고/이동 기록
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">홈</Button>
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">SKU / 상품명</Label>
            <Input
              placeholder="SKU 또는 상품명"
              value={skuFilter}
              onChange={(e) => setSkuFilter(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">위치 코드</Label>
            <Input
              placeholder="위치 코드"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">시작일</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">종료일</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            타임라인 ({filtered.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">표시할 기록이 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">시간</TableHead>
                  <TableHead className="text-xs">액션</TableHead>
                  <TableHead className="text-xs">SKU</TableHead>
                  <TableHead className="text-xs">수량</TableHead>
                  <TableHead className="text-xs">위치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const product = log.product as { sku?: string; name?: string } | null;
                  const locFrom = log.location_from_data as { code?: string } | null;
                  const locTo = log.location_to_data as { code?: string } | null;
                  const locStr =
                    log.action === '이동' && locFrom && locTo
                      ? `${locFrom.code} → ${locTo.code}`
                      : locFrom?.code ?? locTo?.code ?? '-';
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{log.action}</TableCell>
                      <TableCell className="text-xs">
                        <Link
                          href={`/products?sku=${encodeURIComponent(product?.sku ?? '')}`}
                          className="text-primary hover:underline"
                        >
                          {product?.sku ?? '-'}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[80px]" title={locStr}>
                        {locStr}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
