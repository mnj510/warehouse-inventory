import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LocationsClient } from '@/components/locations/locations-client';

export default async function LocationsPage() {
  const supabase = createSupabaseServerClient();
  const { data: locations } = await supabase
    .from('locations')
    .select('id, code, name, description')
    .order('code');

  return <LocationsClient initialLocations={locations ?? []} />;
}
