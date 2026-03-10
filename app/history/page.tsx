import { createSupabaseServerClient } from '@/lib/supabase/server';
import { HistoryClient } from '@/components/history/history-client';

export default async function HistoryPage() {
  const supabase = createSupabaseServerClient();
  const { data: logs } = await supabase
    .from('audit_log')
    .select(`
      id, action, quantity_change, created_at, note,
      product:products(id, sku, name),
      location_from_data:locations!location_from(id, code, name),
      location_to_data:locations!location_to(id, code, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  const parsed = (logs ?? []).map((row) => ({
    ...row,
    product: Array.isArray(row.product) ? row.product[0] : row.product,
    location_from_data: Array.isArray(row.location_from_data) ? row.location_from_data[0] : row.location_from_data,
    location_to_data: Array.isArray(row.location_to_data) ? row.location_to_data[0] : row.location_to_data
  }));

  return <HistoryClient initialLogs={parsed} />;
}
