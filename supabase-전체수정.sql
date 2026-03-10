-- 로그인 없이 사용 + SKU 등록 가능하도록 전체 수정
-- Supabase SQL Editor에서 이 파일 내용 전체 복사 → 붙여넣기 → Run 실행

-- 1. audit_log.user_id를 nullable로 변경 (비로그인 시 null 저장)
ALTER TABLE public.audit_log ALTER COLUMN user_id DROP NOT NULL;

-- 2. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Authenticated can read locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated can insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated can read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated can insert audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Public insert products" ON public.products;

-- 3. 누구나 접근 가능한 새 정책 생성
CREATE POLICY "Public read locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Public insert inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update inventory" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Public read audit_log" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Public insert audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);
