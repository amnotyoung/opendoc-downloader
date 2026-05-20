# 원문공개 문서 일괄 다운로더

정보공개포털([open.go.kr](https://www.open.go.kr))의 **원문공개 문서**를
기관명·기간·제목 키워드로 검색해 한 번에 받을 수 있도록 만든 웹 도구입니다.

- 배포: <https://document-fetcher-helper.lovable.app>
- 원본 CLI: [amnotyoung/opendocdown](https://github.com/amnotyoung/opendocdown)

## 만들게 된 이유

정보공개포털에서 특정 기관의 원문공개 문서를 한꺼번에 받아보려면 페이지를
일일이 넘기며 다운로드해야 합니다. 본인이 이전에 같은 목적으로 만들어 둔
Python CLI(opendocdown)가 있는데, 명령어를 모르는 사람도 쓸 수 있게
**누구나 브라우저에서 쓰는 웹앱**으로 옮긴 것이 이 프로젝트입니다.

행정안전부 AI 전문인재 교육 2차수 과제로 Lovable에서 제작했습니다.

## 화면

- **검색 화면 `/`**: 기관명 / 시작일 / 종료일 / 제목 키워드(선택) 입력 →
  결과를 표로 표시 (제목 · 담당부서 · 생산일자).
- **검색 기록 화면 `/history`**: 과거 검색 목록.

## 백엔드 구성

- **Lovable Cloud DB** (Supabase 기반)
  - `searches` — 검색 조건과 결과 건수 저장
  - `documents` — 검색된 문서 메타데이터 저장
  - RLS: 인증 없이 누구나 read/write (의도된 설정)
- **서버 함수 `search-documents`** (TanStack Start Server Function)
  - open.go.kr 워밍업으로 XSRF-TOKEN 확보 (쿠키 수동 관리)
  - `orginlInfoList.do` 페이지네이션 호출 (rowPage=100)
  - 응답 HTML 내 `var result = {...}` JSON 파싱
  - 제목 키워드는 `kwd` 파라미터로 서버 측에서 필터링

## 구현 범위와 한계

크레딧 한도(1일 5개) 내에서 다음까지 동작합니다:

- ✅ 기관·기간·제목 키워드 검색
- ✅ 검색 결과 DB 저장
- ✅ 검색 결과 표 + 조건 요약 표시
- ⏸ ZIP 일괄 다운로드 — 미구현 (개별 다운로드 로직, JSZip 묶기 등 추가 필요)
- ⏸ 검색 기록 화면을 DB와 연결 — 미구현 (현재는 로컬 저장)

## 기술 스택

React + TanStack Start (Router·Server Functions) · TypeScript · Tailwind ·
shadcn/ui · Supabase (Lovable Cloud)
