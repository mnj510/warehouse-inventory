# SKU 등록을 위해 Supabase에서 해야 할 작업

## 1. Supabase 대시보드 접속

1. https://supabase.com 에 로그인
2. 해당 프로젝트 선택

---

## 2. SQL 에디터에서 아래 SQL 실행

왼쪽 메뉴에서 **SQL Editor** 클릭 → **New query** 선택 후, 아래 내용을 복사해 붙여넣고 **Run** 버튼 클릭하세요.

```sql
-- products 테이블에 새 상품(SKU) INSERT 권한 추가

DROP POLICY IF EXISTS "Public insert products" ON public.products;
CREATE POLICY "Public insert products"
  ON public.products FOR INSERT
  WITH CHECK (true);
```

---

## 3. 결과 확인

- 실행이 성공하면 "Success. No rows returned" 같은 메시지가 표시됩니다.
- 이제 앱에서 **SKU 등록** 버튼을 누르고 새 상품을 추가할 수 있습니다.

---

## 4. 왜 필요한가?

- Supabase는 기본적으로 **Row Level Security (RLS)** 가 켜져 있습니다.
- `products` 테이블에는 **조회(SELECT)** 정책만 있어서, 기존에는 읽기만 가능했습니다.
- 위 SQL로 **INSERT** 정책을 추가해야 새 상품(SKU)을 등록할 수 있습니다.
