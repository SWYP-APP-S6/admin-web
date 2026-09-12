import { request } from "./client";
import type { Me } from "../types";

// 앱이 스플래시에서 토큰을 검증하는 경로이기도 하다 — 위치 권한 없이 부를 수 있는 첫 조회다.
export function fetchMe(accessToken: string): Promise<Me> {
	return request<Me>("/users/me", { accessToken });
}
