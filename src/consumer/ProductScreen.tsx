import { useCallback, useState } from "react";
import { addToHold, fetchProductDetail } from "../api/holds";
import { useAsync } from "../hooks/useAsync";
import type { HoldButtonState, HoldDetail } from "../types";
import { ErrorNote, Loading, asError, localTimeLabel, won } from "../app/shared";
import type { Position } from "./HomeScreen";

/** 서버 정책(hold.user-qty-limit)과 같은 값. 더 담기로 우회되지 않는다. */
const MAX_QTY = 3;

const CTA: Record<HoldButtonState, string> = {
	AVAILABLE: "찜하기",
	ALREADY_HOLDING: "진행 중인 찜 보기",
	OTHER_STORE: "다른 가게에서 찜이 진행 중이에요",
	SOLD_OUT: "품절됐어요",
	CLOSED: "지금은 찜할 수 없어요",
};

interface Props {
	productId: number;
	position: Position;
	accessToken: string;
	canHold: boolean;
	onHeld: (hold: HoldDetail) => void;
	onOpenHold: (holdId: number) => void;
	onRequireLogin: () => void;
}

export function ProductScreen({
	productId,
	position,
	accessToken,
	canHold,
	onHeld,
	onOpenHold,
	onRequireLogin,
}: Props) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const [qty, setQty] = useState(1);
	const [submitting, setSubmitting] = useState(false);
	const [holdError, setHoldError] = useState<Error | null>(null);
	const [reload, setReload] = useState(0);

	const detail = useAsync(
		() => fetchProductDetail(productId, accessToken, position.lat, position.lng),
		[productId, accessToken, position.lat, position.lng, reload],
	);

	const submit = useCallback(async () => {
		setSubmitting(true);
		setHoldError(null);
		try {
			onHeld(await addToHold(productId, qty, accessToken));
		} catch (caught) {
			setHoldError(asError(caught));
			setSheetOpen(false);
			setReload((count) => count + 1);
		} finally {
			setSubmitting(false);
		}
	}, [productId, qty, accessToken, onHeld]);

	if (detail.loading) {
		return <Loading />;
	}
	if (detail.error) {
		return <ErrorNote error={detail.error} />;
	}
	if (!detail.data) {
		return null;
	}

	const product = detail.data;
	const state = product.holdButton;
	const sellable = state === "AVAILABLE";

	return (
		<div className="app-screen app-screen--flush">
			<div className="phone__hero">
				<img src={product.photoUrls[0]} alt="" />
				<span className="phone__discount">{product.discountRate}%</span>
			</div>

			<div className="phone__body">
				{product.tags.length > 0 && (
					<div className="phone__tags">
						{product.tags.map((tag) => (
							<span className="phone__tag" key={tag}>
								#{tag}
							</span>
						))}
					</div>
				)}
				<div className="phone__name">{product.name}</div>
				<div className="phone__price">
					<span className="phone__rate">{product.discountRate}%</span>
					<span className="phone__sale">{won(product.salePrice)}</span>
					<s>{won(product.originalPrice)}</s>
				</div>

				<div className="phone__rows">
					<div className="phone__row">
						<strong>픽업</strong>
						{localTimeLabel(product.pickupStartAt)} ~ {localTimeLabel(product.pickupEndAt)}
					</div>
					<div className="phone__row">
						<strong>남은 수량</strong>
						{product.availableQty}개
					</div>
					<div className="phone__row">
						<strong>{product.store.name}</strong>
						{product.store.distanceMeters === null
							? product.store.address
							: `${product.store.distanceMeters}m · 도보 ${product.store.walkingMinutes}분`}
					</div>
					<div className="phone__row">
						<strong>영업</strong>
						{product.store.businessOpenTime.slice(0, 5)} ~{" "}
						{product.store.businessCloseTime.slice(0, 5)}
						{product.store.openNow ? " · 영업 중" : " · 영업 종료"}
					</div>
				</div>

				{product.recipes.length > 0 && (
					<div>
						<div className="panel__title" style={{ marginBottom: 6 }}>
							이 재료로 만들 수 있어요
						</div>
						{product.recipes.map((recipe) => (
							<div className="recipe-row" key={recipe.id}>
								{recipe.imageThumbUrl && <img src={recipe.imageThumbUrl} alt="" />}
								<span>
									{recipe.title}
									{recipe.cookTimeMinutes ? ` · ${recipe.cookTimeMinutes}분` : ""}
								</span>
							</div>
						))}
					</div>
				)}

				{holdError && <ErrorNote error={holdError} />}

				{sheetOpen ? (
					<div className="sheet">
						<div className="stepper">
							<span>수량</span>
							<span className="stepper__controls">
								<button
									className="stepper__button"
									type="button"
									disabled={qty <= 1}
									onClick={() => setQty((current) => current - 1)}
								>
									−
								</button>
								<b>{qty}</b>
								<button
									className="stepper__button"
									type="button"
									disabled={qty >= Math.min(MAX_QTY, product.availableQty)}
									onClick={() => setQty((current) => current + 1)}
								>
									+
								</button>
							</span>
						</div>
						<div className="phone__row">
							<strong>결제 예정</strong>
							{won(product.salePrice * qty)}
						</div>
						<p className="app-hint">
							찜하면 <strong>15분간</strong> 보관됩니다. 픽업 마감이 더 가까우면 그때까지만
							보관됩니다.
						</p>
						<button
							className="phone__cta phone__cta--confirm"
							type="button"
							disabled={submitting}
							onClick={submit}
						>
							{submitting ? "찜하는 중…" : `${qty}개 찜하기`}
						</button>
						<button
							className="phone__cta phone__cta--ghost"
							type="button"
							onClick={() => setSheetOpen(false)}
						>
							닫기
						</button>
					</div>
				) : (
					<button
						className="phone__cta"
						type="button"
						disabled={!sellable && state !== "ALREADY_HOLDING"}
						onClick={() => {
							if (state === "ALREADY_HOLDING" && product.myHoldId !== null) {
								onOpenHold(product.myHoldId);
								return;
							}
							if (!canHold) {
								onRequireLogin();
								return;
							}
							setQty(1);
							setHoldError(null);
							setSheetOpen(true);
						}}
					>
						{CTA[state]}
					</button>
				)}
			</div>
		</div>
	);
}
