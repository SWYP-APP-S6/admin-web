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
