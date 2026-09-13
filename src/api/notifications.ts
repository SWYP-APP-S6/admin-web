import { request } from "./client";
import type {
	AppNotification,
	DevicePlatform,
	NotificationInbox,
	NotificationsReadResult,
} from "../types";

// 알림함은 REALM_USER 면 소비자·점주 모두 열린다 — 점주 앞으로 가는 알림(NEW_HOLD_RECEIVED 등)이
// 있어서 소비자 전용으로 막지 않았다. 관리자 토큰으로는 부를 수 없다.
export function fetchNotifications(
	params: { page: number; size: number },
	accessToken: string,
): Promise<NotificationInbox> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	return request<NotificationInbox>(`/notifications?${query}`, { accessToken });
}

export function readNotification(
	notificationId: number,
	accessToken: string,
): Promise<AppNotification> {
	return request<AppNotification>(`/notifications/${notificationId}/read`, {
		method: "PATCH",
		accessToken,
	});
}

export function readAllNotifications(accessToken: string): Promise<NotificationsReadResult> {
	return request<NotificationsReadResult>("/notifications/read-all", {
		method: "POST",
		accessToken,
	});
}

// 푸시 수신처. 앱은 로그인 직후 등록하고 **로그아웃 때 지운다** -- 지우지 않으면 그 기기를 이어
// 쓰는 다음 사람이 남의 알림을 받는다. 발송은 아웃박스 배치(NotificationPushService)가 맡는다.
export function registerDeviceToken(
	platform: DevicePlatform,
	fcmToken: string,
	accessToken: string,
): Promise<void> {
	return request<void>("/notifications/device-tokens", {
		method: "POST",
		body: { platform, fcmToken },
		accessToken,
	});
}

export function unregisterDeviceToken(fcmToken: string, accessToken: string): Promise<void> {
	return request<void>("/notifications/device-tokens", {
		method: "DELETE",
		body: { fcmToken },
		accessToken,
	});
}
