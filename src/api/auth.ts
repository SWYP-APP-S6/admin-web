import { clearTokens, getRefreshToken, storeTokens } from "../auth/tokens";
import { request } from "./client";
import type { TokenResponse } from "../types";

export async function login(email: string, password: string): Promise<void> {
	const tokens = await request<TokenResponse>("/admin/auth/login", {
		method: "POST",
		body: { email, password },
		retryOnUnauthorized: false,
	});
	storeTokens(tokens.accessToken, tokens.refreshToken);
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
	return request<void>("/admin/auth/password", {
		method: "PUT",
		body: { currentPassword, newPassword },
	});
}

export async function logout(): Promise<void> {
	const refreshToken = getRefreshToken();
	if (refreshToken) {
		// 서버 폐기가 실패해도 로컬 세션은 반드시 끝낸다. 남겨두면 로그아웃한 줄 알고 자리를 뜬다.
		await request<void>("/admin/auth/logout", {
			method: "POST",
			body: { refreshToken },
			retryOnUnauthorized: false,
		}).catch(() => undefined);
	}
	clearTokens();
}
