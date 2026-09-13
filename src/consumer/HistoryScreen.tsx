import { useState } from "react";
import { fetchHoldHistory } from "../api/holds";
import { useAsync } from "../hooks/useAsync";
import type { HoldStatus } from "../types";
import { ErrorNote, Loading, momentLabel, won } from "../app/shared";

const STATUS_LABEL: Record<HoldStatus, string> = {
	HOLDING: "진행 중",
	COMPLETED: "수령 완료",
	CANCELED: "취소",
	EXPIRED: "만료",
};

const STATUS_TAG: Record<HoldStatus, string> = {
	HOLDING: "tag tag--pending",
	COMPLETED: "tag tag--completed",
	CANCELED: "tag tag--rejected",
	EXPIRED: "tag tag--expired",
};

interface Props {
	accessToken: string;
	reloadKey: number;
	onOpenHold: (holdId: number) => void;
}

/** C-030. 진행 중인 찜은 계정당 하나뿐이라 상태 필터 없이 최신순으로만 내려온다. */
export function HistoryScreen({ accessToken, reloadKey, onOpenHold }: Props) {
	const [page, setPage] = useState(0);
	const history = useAsync(
		() => fetchHoldHistory({ page, size: 10 }, accessToken),
		[accessToken, page, reloadKey],
	);

	if (history.loading) {
		return <Loading />;
	}
	if (history.error) {
		return <ErrorNote error={history.error} />;
	}
	if (!history.data || history.data.holds.content.length === 0) {
		return <p className="state">아직 찜한 내역이 없습니다.</p>;
	}

	const { holds } = history.data;
	return (
		<div className="app-screen">
			<p className="app-count">총 {holds.totalElements}건</p>
			{holds.content.map((entry) => (
				<button
					className="app-history"
					type="button"
					key={entry.id}
					onClick={() => onOpenHold(entry.id)}
				>
					<span className="app-history__head">
						<strong>{entry.storeName}</strong>
						<span className={STATUS_TAG[entry.status]}>{STATUS_LABEL[entry.status]}</span>
					</span>
					<span className="app-item__meta">
						{entry.productName} {entry.qty}개
					</span>
					<span className="app-item__meta">
						{entry.qty}개 · {won(entry.totalPrice)} · {momentLabel(entry.heldAt)}
						{entry.cancelCreditUsed && " · 취소권 차감"}
					</span>
				</button>
			))}
			{holds.totalPages > 1 && (
				<div className="row-actions">
					<button
						className="button button--small"
						type="button"
						disabled={page === 0}
						onClick={() => setPage((current) => current - 1)}
					>
						이전
					</button>
					<span className="page-count">
						{page + 1} / {holds.totalPages}
					</span>
					<button
						className="button button--small"
						type="button"
						disabled={holds.last}
						onClick={() => setPage((current) => current + 1)}
					>
						다음
					</button>
				</div>
			)}
		</div>
	);
}
