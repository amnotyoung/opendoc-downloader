-- 원문공개 다운로더 백엔드 스키마.
-- RLS를 처음부터 잠근 상태로 생성: 익명(anon) 키는 insert(append)만 가능,
-- select/update/delete 공개 정책 없음 → 조회는 service_role(대시보드/소유자)만.

create table if not exists public.searches (
  id uuid primary key default gen_random_uuid(),
  instt_nm text not null,
  start_date text not null,
  end_date text not null,
  total_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
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

create index if not exists documents_search_id_idx on public.documents(search_id);

alter table public.searches enable row level security;
alter table public.documents enable row level security;

-- 익명은 추가만 (조회/수정/삭제 정책 없음 = 기본 거부)
create policy "public insert searches"  on public.searches  for insert with check (true);
create policy "public insert documents" on public.documents for insert with check (true);
