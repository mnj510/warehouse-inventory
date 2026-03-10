-- 위치 등록을 위해 locations 테이블 INSERT 권한 추가 (기존 DB 사용 시 실행)

DROP POLICY IF EXISTS "Public insert locations" ON public.locations;
CREATE POLICY "Public insert locations"
  ON public.locations FOR INSERT
  WITH CHECK (true);
