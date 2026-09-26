import { request } from "./client";
import type { AdminProduct, AdminProductFilter, PageResponse } from "../types";

export function fetchAdminProducts(params: {
	page: number;
	size: number;
	filter?: AdminProductFilter;
	storeId?: number;
}): Promise<PageResponse<AdminProduct>> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	if (params.filter) {
		query.set("filter", params.filter);
	}
	if (params.storeId !== undefined) {
		query.set("storeId", String(params.storeId));
	}
	return request<PageResponse<AdminProduct>>(`/admin/products?${query}`);
}
