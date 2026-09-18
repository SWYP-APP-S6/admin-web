import { useEffect, useState } from "react";
import {
	answerStockReconfirm,
	fetchHoldCancelCandidates,
	fetchOwnerProduct,
	updateStock,
} from "../api/owner";
import { ErrorNote, Loading, asError, localTimeLabel, won } from "../app/shared";
import { PRODUCT_CATEGORY_LABEL } from "./session";
import type { OwnerProductDetail } from "../types";

async function cancelCountOf(productId: number, accessToken: string): Promise<number> {
	const candidates = await fetchHoldCancelCandidates(accessToken);
	const mine = candidates.products.find((product) => product.productId === productId);
	return mine?.holds.filter((hold) => hold.suggested).length ?? 0;
}

interface Props {
	productId: number;
	accessToken: string;
	onSaved: () => void;
	onPickHoldsToCancel: () => void;
}

/**
 * O-030 상품 관리 상세 + O-050 재고 재확인 + O-051 수량 직접 입력.
 *
 * 점주가 적는 수는 **선반에 있는 총 수량**이다(찜 포함). 손님에게 보이는 수량은 서버가 거기서
 * 찜을 빼 만들고, 찜이 더 많으면 그 차이가 shortfallQty 로 내려온다 -- 화면이 계산하지 않는다.
 */
