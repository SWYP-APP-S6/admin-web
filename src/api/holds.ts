import { request } from "./client";
import type { ActiveHoldResponse, HoldDetail, ProductBrowseDetail } from "../types";

export function productDetailPath(productId: number, lat?: number, lng?: number): string {
	if (lat === undefined || lng === undefined) {
		return `/products/${productId}`;
	}
	const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
	return `/products/${productId}?${query}`;
}

export function fetchProductDetail(
	productId: number,
	accessToken?: string,
	lat?: number,
	lng?: number,
): Promise<ProductBrowseDetail> {
	return request<ProductBrowseDetail>(productDetailPath(productId, lat, lng), { accessToken });
}

/** 찜을 만들거나, 진행 중인 찜에 더 담는다 — 같은 엔드포인트다. */
export function addToHold(
	productId: number,
	qty: number,
	accessToken: string,
): Promise<HoldDetail> {
	return request<HoldDetail>("/holds", {
		method: "POST",
		body: { productId, qty },
		accessToken,
	});
}

export function cancelHold(holdId: number, accessToken: string): Promise<HoldDetail> {
	return request<HoldDetail>(`/holds/${holdId}/cancel`, { method: "POST", accessToken });
}

export function fetchHold(holdId: number, accessToken: string): Promise<HoldDetail> {
	return request<HoldDetail>(`/holds/${holdId}`, { accessToken });
}

/** 진행 중인 찜(계정당 하나)과 남은 취소 가능 횟수를 함께 받는다. */
export function fetchActiveHold(accessToken: string): Promise<ActiveHoldResponse> {
	return request<ActiveHoldResponse>("/holds/active", { accessToken });
}
