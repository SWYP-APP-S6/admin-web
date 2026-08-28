import { request } from "./client";
import type { PageResponse, StoreDetail, StoreStatus, StoreSummary } from "../types";

export function fetchStores(params: {
	page: number;
	size: number;
	status?: StoreStatus;
}): Promise<PageResponse<StoreSummary>> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	if (params.status) {
		query.set("status", params.status);
	}
	return request<PageResponse<StoreSummary>>(`/admin/stores?${query}`);
}

export function fetchStore(id: number): Promise<StoreDetail> {
	return request<StoreDetail>(`/admin/stores/${id}`);
}

export function updateStoreStatus(id: number, status: StoreStatus): Promise<void> {
	return request<void>(`/admin/stores/${id}/status`, {
		method: "PATCH",
		body: { status },
	});
}
