# 원문공개 문서 일괄 다운로더

정보공개포털([open.go.kr](https://www.open.go.kr))의 **원문공개 문서**를
기관명·기간·제목 키워드로 검색하고, 선택한 문서의 본문 파일을 ZIP으로
묶어 내려받는 웹 도구입니다.

- 배포: <https://document-fetcher-helper.lovable.app>
- 원본 CLI: [amnotyoung/opendocdown](https://github.com/amnotyoung/opendocdown)

## 만들게 된 이유

정보공개포털에서 특정 기관의 원문공개 문서를 한꺼번에 받아보려면 페이지를
일일이 넘기며 문서를 확인하고 다운로드해야 합니다. 같은 목적으로 만들어 둔
Python CLI(opendocdown)를 명령어에 익숙하지 않은 사람도 쓸 수 있도록
**브라우저에서 쓰는 웹앱**으로 옮긴 프로젝트입니다.

## 주요 기능

- 기관명, 기간, 제목 키워드(선택)로 원문공개 문서 검색
- 검색 결과 표 표시
  - 제목
  - 담당부서
  - 생산일자
  - 다운로드 후 확인된 본문 파일 수
- 검색 조건과 결과 메타데이터를 Supabase DB에 저장
- 검색 기록 화면에서 과거 검색 조건을 다시 실행
- 검색 결과에서 원하는 문서를 선택해 ZIP으로 일괄 다운로드
- 다운로드 성공 문서는 `documents.downloaded` 값으로 best-effort 표시

## 화면

- **검색 화면 `/`**
  - 기관명 / 시작일 / 종료일 / 제목 키워드 입력
  - 검색 결과 확인
  - 문서 선택 후 `선택 항목 ZIP 다운로드`
- **검색 기록 화면 `/history`**
  - Supabase에 저장된 최근 검색 기록 확인
  - 기록 행을 클릭해 동일 조건으로 재검색

## 백엔드 구성

- **Lovable Cloud DB** (Supabase 기반)
  - `searches` — 검색 조건과 결과 건수 저장
  - `documents` — 검색된 문서 메타데이터와 다운로드 여부 저장
  - RLS: 인증 없이 누구나 read/write (의도된 설정)
- **서버 함수 `searchDocuments`**
  - `open.go.kr` 목록 페이지 워밍업과 쿠키 수동 관리
  - `orginlInfoList.do` 페이지네이션 호출 (`rowPage=100`, 최대 50페이지)
  - 응답 HTML 안의 `var result = {...}` JSON 파싱
  - 제목 키워드는 `kwd` 파라미터로 서버 측 필터링
- **서버 함수 `downloadDocument`**
  - 선택 문서를 최대 30건씩 배치 처리
  - 배치마다 1회 워밍업 후 쿠키 jar 유지
  - 상세 페이지에서 본문 파일 목록 확인
  - 파일 요청/다운로드 API를 호출해 본문 파일을 base64로 반환
  - 클라이언트에서 JSZip으로 ZIP 생성

## 로컬 실행

```bash
npm install
npm run dev
```

Supabase 연결을 위해 환경 변수가 필요합니다.

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
```

## 빌드

```bash
npm run build
npm run preview
```

## 구현 범위와 한계

현재 구현된 범위:

- 기관·기간·제목 키워드 검색
- 검색 결과 DB 저장
- 검색 기록 화면 DB 연결
- 선택 문서 ZIP 일괄 다운로드
- 다운로드 진행 상태와 본문 파일 수 표시

알려진 한계:

- 정보공개포털 HTML/내부 API 구조가 바뀌면 파싱 또는 다운로드가 실패할 수 있습니다.
- 검색은 최대 50페이지까지 조회합니다.
- 다운로드는 서버리스 응답 시간 보호를 위해 30건 단위로 나누어 처리합니다.
- 본문 파일만 ZIP에 포함합니다.
- 다운로드 여부 업데이트는 실패해도 사용자 다운로드를 막지 않는 best-effort 처리입니다.

## 기술 스택

React 19 · TanStack Start/Router/Server Functions · TypeScript · Tailwind CSS ·
shadcn/ui · Supabase (Lovable Cloud) · JSZip
