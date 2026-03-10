-- 기존 DB에 로그인 없이 접근 가능하도록 변경 (이미 스키마를 실행한 경우에만 사용)

-- 1. audit_log.user_id nullable로 변경
alter table public.audit_log alter column user_id drop not null;

-- 2. 기존 RLS 정책 삭제
drop policy if exists "Authenticated can read locations" on public.locations;
drop policy if exists "Authenticated can read products" on public.products;
drop policy if exists "Authenticated can read inventory" on public.inventory;
drop policy if exists "Authenticated can insert inventory" on public.inventory;
drop policy if exists "Authenticated can update inventory" on public.inventory;
drop policy if exists "Authenticated can read audit_log" on public.audit_log;
drop policy if exists "Authenticated can insert audit_log" on public.audit_log;

-- 3. 누구나 접근 가능한 정책 생성
create policy "Public read locations" on public.locations for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read inventory" on public.inventory for select using (true);
create policy "Public insert inventory" on public.inventory for insert with check (true);
create policy "Public update inventory" on public.inventory for update using (true);
create policy "Public read audit_log" on public.audit_log for select using (true);
create policy "Public insert audit_log" on public.audit_log for insert with check (true);
