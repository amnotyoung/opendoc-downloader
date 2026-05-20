## Extra A — 제목 키워드(`kwd`) 서버 검색 파라미터 추가

### 서버 함수 (`src/lib/search-documents.functions.ts`)

- 입력 스키마 확장: `titleKwd: z.string().max(200).optional()`.
- 쿼리스트링 빌더에서 `titleKwd`가 비어있지 않은 경우에만 `kwd=` 추가. 빈 문자열/`undefined`/공백만 → 보내지 않음(전체 검색 유지).
- 그 외 페이지네이션·결과 파싱·쿠키 jar·워밍업 로직은 변경 없음.

### 검색 화면 (`src/routes/index.tsx`)

- 폼에 "제목 키워드(선택)" 입력 추가. placeholder `"예: 위임전결 / 비워두면 전체"`. 그리드 레이아웃을 `agency / kwd / start / end / button` 으로 재배치 (좁은 뷰포트에서는 1열로 흐름).
- URL 검색 파라미터 스키마에 `kwd?` 추가 → 검색 버튼이 navigate할 때 같이 실어 보내고, 자동 검색(useEffect)에서도 읽어 사용.
- `runSearch()`가 `searchFn({ data: { insttNm, startDate, endDate, titleKwd } })`로 호출. trim 후 빈 문자열이면 omit.
- 결과 표 위에 검색 조건 요약 라인 추가:
  - `기관: {agency} · 기간: {YYYY-MM-DD ~ YYYY-MM-DD} · 키워드: {입력값 또는 "(없음)"} · 총 {n}건`
  - 검색 직후에만 노출 (`hasSearched && !isSearching`). 기존 "검색 결과 N건 · 선택 M건" 텍스트는 요약 라인 아래 보조 정보로 유지.

### DB / 기록

- 스키마 변경 없음. `searches` 테이블에 키워드 저장 안 함.
- localStorage 히스토리(`addHistory`)에도 키워드 미저장 (요청 범위 밖).

### 범위 외

- /history 화면에서 키워드 재실행 UI, Cloud `searches` 테이블에 키워드 컬럼 추가는 다음 단계.
