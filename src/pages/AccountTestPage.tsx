import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { issueTestToken } from "../api/devToken";
import { fetchMe } from "../api/me";
import {
	fetchNotifications,
	readAllNotifications,
	readNotification,
} from "../api/notifications";
import { clearConsumerToken, getConsumerToken, storeConsumerToken } from "../auth/consumerToken";
import type { AppNotification, Me, NotificationInbox, NotificationType, UserRole } from "../types";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<UserRole, string> = {
	CONSUMER: "소비자",
	OWNER: "점주",
};

// 점주 앞으로 가는 알림이 섞여 있다. 알림함이 REALM_USER 면 둘 다 열리는 이유다.
const AUDIENCE: Record<NotificationType, "소비자" | "점주"> = {
	HOLD_CREATED: "소비자",
	HOLD_EXPIRING_SOON: "소비자",
	HOLD_EXPIRED: "소비자",
	PICKUP_COMPLETED: "소비자",
	HOLD_CANCELED_BY_OWNER: "소비자",
	NEARBY_PRODUCT_REGISTERED: "소비자",
	HOLD_UNCONFIRMED: "점주",
	STOCK_RECONFIRM_REQUEST: "점주",
	NEW_HOLD_RECEIVED: "점주",
};

function asError(caught: unknown): Error {
	return caught instanceof Error ? caught : new Error("알 수 없는 오류");
}

