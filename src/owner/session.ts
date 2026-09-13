import type { DayOfWeek, ProductCategory, StoreCategory, StoreStatus } from "../types";

// 소비자 세션(swyp.consumer.*)과 키를 나눈다. 같은 브라우저에서 두 탭을 띄워 "소비자가 찜하면
// 점주 화면에 뜨는가"를 보는 것이 이 페이지의 쓰임이라, 한쪽 로그인이 다른 쪽을 밀어내면 안 된다.
const ACCESS_KEY = "swyp.owner.accessToken";
const REFRESH_KEY = "swyp.owner.refreshToken";
const VIA_KEY = "swyp.owner.via";

/** 점주는 비회원이 없다 — /owner/** 는 REALM_USER + ROLE_OWNER 를 함께 요구한다. */
export type OwnerSession =
	| { kind: "none" }
	| { kind: "user"; accessToken: string; refreshToken: string | null; via: "kakao" | "dev" };

export function loadOwnerSession(): OwnerSession {
	const accessToken = localStorage.getItem(ACCESS_KEY);
	const via = localStorage.getItem(VIA_KEY);
	if (!accessToken || !via) {
		return { kind: "none" };
	}
	return {
		kind: "user",
		accessToken,
		refreshToken: localStorage.getItem(REFRESH_KEY),
		via: via === "dev" ? "dev" : "kakao",
	};
}

export function saveOwnerSession(session: OwnerSession): void {
	if (session.kind === "none") {
		localStorage.removeItem(ACCESS_KEY);
		localStorage.removeItem(REFRESH_KEY);
		localStorage.removeItem(VIA_KEY);
		return;
	}
	localStorage.setItem(ACCESS_KEY, session.accessToken);
	localStorage.setItem(VIA_KEY, session.via);
	if (session.refreshToken) {
		localStorage.setItem(REFRESH_KEY, session.refreshToken);
	} else {
		localStorage.removeItem(REFRESH_KEY);
	}
}

export const STORE_CATEGORY_LABEL: Record<StoreCategory, string> = {
	VEGETABLE: "채소류",
	FRUIT: "과일류",
	MEAT: "정육",
	SEAFOOD: "수산",
	DAIRY_EGG: "유제품·계란",
	BAKERY: "베이커리",
	PREPARED_FOOD: "반찬·조리식품",
	ETC: "기타",
};

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
	VEGETABLE: "채소",
	FRUIT: "과일",
	MEAT: "육류",
	SEAFOOD: "수산",
	DAIRY_EGG: "유제품",
	BAKERY: "베이커리",
	SIDE_DISH: "반찬",
	ETC: "기타",
};

/** 피그마의 요일 칩 순서(일 ~ 토). 서버는 java.time.DayOfWeek 이름을 받는다. */
export const DAY_CHIPS: { day: DayOfWeek; label: string }[] = [
	{ day: "SUNDAY", label: "일" },
	{ day: "MONDAY", label: "월" },
	{ day: "TUESDAY", label: "화" },
	{ day: "WEDNESDAY", label: "수" },
	{ day: "THURSDAY", label: "목" },
	{ day: "FRIDAY", label: "금" },
	{ day: "SATURDAY", label: "토" },
];

export const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
	PENDING: "심사 대기",
	APPROVED: "승인됨",
	REJECTED: "반려됨",
};
