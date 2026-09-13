import { request } from "./client";
import type {
	OwnerHoldDetail,
	OwnerHoldList,
	OwnerHoldStatus,
	OwnerHome,
	OwnerProductDetail,
	ProductPhoto,
	ProductPreview,
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

/**
 * O-020 Step1. 파일을 먼저 올리고 돌아온 URL 을 등록·미리보기에 그대로 넘긴다 — 서버는 **자기가
 * 저장한 URL 만** 상품 사진으로 받는다(그 밖은 INVALID_PHOTO_URL). 상한은 10MB.
 */
export function uploadProductPhoto(file: File, accessToken: string): Promise<ProductPhoto> {
	const form = new FormData();
	form.append("file", file);
	return request<ProductPhoto>("/owner/products/photos", {
		method: "POST",
		body: form,
		accessToken,
	});
}

/** 등록 전 미리보기(O-021). 저장하지 않지만 가격 · 픽업 창 · 재료 id 는 등록과 같은 규칙으로 검증된다. */
export function previewProduct(
	payload: ProductRegisterPayload,
	accessToken: string,
): Promise<ProductPreview> {
	return request<ProductPreview>("/owner/products/preview", {
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
 * O-030 · O-051. 점주가 적는 수는 **선반에 있는 총 수량**이다(찜 포함) -- 손님에게 보여줄
 * availableQty 는 서버가 거기서 찜을 빼 만든다. 찜이 그 수를 넘으면 cancelOverflow 가 먼저
 * 찜한 순으로 재고를 배정하고 넘치는 찜만 취소한다. false 면 수량만 저장되고 찜은 남는다.
 */
export function updateStock(
	productId: number,
	stockQty: number,
	cancelOverflow: boolean,
	accessToken: string,
): Promise<OwnerProductDetail> {
	return request<OwnerProductDetail>(`/owner/products/${productId}/stock`, {
		method: "PATCH",
		body: { stockQty, cancelOverflow },
		accessToken,
	});
}

/** O-050. 「네, 맞아요」는 픽업 마감까지 수량을 잠그고, 「아니요」는 실제 재고를 적게 연다. */
export function answerStockReconfirm(
	productId: number,
	confirmed: boolean,
	accessToken: string,
): Promise<OwnerProductDetail> {
	return request<OwnerProductDetail>(`/owner/products/${productId}/stock-reconfirm`, {
		method: "POST",
		body: { confirmed },
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
