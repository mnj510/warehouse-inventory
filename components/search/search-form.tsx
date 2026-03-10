'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useDebounce } from '@/lib/use-debounce';

type ResultItem =
  | { type: 'product'; id: string; sku: string; name: string }
  | { type: 'location'; id: string; code: string; name: string };

export function SearchForm() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const actionParam = searchParams.get('action') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    setQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    Promise.all([
      supabase
        .from('products')
        .select('id, sku, name')
        .or(`sku.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`)
        .limit(50),
      supabase
        .from('locations')
        .select('id, code, name')
        .or(`code.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`)
        .limit(50)
    ]).then(([productsRes, locationsRes]) => {
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
    });
  }, [debouncedQuery, supabase]);

  const getLocationHref = (code: string) => {
    if (actionParam && initialQ) {
      return `/inventory/${encodeURIComponent(code)}?action=${actionParam}&sku=${encodeURIComponent(initialQ)}`;
    }
    return `/inventory/${encodeURIComponent(code)}`;
  };

  const getProductHref = (sku: string) => {
    if (actionParam) {
      return `/search?q=${encodeURIComponent(sku)}&action=${actionParam}`;
    }
    return `/search?q=${encodeURIComponent(sku)}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">SKU / 위치 검색</CardTitle>
        {actionParam && initialQ && (
          <p className="text-xs text-muted-foreground">
            {actionParam}할 위치를 선택하세요 (SKU: {initialQ})
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="SKU, 상품명, 위치 코드"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10"
        />

        <div className="space-y-2">
          {loading ? (
            <p className="text-xs text-muted-foreground">검색 중...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {query.trim() ? '검색 결과가 없습니다.' : '검색어를 입력하세요.'}
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {results.map((r) =>
                r.type === 'product' ? (
                  <Link key={`${r.type}-${r.id}`} href={getProductHref(r.sku)}>
                    <li className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted">
                      <div>
                        <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                        <p className="text-xs font-semibold">{r.name}</p>
                      </div>
                      <span className="rounded bg-secondary px-2 py-0.5 text-[10px]">상품</span>
                    </li>
                  </Link>
                ) : (
                  <Link key={`${r.type}-${r.id}`} href={getLocationHref(r.code)}>
                    <li className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted">
                      <div>
                        <p className="font-semibold">{r.code}</p>
                        <p className="text-[11px] text-muted-foreground">{r.name}</p>
                      </div>
                      <span className="rounded bg-secondary px-2 py-0.5 text-[10px]">위치</span>
                    </li>
                  </Link>
                )
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
