-- products 테이블에 INSERT 권한 추가 (기존 DB 사용 시 실행)

drop policy if exists "Public insert products" on public.products;
create policy "Public insert products"
  on public.products for insert
  with check (true);
