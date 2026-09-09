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
	return `/products/nearby?${query}`;
}

export function fetchNearbyProducts(
	params: Parameters<typeof nearbyProductsPath>[0],
): Promise<NearbyProducts> {
	return request<NearbyProducts>(nearbyProductsPath(params));
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
): Promise<NearbyStores> {
	return request<NearbyStores>(nearbyStoresPath(bounds));
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
