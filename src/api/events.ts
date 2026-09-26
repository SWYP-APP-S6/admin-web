import { request } from "./client";
import type { DomainEvent, DomainEventType, PageResponse } from "../types";

export interface EventQuery {
	page: number;
	size: number;
	type?: DomainEventType;
	userId?: number;
	storeId?: number;
	productId?: number;
	holdId?: number;
	/** YYYY-MM-DD, 서울 날짜. 둘 다 포함 범위다. */
	from?: string;
	to?: string;
}

export function fetchEvents(params: EventQuery): Promise<PageResponse<DomainEvent>> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	for (const key of ["type", "userId", "storeId", "productId", "holdId", "from", "to"] as const) {
		const value = params[key];
		if (value !== undefined && value !== "") {
			query.set(key, String(value));
		}
	}
	return request<PageResponse<DomainEvent>>(`/admin/events?${query}`);
}
