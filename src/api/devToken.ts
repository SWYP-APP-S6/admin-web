import { request } from "./client";
import type { UserRole } from "../types";

export interface DevToken {
	userId: number;
	nickname: string;
	role: UserRole;
	accessToken: string;
	expiresInSeconds: number;
}

// 로컬 백엔드에만 열려 있는 엔드포인트다(dev.test-token.enabled). 운영에서는 빈 자체가 없어 404.
export function issueTestToken(role: UserRole): Promise<DevToken> {
	return request<DevToken>(`/dev/test-token?role=${role}`, { method: "POST" });
}
