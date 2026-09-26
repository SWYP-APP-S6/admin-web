import { Link, useSearchParams } from "react-router-dom";
import { fetchAdminHolds } from "../api/adminHolds";
import { IdFilters } from "../components/IdFilters";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime } from "../lib/format";
import type { AdminHold, HoldStatus } from "../types";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: "" | HoldStatus; label: string }[] = [
	{ value: "", label: "전체" },
	{ value: "HOLDING", label: "찜 중" },
	{ value: "COMPLETED", label: "수령 완료" },
	{ value: "EXPIRED", label: "만료" },
	{ value: "CANCELED", label: "취소" },
];

const STATUS_LABEL: Record<HoldStatus, string> = {
	HOLDING: "찜 중",
	COMPLETED: "수령 완료",
	EXPIRED: "만료",
	CANCELED: "취소",
};

const STATUS_CLASS: Record<HoldStatus, string> = {
	HOLDING: "tag tag--owner",
	COMPLETED: "tag tag--completed",
	EXPIRED: "tag tag--expired",
	CANCELED: "tag tag--rejected",
};

const ID_FIELDS = [
	{ key: "storeId", label: "가게 id" },
	{ key: "productId", label: "상품 id" },
	{ key: "userId", label: "유저 id" },
];

function outcomeOf(hold: AdminHold): string {
	if (hold.completedAt) {
		return `수령 ${formatDateTime(hold.completedAt)}`;
	}
	if (hold.canceledAt) {
		const who = hold.canceledBy === "OWNER" ? "점주" : "소비자";
		return `${who} 취소 ${formatDateTime(hold.canceledAt)}${hold.cancelReason ? ` · ${hold.cancelReason}` : ""}`;
	}
	if (hold.noShowChargedAt) {
		return `노쇼 차감 ${formatDateTime(hold.noShowChargedAt)}`;
	}
	return "-";
}

export function HoldListPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const status = (searchParams.get("status") ?? "") as "" | HoldStatus;
	const ids = Object.fromEntries(ID_FIELDS.map((f) => [f.key, searchParams.get(f.key) ?? ""]));

	const holds = useAsync(
		() =>
			fetchAdminHolds({
				page,
				size: PAGE_SIZE,
				status: status || undefined,
				storeId: ids.storeId ? Number(ids.storeId) : undefined,
				productId: ids.productId ? Number(ids.productId) : undefined,
				userId: ids.userId ? Number(ids.userId) : undefined,
			}),
		[searchParams.toString()],
	);

	function update(next: { status?: "" | HoldStatus; ids?: Record<string, string> }) {
		const params = new URLSearchParams();
		const nextStatus = next.status ?? status;
		const nextIds = next.ids ?? ids;
		if (nextStatus) {
			params.set("status", nextStatus);
		}
		for (const field of ID_FIELDS) {
			if (nextIds[field.key]) {
				params.set(field.key, nextIds[field.key]);
			}
		}
		setSearchParams(params);
	}

	function narrowTo(key: string, id: number) {
		update({ ids: { ...ids, [key]: String(id) } });
	}

	function goToPage(next: number) {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(next));
		setSearchParams(params);
	}

	function refCell(key: string, ref: { id: number; name: string }) {
		return (
			<button type="button" className="link-button" title="이 대상으로 좁히기" onClick={() => narrowTo(key, ref.id)}>
				{ref.name}
				<span className="table__muted"> #{ref.id}</span>
			</button>
		);
	}

	return (
		<section>
			<div className="page-head">
				<h1 className="page-title">찜</h1>
				{holds.data && (
					<span className="page-count">총 {holds.data.totalElements.toLocaleString()}건</span>
				)}
			</div>

			<div className="filters">
				{STATUS_FILTERS.map((tab) => (
					<button
						key={tab.value}
						type="button"
						className={status === tab.value ? "chip chip--active" : "chip"}
						onClick={() => update({ status: tab.value })}
					>
						{tab.label}
					</button>
				))}
			</div>

			<IdFilters
				key={searchParams.toString()}
				fields={ID_FIELDS}
				initial={ids}
				onApply={(values) => update({ ids: values })}
			/>

			{holds.loading && <p className="state">불러오는 중…</p>}
			{holds.error && <p className="state state--error">{holds.error.message}</p>}

			{holds.data && (
				<>
					{holds.data.content.length === 0 ? (
						<p className="state">조건에 맞는 찜이 없습니다.</p>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th>찜</th>
										<th>상태</th>
										<th>유저</th>
										<th>가게</th>
										<th>상품</th>
										<th>수량 · 금액</th>
										<th>찜 시각</th>
										<th>만료</th>
										<th>처리</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{holds.data.content.map((hold) => (
										<tr key={hold.id}>
											<td className="table__nowrap">
												#{hold.id}
												<span className="table__muted"> · 묶음 {hold.groupId}</span>
											</td>
											<td>
												<span className={STATUS_CLASS[hold.status]}>{STATUS_LABEL[hold.status]}</span>
											</td>
											<td>{refCell("userId", hold.user)}</td>
											<td>{refCell("storeId", hold.store)}</td>
											<td>{refCell("productId", hold.product)}</td>
											<td className="table__nowrap">
												{hold.qty}개 · {hold.lineTotal.toLocaleString()}원
											</td>
											<td className="table__muted table__nowrap">{formatDateTime(hold.heldAt)}</td>
											<td className="table__muted table__nowrap">{formatDateTime(hold.expiresAt)}</td>
											<td className="table__muted">{outcomeOf(hold)}</td>
											<td>
												<Link className="button button--small" to={`/events?holdId=${hold.id}`}>
													로그
												</Link>
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
							{holds.data.page + 1} / {Math.max(holds.data.totalPages, 1)}
						</span>
						<button type="button" className="button" disabled={holds.data.last} onClick={() => goToPage(page + 1)}>
							다음
						</button>
					</div>
				</>
			)}
		</section>
	);
}
