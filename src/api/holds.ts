import { request } from "./client";
import type { HoldDetail, ProductBrowseDetail } from "../types";

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

export function createHold(
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
