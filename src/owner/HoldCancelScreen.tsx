import { useCallback, useEffect, useState } from "react";
import { cancelHolds, fetchHoldCancelCandidates } from "../api/owner";
import { ErrorNote, Loading, asError } from "../app/shared";
import type { OwnerHoldCancelCandidates } from "../types";

/** 「09.02(수) 18시 20분」 -- 이 화면에서만 쓰는 표기다. */
function heldAtLabel(instant: string): string {
	const at = new Date(instant);
	const day = ["일", "월", "화", "수", "목", "금", "토"][at.getDay()];
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${pad(at.getMonth() + 1)}.${pad(at.getDate())}(${day}) ${at.getHours()}시 ${pad(at.getMinutes())}분`;
}

interface Props {
	accessToken: string;
	onChanged: () => void;
}

/**
 * O-042 찜 취소하기 + O-043 안내 미리보기.
 *
 * 수량 저장(O-051)은 찜을 건드리지 않는다 -- 선반보다 많은 찜이 남아 있을 뿐이다. 그 찜을 실제로
 * 끊고 **손님에게 알림을 보내는 것은 이 화면의 확정뿐이다.** 여기까지 오지 않으면 손님 쪽
 * 카운트다운은 계속 돈다.
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

	const pickedByProduct = (candidates?.products ?? [])
		.map((product) => ({
			name: product.productName,
			count: product.holds.filter((hold) => picked.has(hold.holdId)).length,
		}))
		.filter((product) => product.count > 0);

	if (confirming && candidates) {
		return (
			<div className="app-screen">
				<div className="sheet">
					<h3 className="app-title" style={{ fontSize: 18 }}>
						총 <span className="owner-accent">{picked.size}건</span>의 찜을 취소할까요?
					</h3>
					{pickedByProduct.map((product) => (
						<p className="app-sub" key={product.name} style={{ margin: "4px 0" }}>
							{product.name} · {product.count}건
						</p>
					))}

					<p className="state state--error">❗ 한 번 취소하면 되돌릴 수 없어요.</p>

					<p className="cancel-count" style={{ marginTop: 20 }}>
						안내 메시지 미리보기
					</p>
					<p className="state">{candidates.noticeMessage}</p>

					{error && <ErrorNote error={error} />}

					<div className="owner-sheet__actions">
						<button
							className="phone__cta phone__cta--ghost"
							type="button"
							disabled={busy}
							onClick={() => setConfirming(false)}
						>
							돌아가기
						</button>
						<button
							className="phone__cta"
							type="button"
							disabled={busy}
							onClick={() => void confirm()}
						>
							{busy ? "취소 중…" : "취소하고 안내 보내기"}
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="app-screen">
			{error && <ErrorNote error={error} />}

			{candidates && candidates.products.length > 0 && (
				<p className="cancel-banner">
					❗ 상품 {candidates.productsShortOfStock}개의 재고가 부족해요.
					<br />총 {candidates.suggestedCancelCount}건의 찜을 취소해야 해요.
				</p>
			)}

			<p className="cancel-count">
				취소 예정 <span className="owner-accent">{picked.size}건</span>
			</p>
			<p className="app-sub" style={{ margin: "4px 0 0" }}>
				남은 수량을 가장 많이 팔 수 있게 배정해요.
			</p>

			{candidates?.products.length === 0 && (
				<p className="state">지금 취소 해야할 주문이 없어요.</p>
			)}

			{candidates?.products.map((product) => (
				<div className="cancel-group" key={product.productId}>
					<p className="cancel-group__name">🛍 {product.productName}</p>
					{product.holds.map((hold) => (
						<label
							className={picked.has(hold.holdId) ? "cancel-row cancel-row--picked" : "cancel-row"}
							key={hold.holdId}
						>
							<input
								type="checkbox"
								checked={picked.has(hold.holdId)}
								onChange={() => toggle(hold.holdId)}
							/>
							<span>
								<span className="cancel-row__order">
									{hold.heldOrder}번째 찜 · {heldAtLabel(hold.heldAt)}
								</span>
								<br />
								<span className="cancel-row__who">
									{hold.nickname} 님 * {hold.qty}
								</span>
							</span>
						</label>
					))}
				</div>
			))}

			<button
				className="phone__cta"
				type="button"
				style={{ marginTop: 24 }}
				disabled={picked.size === 0}
				onClick={() => setConfirming(true)}
			>
				{picked.size}건 취소하기
			</button>

			<p className="app-hint">
				체크는 서버가 먼저 골라 둔 것입니다 — 남은 수량을 <strong>가장 많이 팔 수 있게</strong>
				배정하고 남는 찜이며, 팔리는 개수가 같으면 먼저 찜한 손님이 지켜집니다. 바꿔서 고르셔도
				됩니다.
			</p>
		</div>
	);
}
