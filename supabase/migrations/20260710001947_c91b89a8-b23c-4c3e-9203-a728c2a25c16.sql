-- 검색 기록(searches/documents)을 소유자만 볼 수 있도록 RLS 잠금.
--
-- 변경 전: 익명(anon) 키로 read/insert/update/delete 전부 허용 → 앱 URL만 알면
--          누구나 REST API로 검색 기록을 통째로 조회/삭제 가능했음.
-- 변경 후: 익명 키는 "추가(insert)"만 가능. read/update/delete 공개 정책 제거.
--          RLS 기본값이 거부이므로, 남은 조회 경로는 RLS를 우회하는
--          service_role(= Supabase 대시보드/서버) 뿐 → 사실상 프로젝트 소유자 전용.
--
-- 앱 동작: index.tsx 는 검색 시 searches/documents 를 insert 만 하고
--          되읽기(select)·수정(update)에 의존하지 않도록 함께 변경됨.

-- searches: 읽기/수정/삭제 공개 정책 제거 (insert 는 유지)
drop policy if exists "public read searches"   on public.searches;
drop policy if exists "public update searches" on public.searches;
drop policy if exists "public delete searches" on public.searches;

-- documents: 읽기/수정/삭제 공개 정책 제거 (insert 는 유지)
drop policy if exists "public read documents"   on public.documents;
drop policy if exists "public update documents" on public.documents;
drop policy if exists "public delete documents" on public.documents;
