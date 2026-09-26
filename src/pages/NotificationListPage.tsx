import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchAdminNotifications, fetchPushSummary, retryPush } from "../api/adminNotifications";
import { IdFilters } from "../components/IdFilters";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime } from "../lib/format";
import type { AdminNotificationType, PushState, PushStateCounts } from "../types";

const PAGE_SIZE = 20;

const STATE_FILTERS: { value: "" | PushState; label: string }[] = [
	{ value: "", label: "전체" },
	{ value: "PENDING", label: "발송 대기" },
	{ value: "SENT", label: "발송됨" },
	{ value: "FAILED", label: "실패" },
	{ value: "SKIPPED", label: "건너뜀" },
];

const STATE_LABEL: Record<PushState, string> = {
	PENDING: "발송 대기",
	SENT: "발송됨",
	SKIPPED: "건너뜀",
	FAILED: "실패",
};

const STATE_CLASS: Record<PushState, string> = {
	PENDING: "tag tag--pending",
	SENT: "tag tag--completed",
	SKIPPED: "tag tag--expired",
	FAILED: "tag tag--rejected",
};

const TYPES: AdminNotificationType[] = [
	"HOLD_CREATED",
	"HOLD_EXPIRING_SOON",
	"HOLD_EXPIRED",
	"PICKUP_COMPLETED",
	"HOLD_UNCONFIRMED",
	"HOLD_CANCELED_BY_OWNER",
	"NEARBY_PRODUCT_REGISTERED",
	"STOCK_RECONFIRM_REQUEST",
	"NEW_HOLD_RECEIVED",
	"STORE_APPROVED",
	"STORE_REJECTED",
];

function Counts({ title, counts }: { title: string; counts: PushStateCounts }) {
	return (
		<dl className="facts facts--flat push-counts">
			<div className="facts__item">
				<dt>{title}</dt>
				<dd className="table__muted">{counts.pending + counts.sent + counts.skipped + counts.failed}건</dd>
			</div>
			<div className="facts__item">
				<dt>대기</dt>
				<dd>{counts.pending}</dd>
			</div>
			<div className="facts__item">
				<dt>발송</dt>
				<dd>{counts.sent}</dd>
			</div>
			<div className="facts__item">
				<dt>실패</dt>
				<dd className={counts.failed > 0 ? "push-counts__bad" : ""}>{counts.failed}</dd>
			</div>
			<div className="facts__item">
				<dt>건너뜀</dt>
				<dd>{counts.skipped}</dd>
			</div>
		</dl>
	);
}

