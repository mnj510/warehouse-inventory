'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

type LowStockItem = {
  sku: string;
  name: string;
  quantity: number;
  minStock: number;
  locationCode: string;
};

export function LowStockSection({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          저장량 부족 ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <ul className="space-y-1 text-xs">
          {items.slice(0, 5).map((item, i) => (
            <li key={i}>
              <Link
                href={`/inventory/${encodeURIComponent(item.locationCode)}`}
                className="flex items-center justify-between rounded border border-border px-2 py-1.5 hover:bg-muted"
              >
                <span className="font-mono">{item.sku}</span>
                <span className="text-destructive font-bold">
                  {item.quantity}/{item.minStock}
                </span>
              </Link>
              <p className="ml-2 text-[11px] text-muted-foreground">{item.name}</p>
            </li>
          ))}
        </ul>
        {items.length > 5 && (
          <p className="pt-1 text-[11px] text-muted-foreground">
            외 {items.length - 5}건
          </p>
        )}
      </CardContent>
    </Card>
  );
}
