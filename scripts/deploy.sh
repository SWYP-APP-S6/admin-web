#!/usr/bin/env bash
# 빌드해서 서버의 정적 루트로 올린다. 정적 파일이라 컨테이너도 재시작도 필요 없다.
#
#   ./scripts/deploy.sh root@api.mangro.cloud
#
# 환경변수:
#   VITE_API_BASE_URL  빌드에 박히는 API 주소 (기본: https://api.mangro.cloud)
#   WEB_ROOT           서버의 배포 경로 (기본: /var/www/admin)
set -euo pipefail

HOST="${1:-}"
if [ -z "$HOST" ]; then
	echo "usage: scripts/deploy.sh <ssh-host>" >&2
	exit 1
fi

API_BASE_URL="${VITE_API_BASE_URL:-https://api.mangro.cloud}"
WEB_ROOT="${WEB_ROOT:-/var/www/admin}"

# 배포본에는 dev 프록시가 없다. 이 값이 비면 요청이 /api 로 나가서 전부 404 가 된다.
echo "==> building (API: $API_BASE_URL)"
VITE_API_BASE_URL="$API_BASE_URL" npm run build

# 디렉터리를 통째로 갈아끼운다. Vite 는 해시가 붙은 파일명을 쓰므로 덮어쓰기만 하면 옛 번들이
# 계속 쌓인다.
echo "==> uploading to $HOST:$WEB_ROOT"
tar -C dist -cz . | ssh "$HOST" "
	set -e
	rm -rf '$WEB_ROOT'
	mkdir -p '$WEB_ROOT'
	tar -C '$WEB_ROOT' -xz
	chown -R www-data:www-data '$WEB_ROOT'
"

echo "==> done"
