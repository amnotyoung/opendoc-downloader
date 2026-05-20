## P3 — open.go.kr 원문공개 검색 연동

### 서버 함수 (Edge Function 대신 TanStack server function 사용)

이 프로젝트는 TanStack Start 스택이라 앱 내부 로직은 Supabase Edge Function이 아니라 `createServerFn`을 쓰는 게 기본입니다. 동작/입출력은 요청하신 그대로 구현하되, 파일 위치만 `supabase/functions/search-documents/index.ts` → `src/lib/search-documents.functions.ts`로 바꿉니다. (외부 웹훅이 아니라 우리 앱만 호출하므로 적합합니다.)

**`src/lib/search-documents.functions.ts`** — `searchDocuments({ insttNm, startDate, endDate })`
- 입력 검증: `z.object({ insttNm: string().min(1), startDate: /^\d{8}$/, endDate: /^\d{8}$/ })`
- 쿠키 jar 헬퍼: 매 응답의 `Set-Cookie`를 파싱해서 name=value 맵에 누적, 다음 요청 `Cookie` 헤더로 직렬화. 특히 `XSRF-TOKEN` 보존.
- 공통 헤더: `User-Agent: Mozilla/5.0 ... Chrome/...`
- 워밍업:
  1. `GET https://www.open.go.kr/othicInfo/infoList/orginlInfoList.do`
  2. `POST .../orginlInfoList.ajax` — `X-Requested-With: XMLHttpRequest`, `Referer: .../orginlInfoList.do`, body `viewPage=1&rowPage=10` (form-urlencoded)
- 검색 루프 (viewPage 1부터):
  - `GET .../orginlInfoList.do?searchInsttCdNmPop={insttNm}&insttCdNm={insttNm}&startDate=...&endDate=...&rowPage=100&viewPage={n}&sort=d`
  - HTML에서 `/var\s+result\s*=\s*(\{[\s\S]*?\});/` 추출 후 `JSON.parse`
  - `rtnTotal`, `rtnList` 사용 → 각 항목 매핑:
    - `title = INFO_SJ`
    - `dept  = NFLST_CHRG_DEPT_NM ?? CHRG_DEPT_NM`
    - `doc_date = P_DATE ?? R_DATE`
    - `prdn_dt = PRDCTN_DT`
    - `prdn_nst_regist_no = PRDCTN_INSTT_REGIST_NO`
  - 누적 ≥ rtnTotal 이거나 rtnList 비면 중단. 페이지 사이 300ms 대기. 안전장치로 최대 50페이지.
- try/catch로 감싸 실패 시 `{ items: [], total: 0, error: "..." }` 반환 (앱이 죽지 않게).
- 성공 시 `{ items: Doc[], total: number, error: null }`.

### 검색 화면 연결 (`src/routes/index.tsx`)

- `useServerFn(searchDocuments)` + `useMutation` (또는 단순 async state).
- 검색 버튼 클릭 시:
  1. `isSearching=true`, 버튼 disabled, 우측 상태 텍스트 "검색 중…"
  2. 날짜를 `YYYYMMDD`로 변환해서 서버 함수 호출
  3. 결과 받으면 `supabase.from('searches').insert({ instt_nm, start_date, end_date, total_count }).select().single()`
  4. 받은 `search.id`로 `supabase.from('documents').insert(items.map(... search_id))` (items가 있을 때만)
  5. 화면 표에 items 표시 (`file_count`는 0 표시), 선택 상태 초기화
  6. `error`가 있거나 items 0건이면 표 영역에 안내 문구 "검색 결과가 없거나 일시적으로 가져올 수 없습니다"
- 기존 localStorage `addHistory` 호출은 유지 (UI상 /history와 호환). Cloud의 `searches` 테이블로의 이관은 P4 범위로 남겨둠.

### 기술 메모

- `searchDocuments`는 외부에서 HTML/쿠키를 다루므로 절대 클라이언트에서 직접 호출 불가 — 반드시 서버 함수.
- Cloudflare Worker 런타임에서 `fetch` + `Headers.getSetCookie()` 사용 가능. 없으면 `headers.raw?.()['set-cookie']` 폴백, 최종 폴백으로 `header.get('set-cookie')`를 `,`(쉼표) 안전 분할.
- 반환 DTO는 plain object/array만 (직렬화 안전).
- `searches`/`documents` 테이블은 이미 P2에서 만들어졌고 RLS public이라 anon 키로 insert 가능.

### 범위 외 (다음 단계)

- ZIP 다운로드(P4), file_count 실측, /history 화면을 Cloud `searches`로 전환.
