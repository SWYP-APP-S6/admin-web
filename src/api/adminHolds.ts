import { request } from "./client";
import type { AdminHold, HoldStatus, PageResponse } from "../types";

export function fetchAdminHolds(params: {
	page: number;
	size: number;
	status?: HoldStatus;
	storeId?: number;
	productId?: number;
	userId?: number;
}): Promise<PageResponse<AdminHold>> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	for (const key of ["status", "storeId", "productId", "userId"] as const) {
		const value = params[key];
		if (value !== undefined) {
			query.set(key, String(value));
		}
	}
	return request<PageResponse<AdminHold>>(`/admin/holds?${query}`);
}
