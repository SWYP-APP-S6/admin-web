import { request } from "./client";
import type {
	AdminUserDetail,
	CancelCreditBalance,
	PageResponse,
	UserRole,
	UserSummary,
} from "../types";

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

export function fetchUser(id: number): Promise<AdminUserDetail> {
	return request<AdminUserDetail>(`/admin/users/${id}`);
}

export function adjustCancelCredits(id: number, delta: number): Promise<CancelCreditBalance> {
	return request<CancelCreditBalance>(`/admin/users/${id}/cancel-credits`, {
		method: "POST",
		body: { delta },
	});
}

export function deleteUser(id: number): Promise<void> {
	return request<void>(`/admin/users/${id}`, { method: "DELETE" });
}
