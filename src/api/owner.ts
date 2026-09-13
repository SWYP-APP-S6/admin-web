import { request } from "./client";
import type {
	HoldDisposition,
	OwnerHoldDetail,
	OwnerHoldList,
	OwnerHoldStatus,
	OwnerHome,
	OwnerProductDetail,
	ProductRegisterPayload,
	StoreDetail,
	StoreRegisterPayload,
} from "../types";

// 점주 API 는 전부 `/owner/**` 아래라 SecurityConfig 가 REALM_USER + ROLE_OWNER 를 함께 요구한다 --
// 소비자 토큰으로 부르면 403 이다. 여기서는 항상 점주 세션의 accessToken 을 넘긴다.

/** O-010. 상점 · 요약 · 곧 방문 · 판매중 상품을 한 번에 받는 화면 조합 응답. */
export function fetchOwnerHome(accessToken: string): Promise<OwnerHome> {
	return request<OwnerHome>("/owner/home", { accessToken });
}

/** 가게가 없으면 404 STORE_NOT_REGISTERED 다 — 그게 곧 O-003 으로 보내라는 신호다. */
export function fetchMyStore(accessToken: string): Promise<StoreDetail> {
	return request<StoreDetail>("/owner/stores/me", { accessToken });
}

export function registerStore(
	payload: StoreRegisterPayload,
	accessToken: string,
): Promise<StoreDetail> {
	return request<StoreDetail>("/owner/stores", { method: "POST", body: payload, accessToken });
}

export function registerProduct(
	payload: ProductRegisterPayload,
	accessToken: string,
): Promise<OwnerProductDetail> {
	return request<OwnerProductDetail>("/owner/products", {
		method: "POST",
		body: payload,
		accessToken,
	});
}

export function fetchOwnerProduct(
	productId: number,
	accessToken: string,
): Promise<OwnerProductDetail> {
	return request<OwnerProductDetail>(`/owner/products/${productId}`, { accessToken });
}

/**
 * O-030 · O-051. 남은 수량을 0 으로 내리는데 진행 중인 찜이 있으면 서버가 disposition 을 요구한다
 * (400 DISPOSITION_REQUIRED). 화면은 그 오류를 받고 시트를 띄운 뒤 같은 요청을 다시 보낸다.
 */
export function updateAvailableQty(
	productId: number,
	availableQty: number,
	disposition: HoldDisposition | null,
	accessToken: string,
): Promise<OwnerProductDetail> {
	return request<OwnerProductDetail>(`/owner/products/${productId}/available-qty`, {
		method: "PATCH",
		body: { availableQty, disposition },
		accessToken,
	});
}

export function fetchOwnerHolds(
	params: { status?: OwnerHoldStatus | null; page: number; size: number },
	accessToken: string,
): Promise<OwnerHoldList> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	if (params.status) {
		query.set("status", params.status);
	}
	return request<OwnerHoldList>(`/owner/holds?${query}`, { accessToken });
}

export function fetchOwnerHold(holdId: number, accessToken: string): Promise<OwnerHoldDetail> {
	return request<OwnerHoldDetail>(`/owner/holds/${holdId}`, { accessToken });
}

/** 만료됐어도 hold.no-show-grace(30분) 안이면 받아준다 — 그때는 재고에서 다시 차감한다. */
export function completePickup(holdId: number, accessToken: string): Promise<OwnerHoldDetail> {
	return request<OwnerHoldDetail>(`/owner/holds/${holdId}/complete`, {
		method: "POST",
		accessToken,
	});
}
