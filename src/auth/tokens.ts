const ACCESS_KEY = "swyp.admin.accessToken";
const REFRESH_KEY = "swyp.admin.refreshToken";

// localStorage 는 XSS 에 노출된다. 관리자 전용 도구이고 access TTL 이 30분이라 지금은 이 절충을
// 받아들이지만, 외부 사용자가 늘면 httpOnly 쿠키로 옮기는 것을 재검토한다(백엔드 변경 필요).
// 접근을 여기로 모아두면 그때 바꿀 지점이 이 파일 하나로 끝난다.

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
	return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string): void {
	localStorage.setItem(ACCESS_KEY, accessToken);
	localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
	localStorage.removeItem(ACCESS_KEY);
	localStorage.removeItem(REFRESH_KEY);
}