export function ProductDetailScreen({
	productId,
	accessToken,
	onSaved,
	onPickHoldsToCancel,
}: Props) {
	const [product, setProduct] = useState<OwnerProductDetail | null>(null);
	const [stock, setStock] = useState(0);
	const [confirming, setConfirming] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [saved, setSaved] = useState(false);
	const [shortage, setShortage] = useState<{ shortfallQty: number; cancelCount: number } | null>(
		null,
	);

	useEffect(() => {
		let active = true;
		fetchOwnerProduct(productId, accessToken)
			.then((detail) => {
				if (active) {
					setProduct(detail);
					setStock(detail.stockQty);
				}
			})
			.catch((caught) => {
				if (active) {
					setError(asError(caught));
				}
			});
		return () => {
			active = false;
		};
	}, [productId, accessToken]);

	if (error && !product) {
		return <ErrorNote error={error} />;
	}
	if (!product) {
		return <Loading />;
	}

	function apply(updated: OwnerProductDetail) {
		setProduct(updated);
		setStock(updated.stockQty);
		setConfirming(false);
		setSaved(true);
		onSaved();
	}

	async function run(work: () => Promise<OwnerProductDetail>) {
		setBusy(true);
		setError(null);
		try {
			const updated = await work();
			apply(updated);
			if (updated.shortfallQty > 0) {
				const cancelCount = await cancelCountOf(productId, accessToken);
				if (cancelCount > 0) {
					setShortage({ shortfallQty: updated.shortfallQty, cancelCount });
				}
			}
		} catch (caught) {
			setError(asError(caught));
			setConfirming(false);
		} finally {
			setBusy(false);
		}
	}

	const shortfall = Math.max(0, product.heldQty - stock);

	if (product.reconfirmPending) {
		return (
			<div className="app-screen">
				<div className="sheet">
					<h3 className="app-title" style={{ fontSize: 18 }}>
						지금 남아있는 수량이
						<br />
						<span className="owner-accent">{product.stockQty}개</span>가 맞나요?
					</h3>
					<p className="app-sub">{product.name}</p>
					<p className="app-hint">
						찜이 최초 등록 수량에 가까워져 서버가 한 번 물어봅니다. 「네」는 픽업 마감까지 수량을
						잠그고, 「아니요」는 실제 재고를 적을 수 있게 엽니다.
					</p>

					{error && <ErrorNote error={error} />}

					<button
						className="phone__cta"
						type="button"
						disabled={busy}
						onClick={() => run(() => answerStockReconfirm(productId, true, accessToken))}
					>
						네, 맞아요
					</button>
					<button
						className="phone__cta phone__cta--ghost"
						type="button"
						disabled={busy}
						onClick={() => run(() => answerStockReconfirm(productId, false, accessToken))}
					>
						아니요
					</button>
					{product.shortfallQty > 0 && (
						<p className="owner-warn">
							⚠️ 지금 찜이 선반보다 {product.shortfallQty}개 많습니다 — 「네」는 거절됩니다
							(<code>STOCK_SHORT_OF_HOLDS</code>). 「아니요」로 실제 수량을 적어주세요.
						</p>
					)}
				</div>
			</div>
		);
	}

	if (shortage) {
		return (
			<div className="app-screen">
				<div className="sheet">
					<p className="cancel-banner" style={{ background: "none", fontSize: 28, padding: 0 }}>
						❗
					</p>
					<h3 className="app-title" style={{ fontSize: 18 }}>
						재고가 <span className="owner-accent">{shortage.shortfallQty}개</span> 부족해요.
					</h3>
					<p className="app-sub">
						선착순을 기준으로 {shortage.cancelCount}건의 찜을 취소해야 해요.
					</p>

					<button
						className="phone__cta"
						type="button"
						onClick={() => {
							setShortage(null);
							onPickHoldsToCancel();
						}}
					>
						찜 취소하기
					</button>
					<button className="cancel-link" type="button" onClick={() => setShortage(null)}>
						나중에 하기
					</button>
				</div>
			</div>
		);
	}

	if (confirming) {
		return (
			<div className="app-screen">
				<div className="sheet">
					<h3 className="app-title" style={{ fontSize: 18 }}>
						지금 판매 가능한 수량이
						<br />
						<span className="owner-accent">{Math.max(0, stock - product.heldQty)}개</span>가
						맞나요?
					</h3>
					<p className="app-sub">
						{stock === 0
							? "재고가 없으면 손님께 보이지 않아요."
							: shortfall > 0
								? "재고가 찜된 수보다 부족해져요."
								: `선반에 ${stock}개, 그중 ${product.heldQty}개는 이미 찜이에요.`}
					</p>

					{error && <ErrorNote error={error} />}

					{
						<div className="owner-sheet__actions">
							<button
								className="phone__cta phone__cta--ghost"
								type="button"
								disabled={busy}
								onClick={() => setConfirming(false)}
							>
								아니요
							</button>
							<button
								className="phone__cta"
								type="button"
								disabled={busy}
								onClick={() => run(() => updateStock(productId, stock, accessToken))}
							>
								{busy ? "저장 중…" : "네, 맞아요"}
							</button>
						</div>
					}
				</div>
			</div>
		);
	}

	return (
		<div className="app-screen">
			<h2 className="app-title" style={{ fontSize: 20 }}>
				{product.name}
			</h2>

			<div className="owner-stats">
				<div className="owner-stat">
					<span className="owner-stat__label">최초 등록</span>
					<strong>{product.initialQty}</strong>
				</div>
				<div className="owner-stat owner-stat--amber">
					<span className="owner-stat__label">방문 예정</span>
					<strong>{product.heldQty}</strong>
				</div>
				<div className="owner-stat owner-stat--green">
					<span className="owner-stat__label">픽업 완료</span>
					<strong>{product.completedQty}</strong>
				</div>
			</div>

			<div className="phone__row">
				<strong>정가</strong>
				{won(product.originalPrice)}
			</div>
			<div className="phone__row">
				<strong>할인가</strong>
				{won(product.salePrice)} ({product.discountRate}%)
			</div>
			<div className="phone__row">
				<strong>픽업 종료시간</strong>
				오늘 {localTimeLabel(product.pickupEndAt)}
			</div>
			<div className="phone__row">
				<strong>손님에게 보이는 수량</strong>
				{product.availableQty}개
			</div>
			<div className="phone__row">
				<strong>식자재 태그</strong>
				{product.ingredientTags.length === 0
					? "없음"
					: `id ${product.ingredientTags.join(", ")} (이름을 주는 API 가 없습니다)`}
			</div>
			<div className="phone__row">
				<strong>카테고리 · 상태</strong>
				{PRODUCT_CATEGORY_LABEL[product.category]} · {product.status}
			</div>

			<h3 className="owner-section">매장에 남은 수량</h3>
			<p className="app-hint">
				선반에 있는 <strong>총 수량</strong>을 적습니다(찜 포함). 손님에게 보이는 수량은 서버가
				여기서 찜을 빼 만듭니다.
			</p>
			<div className="stepper__controls">
				<button
					className="stepper__button"
					type="button"
					disabled={!product.stockEditable || stock <= 0}
					onClick={() => setStock((current) => current - 1)}
				>
					−
				</button>
				<strong>{stock}</strong>
				<button
					className="stepper__button"
					type="button"
					disabled={!product.stockEditable}
					onClick={() => setStock((current) => current + 1)}
				>
					+
				</button>
			</div>

			{!product.stockEditable && (
				<p className="owner-warn">
					⚠️ 수량이 맞다고 확인했거나 마감된 상품이라 지금은 고칠 수 없습니다(픽업 마감이 지나면
					다시 열립니다).
				</p>
			)}
			{shortfall > 0 && (
				<p className="owner-warn">⚠️ 저장하면 찜 {shortfall}개가 재고를 넘어섭니다.</p>
			)}

			{error && <ErrorNote error={error} />}
			{saved && <p className="state">저장했습니다.</p>}

			<button
				className="phone__cta"
				type="button"
				disabled={busy || !product.stockEditable || stock === product.stockQty}
				onClick={() => {
					setSaved(false);
					setConfirming(true);
				}}
			>
				저장하기
			</button>
		</div>
	);
}
