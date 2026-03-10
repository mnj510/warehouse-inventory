'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPinned } from 'lucide-react';
import { getStoredLocation } from '@/lib/location-storage';

export function RecentLocationShortcut() {
  const [location, setLocation] = useState<{ id: string; code: string; name: string } | null>(null);

  useEffect(() => {
    setLocation(getStoredLocation());
  }, []);

  if (!location) return null;

  return (
    <Link href={`/inventory/${encodeURIComponent(location.code)}`} className="w-full">
      <Button variant="outline" className="flex h-12 w-full items-center gap-2 justify-start">
        <MapPinned className="h-4 w-4" />
        <span className="text-xs">
          최근 위치/스캔 (Recent Location/Scan): {location.code} - {location.name}
        </span>
      </Button>
    </Link>
  );
}
