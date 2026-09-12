import type { UserRole } from "../types";

const ACCESS_KEY = "swyp.consumer.accessToken";
const REFRESH_KEY = "swyp.consumer.refreshToken";
const KIND_KEY = "swyp.consumer.kind";
const INSTALL_KEY = "swyp.consumer.installId";

/** 비회원과 회원은 서버에서 realm 이 다르다 -- 화면이 어느 쪽인지 알아야 탭을 막을 수 있다. */
export type Session =
	| { kind: "none" }
	| { kind: "guest"; accessToken: string }
	| { kind: "user"; accessToken: string; refreshToken: string | null; via: "kakao" | "dev" };

export function loadSession(): Session {
	const accessToken = localStorage.getItem(ACCESS_KEY);
	const kind = localStorage.getItem(KIND_KEY);
	if (!accessToken || !kind) {
		return { kind: "none" };
	}
	if (kind === "guest") {
		return { kind: "guest", accessToken };
	}
	return {
		kind: "user",
		accessToken,
		refreshToken: localStorage.getItem(REFRESH_KEY),
		via: kind === "dev" ? "dev" : "kakao",
	};
}

export function saveSession(session: Session): void {
	if (session.kind === "none") {
		localStorage.removeItem(ACCESS_KEY);
		localStorage.removeItem(REFRESH_KEY);
		localStorage.removeItem(KIND_KEY);
		return;
	}
	localStorage.setItem(ACCESS_KEY, session.accessToken);
	if (session.kind === "guest") {
		localStorage.setItem(KIND_KEY, "guest");
		localStorage.removeItem(REFRESH_KEY);
		return;
	}
	localStorage.setItem(KIND_KEY, session.via);
	if (session.refreshToken) {
		localStorage.setItem(REFRESH_KEY, session.refreshToken);
	} else {
		localStorage.removeItem(REFRESH_KEY);
	}
}

// 비회원 토큰은 installId 당 하루 발급 한도가 있다(auth.guest-issue-limit-per-day). 새로고침마다
// 새 id 를 만들면 한도를 스스로 태우므로 이 브라우저의 id 를 한 번만 만들어 재사용한다.
export function installId(): string {
	const existing = localStorage.getItem(INSTALL_KEY);
	if (existing) {
		return existing;
	}
	const created = `admin-web-${crypto.randomUUID()}`;
	localStorage.setItem(INSTALL_KEY, created);
	return created;
}

export const ROLE_LABEL: Record<UserRole, string> = {
	CONSUMER: "소비자",
	OWNER: "점주",
};
