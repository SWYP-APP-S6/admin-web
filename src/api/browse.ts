import { request } from "./client";
import type {
	NearbyProductSort,
	NearbyProducts,
	NearbyStores,
	ProductCategory,
	StoreProducts,
} from "../types";

export function nearbyProductsPath(params: {
	lat: number;
	lng: number;
	category?: ProductCategory;
	sort: NearbyProductSort;
	radiusMeters?: number;
	page: number;
	size: number;
}): string {
	const query = new URLSearchParams({
		lat: String(params.lat),
		lng: String(params.lng),
		sort: params.sort,
		page: String(params.page),
		size: String(params.size),
	});
	if (params.category) {
		query.set("category", params.category);
	}
	// 생략하면 서버 기본값(browse.nearby-radius-meters)을 쓴다. 허용 범위는 100~5000m.
	if (params.radiusMeters !== undefined) {
		query.set("radiusMeters", String(params.radiusMeters));
	}
	return `/products/nearby?${query}`;
}

export function fetchNearbyProducts(
	params: Parameters<typeof nearbyProductsPath>[0],
	accessToken?: string,
): Promise<NearbyProducts> {
	return request<NearbyProducts>(nearbyProductsPath(params), { accessToken });
}

export function nearbyStoresPath(bounds: {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
}): string {
	const query = new URLSearchParams({
		minLat: bounds.minLat.toFixed(6),
		maxLat: bounds.maxLat.toFixed(6),
		minLng: bounds.minLng.toFixed(6),
		maxLng: bounds.maxLng.toFixed(6),
	});
	return `/stores/nearby?${query}`;
}

export function fetchNearbyStores(
	bounds: Parameters<typeof nearbyStoresPath>[0],
	accessToken?: string,
): Promise<NearbyStores> {
	return request<NearbyStores>(nearbyStoresPath(bounds), { accessToken });
}

export function storeProductsPath(storeId: number, lat: number, lng: number): string {
	const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
	return `/stores/${storeId}/products?${query}`;
}

export function fetchStoreProducts(
	storeId: number,
	lat: number,
	lng: number,
): Promise<StoreProducts> {
	return request<StoreProducts>(storeProductsPath(storeId, lat, lng));
}
