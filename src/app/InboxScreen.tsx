import { useCallback, useEffect, useState } from "react";
import { fetchNotifications, readAllNotifications, readNotification } from "../api/notifications";
import type { AppNotification, NotificationInbox } from "../types";
import { ErrorNote, Loading, asError, momentLabel } from "./shared";

interface Props {
	accessToken: string;
	onUnreadChange: (count: number) => void;
}

/** C-051. 발송기(FCM)는 아직 없고 알림 행만 쌓인다 -- 이 화면이 그 행을 읽는 유일한 곳이다. */
export function InboxScreen({ accessToken, onUnreadChange }: Props) {
	const [inbox, setInbox] = useState<NotificationInbox | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			const next = await fetchNotifications({ page: 0, size: 30 }, accessToken);
			setInbox(next);
			setError(null);
			onUnreadChange(next.unreadCount);
		} catch (caught) {
			setError(asError(caught));
		}
	}, [accessToken, onUnreadChange]);

	useEffect(() => {
		void load();
	}, [load]);

	async function markOne(notification: AppNotification) {
		if (notification.readAt) {
			return;
		}
		setBusy(true);
		try {
			await readNotification(notification.id, accessToken);
			await load();
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	async function markAll() {
		setBusy(true);
		try {
			await readAllNotifications(accessToken);
			await load();
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	if (error) {
		return <ErrorNote error={error} />;
	}
	if (!inbox) {
		return <Loading />;
	}

	return (
		<div className="app-screen">
			<div className="app-place">
				<span className="app-count" style={{ margin: 0 }}>
					읽지 않음 {inbox.unreadCount}건
				</span>
				<button
					className="button button--small"
					type="button"
					disabled={busy || inbox.unreadCount === 0}
					onClick={markAll}
				>
					모두 읽음
				</button>
			</div>

			{inbox.notifications.content.length === 0 && (
				<p className="state">알림이 없습니다. 찜을 만들거나 만료시키면 행이 쌓입니다.</p>
			)}
			{inbox.notifications.content.map((notification) => (
				<button
					key={notification.id}
					type="button"
					className={notification.readAt ? "notice-row" : "notice-row notice-row--unread"}
					disabled={busy || notification.readAt !== null}
					onClick={() => markOne(notification)}
				>
					<span className="notice-row__head">
						<strong>{notification.title}</strong>
						<code>{notification.type}</code>
					</span>
					<span className="notice-row__body">{notification.body}</span>
					<span className="notice-row__foot">
						{momentLabel(notification.notifiedAt)}
						{notification.readAt ? " · 읽음" : " · 눌러서 읽음 처리"}
					</span>
				</button>
			))}
		</div>
	);
}
