
# P2 — Lovable Cloud 활성화 + DB 테이블

## 1) Lovable Cloud 활성화
`supabase--enable` 호출 → 프로젝트에 백엔드(Postgres + Auth + Storage) 연결, `@/integrations/supabase/client` 자동 생성.

## 2) 마이그레이션으로 테이블 2개 생성

```sql
-- searches
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  instt_nm text not null,
  start_date text not null,   -- YYYYMMDD
  end_date text not null,     -- YYYYMMDD
  total_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches(id) on delete cascade,
  title text,
  dept text,
  doc_date text,
  prdn_dt text,
  prdn_nst_regist_no text,
  file_count integer not null default 0,
  downloaded boolean not null default false,
  created_at timestamptz not null default now()
);

create index documents_search_id_idx on public.documents(search_id);

-- RLS — 사용자 요청대로 익명 포함 누구나 read/write 허용
alter table public.searches enable row level security;
alter table public.documents enable row level security;

create policy "public read searches"   on public.searches  for select using (true);
create policy "public insert searches" on public.searches  for insert with check (true);
create policy "public update searches" on public.searches  for update using (true) with check (true);
create policy "public delete searches" on public.searches  for delete using (true);

create policy "public read documents"   on public.documents for select using (true);
create policy "public insert documents" on public.documents for insert with check (true);
create policy "public update documents" on public.documents for update using (true) with check (true);
create policy "public delete documents" on public.documents for delete using (true);
```

## 3) 보안 안내
사용자가 명시적으로 "로그인 없이 누구나 읽고 쓸 수 있어야 함"을 요청. 이 단계에서는 그대로 진행하되, 누구나 타인의 검색/문서 기록을 수정·삭제할 수 있다는 점을 한 줄로 고지. 추후 단계에서 제약(인증, owner 컬럼, 또는 server-fn 게이트)을 추가하기 쉬운 구조를 유지.

## 4) 이번 단계에서 하지 않는 것
- 프론트엔드 연동(검색 기록을 Cloud로 이전하는 작업)은 다음 단계로 분리. P2는 백엔드 스키마만.

## 산출물
- Cloud 활성화
- 마이그레이션 1건 (위 SQL)
