'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type ResultItem =
  | { type: 'product'; id: string; sku: string; name: string }
  | { type: 'location'; id: string; code: string; name: string };

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const [productsRes, locationsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, sku, name')
        .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(50),
      supabase
        .from('locations')
        .select('id, code, name')
        .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(50)
    ]);

    const collected: ResultItem[] = [];
    if (productsRes.data) {
      collected.push(
        ...productsRes.data.map((p) => ({
          type: 'product' as const,
          id: p.id,
          sku: p.sku,
          name: p.name
        }))
      );
    }
    if (locationsRes.data) {
      collected.push(
        ...locationsRes.data.map((l) => ({
          type: 'location' as const,
          id: l.id,
          code: l.code,
          name: l.name
        }))
      );
    }

    setResults(collected);
    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">SKU / 위치 검색</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="SKU, 상품명, 위치 코드"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" className="px-3 text-xs" disabled={loading}>
            {loading ? '검색중' : '검색'}
          </Button>
        </form>

        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground">검색 결과가 여기에 표시됩니다.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {results.map((r) =>
                r.type === 'product' ? (
                  <li
                    key={`${r.type}-${r.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                      <p className="text-xs font-semibold">{r.name}</p>
                    </div>
                    <span className="rounded bg-secondary px-2 py-0.5 text-[10px]">
                      상품
                    </span>
                  </li>
                ) : (
                  <li
                    key={`${r.type}-${r.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold">{r.code}</p>
                      <p className="text-[11px] text-muted-foreground">{r.name}</p>
                    </div>
                    <span className="rounded bg-secondary px-2 py-0.5 text-[10px]">
                      위치
                    </span>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

