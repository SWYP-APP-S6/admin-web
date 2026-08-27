# admin-web

프레실리 관리자 대시보드. Vite + React + TypeScript.

백엔드는 [`SWYP-APP-S6/backend`](https://github.com/SWYP-APP-S6/backend) —
운영 API 는 `https://api.mangro.cloud`.

## 로컬 개발

백엔드를 먼저 띄운다(backend 저장소에서 `docker compose --profile app up -d`), 그다음:

```sh
npm install
npm run dev          # http://localhost:5173
```

dev 서버는 `/api/*` 요청을 백엔드로 프록시한다. 브라우저 입장에서는 동일 오리진이라
**개발 중에는 CORS 설정이 필요 없다.** 프록시 대상은 `VITE_PROXY_TARGET` 으로 바꾼다.

로컬 관리자 계정은 backend 저장소의 `db/data/dev_seed_admin.sql` 로 심는다
(`admin@swyp.com` / `swyp-admin-1234`). **운영에는 이 계정을 쓰지 않는다.**

## 배포 빌드

```sh
VITE_API_BASE_URL=https://api.mangro.cloud npm run build   # → dist/
```

정적 파일이라 nginx 가 그대로 서빙한다. 배포본에는 dev 프록시가 없으므로 **API 를 다른
오리진에서 부르게 되고, 백엔드의 `cors.allowed-origins` 에 이 사이트 주소가 들어 있어야 한다.**

## 구조

```
src/
  api/       fetch 래퍼(client) + 도메인별 호출(auth, recipes)
  auth/      토큰 저장소 + 로그인 상태 Context
  hooks/     useAsync — 화면 단위 비동기 로딩
  pages/     로그인 / 레시피 목록 / 레시피 상세
  components/ 공통 레이아웃
```

### 알아둘 것

- **refresh 토큰은 서버에서 1회용으로 회전한다.** 동시에 401 을 받은 요청들이 각자 갱신하면
  하나만 성공하고 나머지는 폐기된 토큰으로 실패해 로그아웃된다. `api/client.ts` 가 진행 중인
  갱신을 하나로 공유해 이 경합을 막는다.
- **토큰은 `localStorage` 에 둔다.** XSS 에 노출되는 선택이지만 관리자 전용 도구이고 access TTL
  이 30분이라 현 단계에서는 이 절충을 받아들였다. 접근이 `auth/tokens.ts` 한 곳에 모여 있으므로
  httpOnly 쿠키로 옮길 때 바꿀 지점은 그 파일과 백엔드 인증 흐름이다.
- 데이터 페칭은 라이브러리 없이 `useAsync` 로 시작한다. 캐싱·중복요청 제거·재검증이 실제로
  필요해지면 그때 도입한다.
