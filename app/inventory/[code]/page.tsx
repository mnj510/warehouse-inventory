import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InventoryClient } from '@/components/inventory/inventory-client';

interface Props {
  params: { code: string };
}

export default async function InventoryByLocationPage({ params }: Props) {
  const code = decodeURIComponent(params.code);
  const supabase = createSupabaseServerClient();

  const { data: location } = await supabase
    .from('locations')
    .select('id, code, name')
    .eq('code', code)
    .maybeSingle();

  if (!location) {
    notFound();
  }

  const { data: inventory } = await supabase
    .from('inventory')
    .select(
      'id, quantity, lot, updated_at, product:products(id, sku, name), location:locations(id, code, name)'
    )
    .eq('location_id', location.id)
    .order('updated_at', { ascending: false });

  return (
    <InventoryClient
      location={location}
      initialItems={inventory ?? []}
    />
  );
}

