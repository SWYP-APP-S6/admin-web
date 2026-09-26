import { request } from "./client";
import type {
	AdminNotification,
	AdminNotificationType,
	PageResponse,
	PushOutboxSummary,
	PushState,
} from "../types";

export function fetchPushSummary(): Promise<PushOutboxSummary> {
	return request<PushOutboxSummary>("/admin/notifications/push-summary");
}

export function fetchAdminNotifications(params: {
	page: number;
	size: number;
	pushState?: PushState;
	userId?: number;
	type?: AdminNotificationType;
}): Promise<PageResponse<AdminNotification>> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	for (const key of ["pushState", "userId", "type"] as const) {
		const value = params[key];
		if (value !== undefined) {
			query.set(key, String(value));
		}
	}
	return request<PageResponse<AdminNotification>>(`/admin/notifications?${query}`);
}

export function retryPush(id: number): Promise<AdminNotification> {
	return request<AdminNotification>(`/admin/notifications/${id}/push-retry`, { method: "POST" });
}
