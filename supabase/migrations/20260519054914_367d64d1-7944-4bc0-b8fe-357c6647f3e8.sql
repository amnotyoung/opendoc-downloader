create table public.searches (
  id uuid primary key default gen_random_uuid(),
  instt_nm text not null,
  start_date text not null,
  end_date text not null,
  total_count integer not null default 0,
  created_at timestamptz not null default now()
);

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