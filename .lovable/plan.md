
# P1 — 화면 골격 빌드 플랜

백엔드 없이 UI/폼만 구성. 공공기관 느낌의 차분한 디자인(중립 그레이 + 진한 네이비 포인트).

## 디자인 토큰 (src/styles.css)
- Primary: 진한 네이비 (oklch 0.32 0.08 255)
- Background: 거의 흰색, Foreground: 진한 슬레이트
- Radius: 0.5rem (차분, 너무 둥글지 않게)
- 본문 폰트: system sans (Pretendard 느낌이면 기본 sans 유지)

## 라우트 구조
- `src/routes/__root.tsx` — 상단 네비게이션 바 추가 (좌측 사이트명 "원문공개 일괄 다운로더", 우측 링크 "검색" / "검색 기록"), `<Outlet />`, QueryClientProvider 유지
- `src/routes/index.tsx` — 검색 화면 (placeholder 제거)
- `src/routes/history.tsx` — 검색 기록 화면 (신규)

## 1) 검색 화면 `/`
컴포넌트 구성:
- 페이지 제목 `<h1>` "원문공개 문서 일괄 다운로더" + 보조 설명
- 검색 폼 카드:
  - 기관명 Input (placeholder "한국국제협력단")
  - 시작일 / 종료일 — shadcn Datepicker (Popover + Calendar, `pointer-events-auto`)
    - 기본값: 시작일 = 오늘 -6개월, 종료일 = 오늘 (date-fns `subMonths`)
  - "검색" Button (primary)
- 결과 영역 카드:
  - 헤더: "선택 항목 ZIP 다운로드" Button(disabled when none selected) + 진행 상태 텍스트 자리 ("대기 중")
  - shadcn Table: 헤더 [체크박스(전체선택) / 제목 / 담당부서 / 생산일자 / 본문파일수]
  - 행: 체크박스 + 데이터
  - 빈 상태: "검색 결과가 없습니다" 안내 (검색 전에는 "검색 조건을 입력하고 검색을 눌러주세요")

상태 (로컬 useState, 백엔드 없음):
- `form` { agency, startDate, endDate }
- `results: Row[]` — 빈 배열 (P1에서는 검색 시 빈 결과만)
- `selectedIds: Set<string>`
- 검색 버튼 클릭 시: 검색 기록을 localStorage에 push, 결과는 빈 배열로 세팅

검색 기록 저장:
- `src/lib/search-history.ts` — localStorage 키 `dl.history`, { id, agency, startDate, endDate, resultCount, searchedAt } 배열
- 기록 화면에서 클릭 → `/?agency=...&from=...&to=...` 로 네비게이션, 인덱스 페이지가 search params 읽어 폼 prefill + 자동 검색

## 2) 검색 기록 화면 `/history`
- 제목 "검색 기록"
- shadcn Table: [기관명 / 기간(YYYY-MM-DD ~ YYYY-MM-DD) / 결과건수 / 검색시각]
- 행 클릭 → `useNavigate`로 `/` + search params 전달
- 비어있을 때: "검색 기록이 없습니다"
- 우측 상단 "전체 삭제" Button (보조)

## 기술 메모
- shadcn 컴포넌트 사용: button, input, label, card, table, checkbox, calendar, popover
- 날짜 포맷: date-fns
- 모든 색상은 semantic token(`bg-background`, `text-foreground`, `bg-primary` 등)으로만 사용
- 각 라우트에 한국어 `head()` 메타 (title/description) 설정
- 백엔드/Cloud는 P1에서 활성화하지 않음

## 산출물
- 수정: `src/styles.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`
- 신규: `src/routes/history.tsx`, `src/lib/search-history.ts`, 필요한 shadcn 컴포넌트(이미 없는 것만)
