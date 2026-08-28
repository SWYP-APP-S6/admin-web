import { request } from "./client";
import type { PageResponse, UserRole, UserSummary } from "../types";

export function fetchUsers(params: {
	page: number;
	size: number;
	role?: UserRole;
}): Promise<PageResponse<UserSummary>> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	if (params.role) {
		query.set("role", params.role);
	}
	return request<PageResponse<UserSummary>>(`/admin/users?${query}`);
}
