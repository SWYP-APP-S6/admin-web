import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from "../auth/tokens";
import type { ApiResponse, ErrorBody, TokenResponse } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly fieldErrors: Record<string, string> | null;
	readonly retryAt: string | null;

	constructor(
		status: number,
		code: string,
		message: string,
		fieldErrors: Record<string, string> | null = null,
		retryAt: string | null = null,
	) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.fieldErrors = fieldErrors;
		this.retryAt = retryAt;
	}
}

// refresh 토큰은 서버에서 1회용으로 회전한다. 동시에 401 을 받은 요청들이 각자 refresh 하면
// 첫 번째만 성공하고 나머지는 이미 폐기된 토큰을 들고 실패해 로그아웃된다. 진행 중인 갱신을
// 하나로 공유해 그 경합을 없앤다.
let refreshInFlight: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
	if (!refreshInFlight) {
		refreshInFlight = performRefresh().finally(() => {
			refreshInFlight = null;
		});
	}
	return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
	const refreshToken = getRefreshToken();
	if (!refreshToken) {
		return false;
	}
	const response = await fetch(`${BASE_URL}/admin/auth/refresh`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refreshToken }),
	});
	if (!response.ok) {
		clearTokens();
		return false;
	}
	const body = (await response.json()) as ApiResponse<TokenResponse>;
	storeTokens(body.data.accessToken, body.data.refreshToken);
	return true;
}

interface RequestOptions {
	method?: string;
	body?: unknown;
	// 인증 흐름 자체(로그인/갱신)는 401 을 받아도 재시도하지 않는다. 무한 재귀가 된다.
	retryOnUnauthorized?: boolean;
	// 관리자 토큰 대신 쓸 토큰. 소비자 전용 API 를 호출할 때 넘긴다 — 이 경우 401 이 나도
	// 관리자 refresh 로 되살릴 수 없으므로 재시도하지 않는다.
	accessToken?: string;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { method = "GET", body, accessToken: override } = options;
	const retryOnUnauthorized = override ? false : options.retryOnUnauthorized !== false;

	const headers: Record<string, string> = {};
	const accessToken = override ?? getAccessToken();
	if (accessToken) {
		headers.Authorization = `Bearer ${accessToken}`;
	}
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
	}

	const response = await fetch(`${BASE_URL}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});

	if (response.status === 401 && retryOnUnauthorized && getRefreshToken()) {
		const refreshed = await refreshTokens();
		if (refreshed) {
			return request<T>(path, { ...options, retryOnUnauthorized: false });
		}
	}

	const payload: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		const error = payload as ErrorBody | null;
		throw new ApiError(
			response.status,
			error?.code ?? "UNKNOWN",
			error?.message ?? response.statusText,
			error?.fieldErrors ?? null,
			error?.retryAt ?? null,
		);
	}

	return (payload as ApiResponse<T>).data;
}
