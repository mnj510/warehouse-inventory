'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

type Location = { id: string; code: string; name: string; description: string | null };

const locationSchema = z.object({
  code: z.string().min(1, '위치 코드를 입력하세요. (예: A1-L)'),
  name: z.string().min(1, '위치 이름을 입력하세요.'),
  description: z.string().optional()
});

type LocationForm = z.infer<typeof locationSchema>;

interface Props {
  initialLocations: Location[];
}

export function LocationsClient({ initialLocations }: Props) {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const searchParams = useSearchParams();

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (searchParams.get('add') === '1') setDialogOpen(true);
  }, [searchParams]);

  const form = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { code: '', name: '', description: '' }
  });

  const onSubmit = async (values: LocationForm) => {
    const { error } = await supabase.from('locations').insert({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description?.trim() || null
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('이미 등록된 위치 코드입니다.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success('위치가 등록되었습니다.');
    setDialogOpen(false);
    form.reset({ code: '', name: '', description: '' });

    const { data } = await supabase
      .from('locations')
      .select('id, code, name, description')
      .order('code');
    if (data) setLocations(data);
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">위치 목록</CardTitle>
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            위치 등록
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {locations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              등록된 위치가 없습니다. SKU 등록 시 수량을 넣으려면 먼저 위치를 등록하세요.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
              {locations.map((loc) => (
                <li
                  key={loc.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold">{loc.code}</p>
                    <p className="text-[11px] text-muted-foreground">{loc.name}</p>
                  </div>
                  {loc.description && (
                    <p className="max-w-[40%] truncate text-[11px] text-muted-foreground">
                      {loc.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>위치 등록</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
          >
            <div className="space-y-1">
              <Label htmlFor="code">위치 코드 *</Label>
              <Input
                id="code"
                placeholder="예: A1-L"
                {...form.register('code')}
              />
              {form.formState.errors.code && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">위치 이름 *</Label>
              <Input
                id="name"
                placeholder="예: 1열 왼쪽"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-[11px] text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                placeholder="선택사항"
                {...form.register('description')}
              />
            </div>
            <Button type="submit" className="mt-1 h-10 w-full">
              등록
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
