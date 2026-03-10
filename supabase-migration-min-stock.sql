-- products 테이블에 min_stock 컬럼 추가 (저재고 알림용)

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 0 CHECK (min_stock >= 0);
