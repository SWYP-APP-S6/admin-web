import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchStore, fetchStores, updateStoreStatus } from "../api/stores";
import { Modal } from "../components/Modal";
import { useAsync } from "../hooks/useAsync";
import { formatDate, formatPhone } from "../lib/format";
import type { StoreDetail, StoreStatus } from "../types";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: "" | StoreStatus; label: string }[] = [
	{ value: "", label: "전체" },
	{ value: "PENDING", label: "심사 대기" },
	{ value: "APPROVED", label: "승인" },
	{ value: "REJECTED", label: "반려" },
];

const STATUS_LABEL: Record<StoreStatus, string> = {
	PENDING: "심사 대기",
	APPROVED: "승인",
	REJECTED: "반려",
};

const STATUS_CLASS: Record<StoreStatus, string> = {
	PENDING: "tag tag--pending",
	APPROVED: "tag tag--owner",
	REJECTED: "tag tag--rejected",
};

export function StoreListPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const status = (searchParams.get("status") ?? "") as "" | StoreStatus;

	// 승인/반려 후 목록을 다시 읽기 위한 신호. useAsync 는 deps 가 바뀔 때만 다시 부른다.
	const [reloadToken, setReloadToken] = useState(0);
	const [pendingId, setPendingId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	// 신청서 본문은 길 수 있어 목록에 싣지 않는다 — 열어볼 때 한 건만 가져온다.
	const [application, setApplication] = useState<StoreDetail | null>(null);
	const [applicationLoading, setApplicationLoading] = useState(false);

	async function openApplication(id: number) {
		setError(null);
		setApplicationLoading(true);
		try {
			setApplication(await fetchStore(id));
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "신청서를 불러오지 못했습니다.");
		} finally {
			setApplicationLoading(false);
		}
	}

	const stores = useAsync(
		useCallback(
			() => fetchStores({ page, size: PAGE_SIZE, status: status || undefined }),
			[page, status, reloadToken],
		),
		[page, status, reloadToken],
	);

	async function changeStatus(id: number, next: StoreStatus) {
		setError(null);
		setPendingId(id);
		try {
			await updateStoreStatus(id, next);
			setReloadToken((token) => token + 1);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "상태를 바꾸지 못했습니다.");
		} finally {
			setPendingId(null);
		}
	}

	function selectStatus(next: "" | StoreStatus) {
		const params = new URLSearchParams();
		if (next) {
			params.set("status", next);
		}
		setSearchParams(params);
	}

	function goToPage(next: number) {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(next));
		setSearchParams(params);
	}

	return (
		<section>
			<div className="page-head">
				<h1 className="page-title">가게</h1>
				{stores.data && (
					<span className="page-count">총 {stores.data.totalElements.toLocaleString()}곳</span>
				)}
			</div>

			<div className="filters">
				{STATUS_FILTERS.map((filter) => (
					<button
						key={filter.value}
						type="button"
						className={status === filter.value ? "chip chip--active" : "chip"}
						onClick={() => selectStatus(filter.value)}
					>
						{filter.label}
					</button>
				))}
			</div>

			{error && <p className="state state--error">{error}</p>}
			{stores.loading && <p className="state">불러오는 중…</p>}
			{stores.error && <p className="state state--error">{stores.error.message}</p>}

			{stores.data && (
				<>
					{stores.data.content.length === 0 ? (
						<p className="state">해당하는 가게가 없습니다.</p>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th>가게</th>
										<th>상태</th>
										<th>점주</th>
										<th>주소</th>
										<th>연락처</th>
										<th>영업시간</th>
										<th>신청일</th>
										<th>신청서</th>
										<th>심사</th>
									</tr>
								</thead>
								<tbody>
									{stores.data.content.map((store) => (
										<tr key={store.id}>
											<td>{store.name}</td>
											<td>
												<span className={STATUS_CLASS[store.status]}>
													{STATUS_LABEL[store.status]}
												</span>
											</td>
											<td className="table__muted">
												{store.owner.nickname}
												{store.owner.phone ? ` (${formatPhone(store.owner.phone)})` : ""}
											</td>
											<td className="table__muted">
												{store.address}
												{store.addressDetail ? ` ${store.addressDetail}` : ""}
											</td>
											<td className="table__muted">{formatPhone(store.phone)}</td>
											<td className="table__muted">
												{store.businessOpenTime.slice(0, 5)}–{store.businessCloseTime.slice(0, 5)}
											</td>
											<td className="table__muted">{formatDate(store.createdAt)}</td>
											<td>
												<button
													type="button"
													className="button button--small"
													disabled={applicationLoading}
													onClick={() => openApplication(store.id)}
												>
													보기
												</button>
											</td>
											<td>
												{store.status === "PENDING" ? (
													<div className="row-actions">
														<button
															type="button"
															className="button button--small"
															disabled={pendingId === store.id}
															onClick={() => changeStatus(store.id, "APPROVED")}
														>
															승인
														</button>
														<button
															type="button"
															className="button button--small button--danger"
															disabled={pendingId === store.id}
															onClick={() => changeStatus(store.id, "REJECTED")}
														>
															반려
														</button>
													</div>
												) : (
													<span className="table__muted">–</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					<div className="pager">
						<button
							type="button"
							className="button"
							disabled={page <= 0}
							onClick={() => goToPage(page - 1)}
						>
							이전
						</button>
						<span className="pager__status">
							{stores.data.page + 1} / {Math.max(stores.data.totalPages, 1)}
						</span>
						<button
							type="button"
							className="button"
							disabled={stores.data.last}
							onClick={() => goToPage(page + 1)}
						>
							다음
						</button>
					</div>
				</>
			)}

			<Modal
				open={application !== null}
				title={application ? `${application.name} 입점 신청서` : ""}
				onClose={() => setApplication(null)}
			>
				{application && (
					<>
						<dl className="facts">
							<div className="facts__item">
								<dt>사업자등록번호</dt>
								<dd>{application.businessRegistrationNumber ?? "-"}</dd>
							</div>
							<div className="facts__item">
								<dt>점주</dt>
								<dd>{application.owner.nickname}</dd>
							</div>
							<div className="facts__item">
								<dt>가게 연락처</dt>
								<dd>{formatPhone(application.phone)}</dd>
							</div>
							<div className="facts__item">
								<dt>신청일</dt>
								<dd>{formatDate(application.createdAt)}</dd>
							</div>
						</dl>

						<p className="modal__label">주소</p>
						<p className="modal__text">
							{application.address}
							{application.addressDetail ? ` ${application.addressDetail}` : ""}
						</p>

						<p className="modal__label">신청 내용</p>
						{application.applicationNote ? (
							<p className="modal__note">{application.applicationNote}</p>
						) : (
							<p className="modal__text table__muted">작성된 내용이 없습니다.</p>
						)}
					</>
				)}
			</Modal>
		</section>
	);
}
