-- 1. products 테이블에 barcode 컬럼 추가 (선택, 설정 시 유니크)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS barcode text UNIQUE;

-- 2. audit_log에 '포장' 액션 추가
ALTER TABLE public.audit_log
DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE public.audit_log
ADD CONSTRAINT audit_log_action_check
CHECK (action IN ('입고', '출고', '이동', '수정', '포장'));

-- 3. products update 권한 (수정용)
CREATE POLICY "Public update products"
  ON public.products FOR UPDATE
  USING (true)
  WITH CHECK (true);
