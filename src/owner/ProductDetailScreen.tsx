import { useEffect, useState } from "react";
import { fetchOwnerProduct, updateAvailableQty } from "../api/owner";
import { ErrorNote, Loading, asError, codeOf, localTimeLabel, won } from "../app/shared";
import { PRODUCT_CATEGORY_LABEL } from "./session";
import type { OwnerProductDetail } from "../types";

interface Props {
	productId: number;
	accessToken: string;
	onSaved: () => void;
}

/**
 * O-030 상품 관리 상세 + O-030/O-051 바텀시트. 수량을 0 으로 내리는데 진행 중인 찜이 있으면
 * 서버가 `DISPOSITION_REQUIRED` 로 되돌려보낸다 -- 그 오류가 곧 "찜을 어떻게 할까요?" 시트를
 * 띄우라는 신호다. 화면이 미리 판단하지 않고 서버의 판정을 그대로 따른다.
 */
export function ProductDetailScreen({ productId, accessToken, onSaved }: Props) {
	const [product, setProduct] = useState<OwnerProductDetail | null>(null);
	const [qty, setQty] = useState(0);
	const [confirming, setConfirming] = useState(false);
	const [askDisposition, setAskDisposition] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		let active = true;
		fetchOwnerProduct(productId, accessToken)
			.then((detail) => {
				if (active) {
					setProduct(detail);
					setQty(detail.availableQty);
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

	async function save(disposition: "KEEP_HOLDS" | "CANCEL_ALL" | null) {
		setBusy(true);
		setError(null);
		try {
			const updated = await updateAvailableQty(productId, qty, disposition, accessToken);
			setProduct(updated);
			setQty(updated.availableQty);
			setConfirming(false);
			setAskDisposition(false);
			setSaved(true);
			onSaved();
		} catch (caught) {
			const failure = asError(caught);
			if (codeOf(failure) === "DISPOSITION_REQUIRED") {
				setConfirming(false);
				setAskDisposition(true);
			} else {
				setError(failure);
				setConfirming(false);
				setAskDisposition(false);
			}
		} finally {
			setBusy(false);
		}
	}

	if (askDisposition) {
		return (
			<div className="app-screen">
				<div className="sheet">
					<h3 className="app-title" style={{ fontSize: 18 }}>
						진행 중인 찜이 있어요.
						<br />
						어떻게 할까요?
					</h3>
					<p className="app-sub">
						수량을 0 으로 내리면 손님께는 숨겨집니다. 이미 잡혀 있는 찜은 그대로 둘지, 전부
						취소할지 서버가 물어봅니다(<code>DISPOSITION_REQUIRED</code>).
					</p>
					{error && <ErrorNote error={error} />}
					<button
						className="phone__cta"
						type="button"
						disabled={busy}
						onClick={() => save("KEEP_HOLDS")}
					>
						찜은 그대로 두기 (KEEP_HOLDS)
					</button>
					<button
						className="phone__cta phone__cta--ghost"
						type="button"
						disabled={busy}
						onClick={() => save("CANCEL_ALL")}
					>
						찜 전부 취소하고 안내 보내기 (CANCEL_ALL)
					</button>
					<button
						className="phone__cta phone__cta--ghost"
						type="button"
						disabled={busy}
						onClick={() => setAskDisposition(false)}
					>
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
						<span className="owner-accent">{qty}개</span>가 맞나요?
					</h3>
					<p className="app-sub">
						{qty === 0 ? "재고가 없으면 손님께 숨겨져요." : product.name}
					</p>
					{qty > 0 && qty < product.heldQty && (
						<p className="state state--error">
							이미 잡힌 찜이 {product.heldQty}개라 {product.heldQty - qty}개가 부족합니다. 지금
							서버는 <strong>선별 취소를 지원하지 않아</strong>(O-042 미구현) 수량만 내려가고 찜은
							그대로 남습니다.
						</p>
					)}
					{error && <ErrorNote error={error} />}
					<div className="owner-sheet__actions">
						<button
							className="phone__cta phone__cta--ghost"
							type="button"
							disabled={busy}
							onClick={() => setConfirming(false)}
						>
							아니요
						</button>
						<button className="phone__cta" type="button" disabled={busy} onClick={() => save(null)}>
							{busy ? "저장 중…" : "네, 맞아요"}
						</button>
					</div>
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
			<p className="app-hint">현재 시점에서 판매 가능한 개수를 입력해주세요.</p>
			<div className="stepper__controls">
				<button
					className="stepper__button"
					type="button"
					disabled={qty <= 0}
					onClick={() => setQty((current) => current - 1)}
				>
					−
				</button>
				<strong>{qty}</strong>
				<button
					className="stepper__button"
					type="button"
					onClick={() => setQty((current) => current + 1)}
				>
					+
				</button>
			</div>
			{qty === 0 && <p className="owner-warn">⚠️ 수량을 0으로 변경하면 손님께는 숨겨져요.</p>}

			{error && <ErrorNote error={error} />}
			{saved && <p className="state">저장했습니다.</p>}

			<button
				className="phone__cta"
				type="button"
				disabled={busy || qty === product.availableQty}
				onClick={() => {
					setSaved(false);
					setConfirming(true);
				}}
			>
				저장하기
			</button>

			<p className="app-hint">
				재고 재확인(O-050 · O-051)의 <code>네/아니요</code> 는 이 화면과 같은
				<code>PATCH /owner/products/{"{id}"}/available-qty</code> 로 처리됩니다. 다만 요청을
				<strong> 보내는 쪽(배치)과 답변을 기록하는 엔드포인트</strong>가 아직 없어
				<code>reconfirm_answered_at</code> 은 채워지지 않습니다.
			</p>
		</div>
	);
}
