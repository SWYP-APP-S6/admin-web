import { request } from "./client";

export interface GuestToken {
	accessToken: string;
}

// 비회원 둘러보기. users 행이 없어 찜·알림·프로필에는 닿지 못하고, 서버는 403 LOGIN_REQUIRED 로
// 돌려보낸다 -- 앱은 그 코드를 보고 가입 안내로 분기한다.
export function issueGuestToken(installId: string): Promise<GuestToken> {
	return request<GuestToken>("/auth/guest", {
		method: "POST",
		body: { installId },
		retryOnUnauthorized: false,
	});
}

export function logoutAppUser(refreshToken: string): Promise<void> {
	return request<void>("/auth/logout", {
		method: "POST",
		body: { refreshToken },
		retryOnUnauthorized: false,
	});
}

export interface AppTokens {
	accessToken: string;
	refreshToken: string;
}

// 앱 유저의 refresh 는 1회용으로 회전한다. 실패하면 세션을 끝내고 로그인 화면으로 돌아간다.
export function refreshAppUser(refreshToken: string): Promise<AppTokens> {
	return request<AppTokens>("/auth/refresh", {
		method: "POST",
		body: { refreshToken },
		retryOnUnauthorized: false,
	});
}
