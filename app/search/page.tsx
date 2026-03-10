import { Suspense } from 'react';
import { SearchForm } from '@/components/search/search-form';

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6">
      <Suspense>
        <SearchForm />
      </Suspense>
    </main>
  );
}

