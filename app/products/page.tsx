import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProductsClient } from '@/components/products/products-client';

export default async function ProductsPage() {
  const supabase = createSupabaseServerClient();
  const [{ data: products }, { data: locations }] = await Promise.all([
    supabase
      .from('products')
      .select('id, sku, name, barcode, category')
      .order('sku')
      .limit(2000),
    supabase.from('locations').select('id, code, name').order('code')
  ]);

  return (
    <ProductsClient
      initialProducts={products ?? []}
      locations={locations ?? []}
    />
  );
}
