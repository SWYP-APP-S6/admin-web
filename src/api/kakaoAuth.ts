import { request } from "./client";
import type { KakaoLoginResult, UserRole, UserSignupPayload, UserTokenResponse } from "../types";

function rolePath(role: UserRole): string {
	return role === "CONSUMER" ? "consumer" : "owner";
}

export function exchangeKakaoCode(
	role: UserRole,
	code: string,
	redirectUri: string,
): Promise<{ kakaoAccessToken: string }> {
	return request(`/auth/${rolePath(role)}/kakao/exchange`, {
		method: "POST",
		body: { code, redirectUri },
		retryOnUnauthorized: false,
	});
}

export function loginWithKakao(role: UserRole, kakaoAccessToken: string): Promise<KakaoLoginResult> {
	return request(`/auth/${rolePath(role)}/kakao`, {
		method: "POST",
		body: { kakaoAccessToken },
		retryOnUnauthorized: false,
	});
}

export function signupWithKakao(payload: UserSignupPayload): Promise<UserTokenResponse> {
	return request("/auth/signup", {
		method: "POST",
		body: payload,
		retryOnUnauthorized: false,
	});
}