function moment(iso: string): string {
	return new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function day(iso: string): string {
	return new Date(iso).toLocaleDateString("ko-KR", { dateStyle: "medium" });
}

function ErrorView({ error }: { error: Error }) {
	const code = error instanceof ApiError ? error.code : null;
	return (
		<p className="state state--error">
			{code && <code>{code}</code>} {error.message}
		</p>
	);
}

export function AccountTestPage() {
	const [token, setToken] = useState<string | null>(() => getConsumerToken());
	const [issuing, setIssuing] = useState<UserRole | null>(null);
	const [tokenError, setTokenError] = useState<Error | null>(null);

	const [me, setMe] = useState<Me | null>(null);
	const [meError, setMeError] = useState<Error | null>(null);

	const [inbox, setInbox] = useState<NotificationInbox | null>(null);
	const [inboxError, setInboxError] = useState<Error | null>(null);
	const [page, setPage] = useState(0);
	const [busy, setBusy] = useState(false);

	const loadAll = useCallback(
		async (accessToken: string, targetPage: number) => {
			setMeError(null);
			setInboxError(null);
			try {
				setMe(await fetchMe(accessToken));
			} catch (caught) {
				setMe(null);
				setMeError(asError(caught));
			}
			try {
				setInbox(await fetchNotifications({ page: targetPage, size: PAGE_SIZE }, accessToken));
			} catch (caught) {
				setInbox(null);
				setInboxError(asError(caught));
			}
		},
		[],
	);

	useEffect(() => {
		if (token) {
			void loadAll(token, page);
		}
	}, [token, page, loadAll]);

	async function issue(role: UserRole) {
		setIssuing(role);
		setTokenError(null);
		try {
			const issued = await issueTestToken(role);
			storeConsumerToken(issued.accessToken);
			setPage(0);
			setToken(issued.accessToken);
		} catch (caught) {
			setTokenError(asError(caught));
		} finally {
			setIssuing(null);
		}
	}

	function forgetToken() {
		clearConsumerToken();
		setToken(null);
		setMe(null);
		setInbox(null);
	}

	async function markOne(notification: AppNotification) {
		if (!token || notification.readAt) {
			return;
		}
		setBusy(true);
		try {
			await readNotification(notification.id, token);
			await loadAll(token, page);
		} catch (caught) {
			setInboxError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	async function markAll() {
		if (!token) {
			return;
		}
		setBusy(true);
		try {
			await readAllNotifications(token);
			await loadAll(token, page);
		} catch (caught) {
			setInboxError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">계정 · 알림함 API 테스트</h1>
				<span className="page-count">
					{inbox ? `읽지 않음 ${inbox.unreadCount}건` : "토큰 없음"}
				</span>
			</div>

			<p className="notice">
				<code>GET /users/me</code>는 앱이 스플래시에서 토큰을 검증하는 경로이기도 합니다 —
				위치 권한 없이 부를 수 있는 첫 조회입니다. 알림함은{" "}
				<strong>소비자·점주 모두</strong> 자기 것만 읽습니다. 남의 알림을 읽으려 하면 403이
				아니라 <code>404 NOTIFICATION_NOT_FOUND</code>입니다 — 403은 그 id가 있다는 사실을
				흘리기 때문입니다.
			</p>

			<div className="form-card" style={{ marginBottom: 24 }}>
				<div className="field__label" style={{ marginBottom: 6 }}>
					테스트 토큰
				</div>
				{token ? (
					<>
						<pre className="token-box" style={{ margin: 0 }}>
							{`${token.slice(0, 20)}…${token.slice(-10)}`}
						</pre>
						<div className="row-actions" style={{ marginTop: 8 }}>
							<button
								className="button button--small"
								type="button"
								disabled={issuing !== null}
								onClick={() => issue("CONSUMER")}
							>
								소비자로 다시 발급
							</button>
							<button
								className="button button--small"
								type="button"
								disabled={issuing !== null}
								onClick={() => issue("OWNER")}
							>
								점주로 발급
							</button>
							<button className="button button--small" type="button" onClick={forgetToken}>
								지우기
							</button>
						</div>
					</>
				) : (
					<>
						<p className="field__hint" style={{ margin: 0 }}>
							<code>POST /dev/test-token</code>으로 발급합니다. 찜 API 테스트 페이지와 같은
							토큰을 씁니다.
						</p>
						<div className="row-actions" style={{ marginTop: 8 }}>
							<button
								className="button button--primary"
								type="button"
								disabled={issuing !== null}
								onClick={() => issue("CONSUMER")}
							>
								{issuing === "CONSUMER" ? "발급 중…" : "소비자 토큰 발급"}
							</button>
							<button
								className="button"
								type="button"
								disabled={issuing !== null}
								onClick={() => issue("OWNER")}
							>
								{issuing === "OWNER" ? "발급 중…" : "점주 토큰 발급"}
							</button>
						</div>
					</>
				)}
				{tokenError && <ErrorView error={tokenError} />}
			</div>

			{!token && <p className="state">토큰을 발급하면 프로필과 알림함을 불러옵니다.</p>}

			{token && (
				<>
					<h2 className="panel__title" style={{ marginBottom: 8 }}>
						GET /users/me
					</h2>
					{meError && <ErrorView error={meError} />}
					{me && (
						<div className="card" style={{ marginBottom: 24 }}>
							<div className="card__body">
								<div className="card__title">
									{me.nickname}{" "}
									<span className={me.role === "OWNER" ? "tag tag--owner" : "tag tag--consumer"}>
										{ROLE_LABEL[me.role]}
									</span>
								</div>
								<dl className="kv">
									<dt>id</dt>
									<dd>#{me.id}</dd>
									<dt>전화번호</dt>
									<dd>{me.phone ?? <span className="table__muted">없음</span>}</dd>
									<dt>마케팅 수신</dt>
									<dd>{me.marketingOptIn ? "동의" : "미동의"}</dd>
									<dt>약관 동의</dt>
									<dd>{moment(me.termsAgreedAt)}</dd>
									<dt>가입</dt>
									<dd>{day(me.joinedAt)}</dd>
								</dl>
								<p className="field__hint" style={{ margin: 0 }}>
									약관은 스키마가 항목별로 남기지 않습니다 — 필수 전건에 동의한 시각 하나뿐입니다.
								</p>
							</div>
						</div>
					)}

					<div className="page-head" style={{ marginBottom: 8 }}>
						<h2 className="panel__title" style={{ margin: 0 }}>
							GET /notifications
						</h2>
						<div className="row-actions">
							<button
								className="button button--small"
								type="button"
								disabled={busy || !inbox || inbox.unreadCount === 0}
								onClick={markAll}
							>
								{busy ? "처리 중…" : "모두 읽음"}
							</button>
							<button
								className="button button--small"
								type="button"
								disabled={busy}
								onClick={() => void loadAll(token, page)}
							>
								새로고침
							</button>
						</div>
					</div>

					{inboxError && <ErrorView error={inboxError} />}
					{inbox && inbox.notifications.content.length === 0 && (
						<p className="state">
							알림이 없습니다. 찜 API 테스트에서 찜을 만들거나 만료시키면 행이 쌓입니다.
						</p>
					)}
					{inbox && inbox.notifications.content.length > 0 && (
						<div style={{ display: "grid", gap: 8 }}>
							{inbox.notifications.content.map((notification) => (
								<button
									key={notification.id}
									type="button"
									className={
										notification.readAt ? "notice-row" : "notice-row notice-row--unread"
									}
									disabled={busy || notification.readAt !== null}
									onClick={() => markOne(notification)}
								>
									<span className="notice-row__head">
										<strong>{notification.title}</strong>
										<span className="tag tag--pending">{AUDIENCE[notification.type]}</span>
										<code>{notification.type}</code>
									</span>
									<span className="notice-row__body">{notification.body}</span>
									<span className="notice-row__foot">
										{moment(notification.notifiedAt)}
										{notification.readAt
											? ` · 읽음 ${moment(notification.readAt)}`
											: " · 눌러서 읽음 처리"}
										{notification.deepLink ? ` · ${notification.deepLink}` : ""}
									</span>
								</button>
							))}
						</div>
					)}

					{inbox && inbox.notifications.totalPages > 1 && (
						<div className="row-actions" style={{ marginTop: 12 }}>
							<button
								className="button button--small"
								type="button"
								disabled={page === 0}
								onClick={() => setPage((current) => current - 1)}
							>
								이전
							</button>
							<span className="page-count">
								{page + 1} / {inbox.notifications.totalPages}
							</span>
							<button
								className="button button--small"
								type="button"
								disabled={inbox.notifications.last}
								onClick={() => setPage((current) => current + 1)}
							>
								다음
							</button>
						</div>
					)}
				</>
			)}
		</>
	);
}
