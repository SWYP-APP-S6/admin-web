import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from "../auth/tokens";
import type { ApiResponse, ErrorBody, TokenResponse } from "../types";

// `??` 가 아니라 `||` 다. .env 의 빈 값은 undefined 가 아니라 빈 문자열로 들어와서, `??` 로는
// 폴백이 걸리지 않는다 -- BASE_URL 이 "" 가 되면 모든 요청이 dev 서버 자신에게 가고 404 를
// HTML 로 받는다(에러 envelope 이 아니라 code 도 없다). .env.example 은 처음부터 "비워두면
// /api 로 떨어진다"고 적고 있었으므로, 코드를 그 설명에 맞춘다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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

// 소비자 토큰이 만료됐을 때 무엇을 할지는 앱 화면이 안다(회원이면 갱신, 비회원이면 재발급,
// 둘 다 안 되면 로그인 화면). 여기서 세션 모듈을 import 하면 순환이 되므로 핸들러를 주입받는다.
// 새 토큰을 돌려주면 그 토큰으로 한 번 재시도하고, null 이면 원래의 401 을 그대로 던진다.
type TokenRenewal = () => Promise<string | null>;

let renewOverrideToken: TokenRenewal | null = null;

// 화면 하나가 세 개를 동시에 부르면 401 도 셋이 온다. 각자 갱신하면 비회원 토큰은 하루 발급
// 한도를 한 번에 태우고, 회원 refresh 는 1회용이라 뒤의 둘이 이미 폐기된 토큰으로 실패한다.
// 관리자 refresh 와 같은 이유로 진행 중인 갱신 하나를 공유한다.
let renewalInFlight: Promise<string | null> | null = null;

function renewOnce(): Promise<string | null> {
	if (!renewOverrideToken) {
		return Promise.resolve(null);
	}
	if (!renewalInFlight) {
		renewalInFlight = renewOverrideToken().finally(() => {
			renewalInFlight = null;
		});
	}
	return renewalInFlight;
}

export function setOverrideTokenRenewal(renewal: TokenRenewal | null): void {
	renewOverrideToken = renewal;
}

interface RequestOptions {
	method?: string;
	body?: unknown;
	// 인증 흐름 자체(로그인/갱신)는 401 을 받아도 재시도하지 않는다. 무한 재귀가 된다.
	retryOnUnauthorized?: boolean;
	// 관리자 토큰 대신 쓸 토큰. 소비자 전용 API 를 호출할 때 넘긴다 — 관리자 refresh 로는
	// 되살릴 수 없으므로 위의 renewal 핸들러가 대신 처리한다.
	accessToken?: string;
	// 갱신 후 재시도에서만 켠다. 갱신한 토큰도 401 이면 더 시도하지 않는다.
	renewed?: boolean;
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

	if (response.status === 401 && override && !options.renewed && renewOverrideToken) {
		const renewed = await renewOnce();
		if (renewed) {
			return request<T>(path, { ...options, accessToken: renewed, renewed: true });
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
