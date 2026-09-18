import { useCallback, useEffect, useState } from "react";
import { cancelHolds, fetchHoldCancelCandidates } from "../api/owner";
import { ErrorNote, Loading, asError, momentLabel, won } from "../app/shared";
import type { OwnerHoldCancelCandidates } from "../types";

interface Props {
	accessToken: string;
	onChanged: () => void;
}

/**
 * O-042 취소할 찜 고르기 + O-043 안내 미리보기.
 *
 * 수량 저장(O-051)은 찜을 건드리지 않는다 -- 선반보다 많은 찜이 남아 있을 뿐이다. 그 찜을 실제로
 * 끊고 **손님에게 알림을 보내는 것은 이 화면뿐이다.** 여기까지 오지 않으면 손님 쪽 카운트다운은
 * 계속 돈다.
 */
export function HoldCancelScreen({ accessToken, onChanged }: Props) {
	const [candidates, setCandidates] = useState<OwnerHoldCancelCandidates | null>(null);
	const [picked, setPicked] = useState<Set<number>>(new Set());
	const [confirming, setConfirming] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const load = useCallback(async () => {
		try {
			const next = await fetchHoldCancelCandidates(accessToken);
			setCandidates(next);
			setPicked(
				new Set(
					next.products.flatMap((product) =>
						product.holds.filter((hold) => hold.suggested).map((hold) => hold.holdId),
					),
				),
			);
			setError(null);
		} catch (caught) {
			setError(asError(caught));
		}
	}, [accessToken]);

	useEffect(() => {
		void load();
	}, [load]);

	function toggle(holdId: number) {
		setPicked((current) => {
			const next = new Set(current);
			if (next.has(holdId)) {
				next.delete(holdId);
			} else {
				next.add(holdId);
			}
			return next;
		});
	}

	async function confirm() {
		setBusy(true);
		try {
			await cancelHolds([...picked], accessToken);
			setConfirming(false);
			await load();
			onChanged();
		} catch (caught) {
			setError(asError(caught));
			setConfirming(false);
		} finally {
			setBusy(false);
		}
	}

	if (!candidates && !error) {
		return <Loading />;
	}

	if (confirming && candidates) {
		return (
			<div className="app-screen">
				<div className="sheet">
					<h3 className="app-title" style={{ fontSize: 18 }}>
						찜 <span className="owner-accent">{picked.size}건</span>을 취소할까요?
					</h3>
					<p className="app-sub">취소된 손님에게 아래 안내가 알림으로 갑니다.</p>
					<p className="state">{candidates.noticeMessage}</p>
					<button className="phone__cta" type="button" disabled={busy} onClick={() => void confirm()}>
						취소하고 안내 보내기
					</button>
					<button
						className="phone__cta phone__cta--ghost"
						type="button"
						disabled={busy}
						onClick={() => setConfirming(false)}
					>
						돌아가기
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="app-screen">
			{error && <ErrorNote error={error} />}

			{candidates && candidates.products.length === 0 && (
				<p className="state">선반이 감당 못 하는 찜이 없어요.</p>
			)}

			{candidates?.products.map((product) => (
				<article className="owner-hold" key={product.productId}>
					<div className="owner-hold__head">
						<strong>{product.productName}</strong>
						<span className="tag tag--rejected">{product.shortfallQty}개 부족</span>
					</div>
					<p className="table__muted">
						선반 {product.stockQty}개 · 찜 {product.heldQty}개
					</p>
					{product.holds.map((hold) => (
						<label className="owner-hold__foot" key={hold.holdId}>
							<span>
								<input
									type="checkbox"
									checked={picked.has(hold.holdId)}
									onChange={() => toggle(hold.holdId)}
								/>{" "}
								<strong>{hold.nickname}</strong> 님 · {hold.qty}개 · {won(hold.lineTotal)}
							</span>
							<span className="table__muted">
								{hold.heldOrder}번째 · {momentLabel(hold.heldAt)}
							</span>
						</label>
					))}
				</article>
			))}

			{candidates && candidates.products.length > 0 && (
				<button
					className="phone__cta"
					type="button"
					disabled={picked.size === 0}
					onClick={() => setConfirming(true)}
				>
					고른 찜 {picked.size}건 취소하기
				</button>
			)}

			<p className="app-hint">
				체크는 서버가 먼저 골라 둔 것(<code>suggested</code>)입니다 — 선반을 <strong>먼저 찜한
				순서대로</strong> 배정하고 남는 찜이라, 먼저 찜한 손님이 지켜집니다. 바꿔서 고르셔도
				됩니다.
			</p>
		</div>
	);
}