export function NotificationListPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const pushState = (searchParams.get("pushState") ?? "") as "" | PushState;
	const type = (searchParams.get("type") ?? "") as "" | AdminNotificationType;
	const userId = searchParams.get("userId") ?? "";

	const [reloadToken, setReloadToken] = useState(0);
	const [busyId, setBusyId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const summary = useAsync(() => fetchPushSummary(), [reloadToken]);
	const notifications = useAsync(
		() =>
			fetchAdminNotifications({
				page,
				size: PAGE_SIZE,
				pushState: pushState || undefined,
				type: type || undefined,
				userId: userId ? Number(userId) : undefined,
			}),
		[searchParams.toString(), reloadToken],
	);

	function update(next: { pushState?: "" | PushState; type?: "" | AdminNotificationType; userId?: string }) {
		const params = new URLSearchParams();
		const nextState = next.pushState ?? pushState;
		const nextType = next.type ?? type;
		const nextUserId = next.userId ?? userId;
		if (nextState) {
			params.set("pushState", nextState);
		}
		if (nextType) {
			params.set("type", nextType);
		}
		if (nextUserId) {
			params.set("userId", nextUserId);
		}
		setSearchParams(params);
	}

	function goToPage(next: number) {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(next));
		setSearchParams(params);
	}

	async function retry(id: number) {
		setError(null);
		setBusyId(id);
		try {
			await retryPush(id);
			setReloadToken((token) => token + 1);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "다시 보내지 못했습니다.");
		} finally {
			setBusyId(null);
		}
	}

	return (
		<section>
			<div className="page-head">
				<h1 className="page-title">알림·푸시</h1>
				{notifications.data && (
					<span className="page-count">총 {notifications.data.totalElements.toLocaleString()}건</span>
				)}
			</div>

			{summary.data && (
				<>
					{!summary.data.pushEnabled && (
						<p className="state state--error">
							FCM 키가 없어 푸시 발송이 꺼져 있습니다. 알림함에는 쌓이지만 기기로는 가지 않습니다.
						</p>
					)}
					{summary.data.oldestPendingAt && (
						<p className="table__muted push-oldest">
							가장 오래 기다리는 대기 건: {formatDateTime(summary.data.oldestPendingAt)} 생성. 배치는 3초마다 돌고
							10분이 지나면 건너뜁니다.
						</p>
					)}
					<div className="push-summary">
						<Counts title="전체" counts={summary.data.allTime} />
						<Counts title="최근 24시간" counts={summary.data.last24Hours} />
					</div>
				</>
			)}

			<div className="filters">
				{STATE_FILTERS.map((tab) => (
					<button
						key={tab.value}
						type="button"
						className={pushState === tab.value ? "chip chip--active" : "chip"}
						onClick={() => update({ pushState: tab.value })}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="filters filters--form">
				<label className="field field--inline">
					<span className="field__label">종류</span>
					<select className="field__input" value={type} onChange={(e) => update({ type: e.target.value as "" | AdminNotificationType })}>
						<option value="">전체</option>
						{TYPES.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</label>
				<IdFilters
					key={searchParams.toString()}
					fields={[{ key: "userId", label: "유저 id" }]}
					initial={{ userId }}
					onApply={(values) => update({ userId: values.userId })}
				/>
			</div>

			{error && <p className="state state--error">{error}</p>}
			{notifications.loading && <p className="state">불러오는 중…</p>}
			{notifications.error && <p className="state state--error">{notifications.error.message}</p>}

			{notifications.data && (
				<>
					{notifications.data.content.length === 0 ? (
						<p className="state">조건에 맞는 알림이 없습니다.</p>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th>생성</th>
										<th>받는 사람</th>
										<th>종류</th>
										<th>제목</th>
										<th>읽음</th>
										<th>푸시</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{notifications.data.content.map((n) => (
										<tr key={n.id}>
											<td className="table__muted table__nowrap">{formatDateTime(n.createdAt)}</td>
											<td>
												<Link to={`/users/${n.user.id}`}>{n.user.nickname}</Link>
												<span className="table__muted"> #{n.user.id}</span>
											</td>
											<td className="table__muted">{n.type}</td>
											<td title={n.body}>{n.title}</td>
											<td className="table__muted table__nowrap">{n.readAt ? formatDateTime(n.readAt) : "안 읽음"}</td>
											<td className="table__nowrap">
												<span className={STATE_CLASS[n.pushState]}>{STATE_LABEL[n.pushState]}</span>
												{n.pushAttempts > 0 && <span className="table__muted"> {n.pushAttempts}회 시도</span>}
												{n.pushedAt && <div className="table__muted">{formatDateTime(n.pushedAt)}</div>}
											</td>
											<td>
												{(n.pushState === "FAILED" || n.pushState === "SKIPPED") && (
													<button
														type="button"
														className="button button--small"
														disabled={busyId === n.id}
														onClick={() => void retry(n.id)}
													>
														다시 보내기
													</button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					<div className="pager">
						<button type="button" className="button" disabled={page <= 0} onClick={() => goToPage(page - 1)}>
							이전
						</button>
						<span className="pager__status">
							{notifications.data.page + 1} / {Math.max(notifications.data.totalPages, 1)}
						</span>
						<button
							type="button"
							className="button"
							disabled={notifications.data.last}
							onClick={() => goToPage(page + 1)}
						>
							다음
						</button>
					</div>
				</>
			)}
		</section>
	);
}
