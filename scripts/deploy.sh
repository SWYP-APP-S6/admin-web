#!/usr/bin/env bash
# 서버에서 직접 실행하는 배포 스크립트.
#
#   ssh root@<서버>
#   deploy-web
#
# backend 저장소의 scripts/deploy.sh 와 같은 모양이다 — 배포 절차가 둘로 갈리지 않도록
# 서버가 끌어오는(pull) 방향으로 통일한다.
set -euo pipefail

cd "$(dirname "$0")/.."

API_BASE_URL="${VITE_API_BASE_URL:-https://api.mangro.cloud}"
WEB_ROOT="${WEB_ROOT:-/var/www/admin}"

if [ ! -d "$WEB_ROOT" ]; then
	echo "error: $WEB_ROOT 이 없다. root 로 만들고 deploy 소유로 넘겨야 한다:" >&2
	echo "       mkdir -p $WEB_ROOT && chown deploy:deploy $WEB_ROOT" >&2
	exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "==> deploying branch: $BRANCH"
if [ "$BRANCH" != "main" ]; then
	echo "warning: not on main" >&2
fi

echo "==> pulling"
git pull --ff-only

# ci 는 package-lock.json 을 그대로 재현한다(install 과 달리 lock 을 갱신하지 않는다).
echo "==> installing dependencies"
npm ci

# 배포본에는 dev 프록시가 없다. 이 값이 비면 요청이 /api 로 나가 전부 404 가 된다.
echo "==> building (API: $API_BASE_URL)"
VITE_API_BASE_URL="$API_BASE_URL" npm run build

# 내용만 비운다. 디렉터리를 지웠다 만들면 소유권·권한을 매번 다시 맞춰야 한다.
# `:?` 는 변수가 비었을 때 `rm -rf /*` 가 되는 것을 막는다.
echo "==> publishing to $WEB_ROOT"
rm -rf "${WEB_ROOT:?}"/* "${WEB_ROOT:?}"/.[!.]* 2>/dev/null || true
cp -a dist/. "$WEB_ROOT/"

echo "==> done"
