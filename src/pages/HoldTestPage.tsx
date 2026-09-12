import { useCallback, useEffect, useState } from "react";
import { fetchNearbyProducts } from "../api/browse";
import { ApiError } from "../api/client";
import { issueTestToken } from "../api/devToken";
import {
	addToHold,
	cancelHold,
	fetchActiveHold,
	fetchHoldHistory,
	fetchProductDetail,
} from "../api/holds";
import { clearConsumerToken, getConsumerToken, storeConsumerToken } from "../auth/consumerToken";
import { useAsync } from "../hooks/useAsync";
import type {
	HoldButtonState,
	HoldDetail,
	HoldHistory,
	HoldStatus,
	ProductBrowseDetail,
} from "../types";

// 서버 정책(hold.user-qty-limit)과 같은 값. 상품 하나당 상한이고, 더 담기로 우회되지 않는다.
const MAX_QTY_PER_PRODUCT = 3;

// 서버 정책(hold.cancel-credit-max)과 같은 값. 점 개수를 그리는 데만 쓴다.
const MAX_CANCEL_CREDITS = 3;

const HISTORY_PAGE_SIZE = 10;

const HISTORY_STATUS_LABEL: Record<HoldStatus, string> = {
	HOLDING: "진행 중",
	COMPLETED: "수령 완료",
	CANCELED: "취소",
	EXPIRED: "만료",
};

const HISTORY_STATUS_TAG: Record<HoldStatus, string> = {
	HOLDING: "tag tag--pending",
	COMPLETED: "tag tag--completed",
	CANCELED: "tag tag--rejected",
	EXPIRED: "tag tag--expired",
};

const PRESETS = [
	{ label: "매장 3곳", lat: 37.5069, lng: 127.0365 },
	{ label: "2곳", lat: 37.5006, lng: 127.0365 },
	{ label: "1곳", lat: 37.495, lng: 127.0365 },
];

const CTA_LABEL: Record<HoldButtonState, string> = {
	AVAILABLE: "찜하기",
	ALREADY_HOLDING: "이미 담은 상품이에요",
	OTHER_STORE: "다른 가게에서 찜이 진행 중이에요",
	SOLD_OUT: "품절되었어요",
	CLOSED: "픽업이 마감되었어요",
};

function won(value: number): string {
	return `${value.toLocaleString()}원`;
}

function clockLabel(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function timeLabel(isoLocalDateTime: string): string {
	return isoLocalDateTime.slice(11, 16);
}

// heldAt 은 LocalDateTime 이 아니라 Instant 라 문자열을 자르면 UTC 가 나온다 -- 브라우저 시간대로 옮긴다.
function momentLabel(instant: string): string {
	return new Date(instant).toLocaleString("ko-KR", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function asError(caught: unknown): Error {
	return caught instanceof Error ? caught : new Error(String(caught));
}

// 종료된 찜의 문구는 서버가 내린 status 를 그대로 옮긴다 — 화면이 스스로 판정하지 않는다.
function settledLabel(hold: HoldDetail): { clock: string; caption: string } {
	if (hold.status === "EXPIRED") {
		return { clock: "만료됨", caption: "시간이 지나 자동 취소됐어요" };
	}
	if (hold.status === "COMPLETED") {
		return { clock: "수령 완료", caption: "픽업이 완료됐어요" };
	}
	return {
		clock: "취소됨",
		caption: hold.canceledBy === "OWNER" ? "점주가 취소했어요" : "내가 취소했어요",
	};
}

function ErrorView({ error }: { error: Error }) {
	const code = error instanceof ApiError ? error.code : null;
	const fieldErrors = error instanceof ApiError ? error.fieldErrors : null;
	const retryAt = error instanceof ApiError ? error.retryAt : null;
	return (
		<div className="state state--error" style={{ textAlign: "left", padding: "10px 0" }}>
			<strong>
				{code ? `${code} — ` : ""}
				{error.message}
			</strong>
			{retryAt && (
				<div style={{ marginTop: 4 }}>
					{new Date(retryAt).toLocaleString("ko-KR", {
						month: "numeric",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}
					부터 다시 담을 수 있어요
				</div>
			)}
			{fieldErrors && (
				<ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
					{Object.entries(fieldErrors).map(([field, message]) => (
						<li key={field}>
							<code>{field}</code>: {message}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/**
 * GET /holds. 진행 중인 찜은 계정당 하나뿐이라 상태 필터 없이 최신순으로만 내려온다 --
 * 목록의 status 도 지연 만료로 판정되므로 배치 전 만료 건이 EXPIRED 로 보인다.
 */
function HoldHistoryPanel({ token, reloadKey }: { token: string; reloadKey: number }) {
	const [page, setPage] = useState(0);
	const [state, setState] = useState<{
		loading: boolean;
		data: HoldHistory | null;
		error: Error | null;
	}>({ loading: true, data: null, error: null });

	useEffect(() => {
		let cancelled = false;
		setState((current) => ({ ...current, loading: true }));
		fetchHoldHistory({ page, size: HISTORY_PAGE_SIZE }, token)
			.then((data) => {
				if (!cancelled) {
					setState({ loading: false, data, error: null });
				}
			})
			.catch((caught) => {
				if (!cancelled) {
					setState({ loading: false, data: null, error: asError(caught) });
				}
			});
		return () => {
			cancelled = true;
		};
	}, [token, page, reloadKey]);

	if (state.loading && !state.data) {
		return <div className="state">불러오는 중…</div>;
	}
	if (state.error) {
		return <ErrorView error={state.error} />;
	}
	if (!state.data || state.data.holds.content.length === 0) {
		return <div className="state">아직 찜한 내역이 없습니다.</div>;
	}

	const { holds } = state.data;
	return (
		<>
			<div className="history">
				{holds.content.map((entry) => (
					<div className="history__item" key={entry.id}>
						<div className="history__head">
							<span>{entry.storeName}</span>
							<span className={HISTORY_STATUS_TAG[entry.status]}>
								{HISTORY_STATUS_LABEL[entry.status]}
							</span>
						</div>
						<div className="table__muted">
							{entry.items.map((item) => `${item.name} ${item.qty}개`).join(" · ")}
						</div>
						<div className="history__meta">
							찜 #{entry.id} · {entry.totalQty}개 · {won(entry.totalPrice)} ·{" "}
							{momentLabel(entry.heldAt)}
						</div>
					</div>
				))}
			</div>
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
					{holds.totalElements}건 · {page + 1}/{holds.totalPages}
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
		</>
	);
}

export function HoldTestPage() {
	const [token, setToken] = useState<string | null>(() => getConsumerToken());
	const [identity, setIdentity] = useState<{ userId: number; nickname: string } | null>(null);
	const [tokenError, setTokenError] = useState<Error | null>(null);
	const [issuing, setIssuing] = useState(false);
	const [position, setPosition] = useState(PRESETS[0]);
	const [productId, setProductId] = useState<number | null>(null);
	const [detail, setDetail] = useState<ProductBrowseDetail | null>(null);
	const [detailError, setDetailError] = useState<Error | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [qty, setQty] = useState(1);
	const [submitting, setSubmitting] = useState(false);
	const [canceling, setCanceling] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [holdError, setHoldError] = useState<Error | null>(null);
	// 진행 중인 찜은 계정당 하나뿐이다. 카운트다운은 serverTime 오프셋으로 화면이 센다.
	const [hold, setHold] = useState<{ detail: HoldDetail; receivedAt: number } | null>(null);
	const [tick, setTick] = useState(() => Date.now());
	const [productsReload, setProductsReload] = useState(0);
	const [credits, setCredits] = useState<{ left: number; nextAt: string | null } | null>(null);
	const [sideTab, setSideTab] = useState<"picker" | "history">("picker");

	const { lat, lng } = position;

	const nearby = useAsync(
		useCallback(
			() => fetchNearbyProducts({ lat, lng, sort: "DISTANCE", page: 0, size: 50 }),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[lat, lng, productsReload],
		),
		[lat, lng, productsReload],
	);

	const storeGroups = nearby.data?.stores.content ?? [];
	const productCount = storeGroups.reduce((sum, store) => sum + store.products.length, 0);

	const loadDetail = useCallback(
		async (id: number) => {
			try {
				const loaded = await fetchProductDetail(id, token ?? undefined, lat, lng);
				setDetail(loaded);
				setDetailError(null);
			} catch (caught) {
				setDetail(null);
				setDetailError(asError(caught));
			}
		},
		[token, lat, lng],
	);

	const loadActiveHold = useCallback(async () => {
		if (!token) {
			setHold(null);
			return null;
		}
		try {
			const active = await fetchActiveHold(token);
			setHold(active.hold ? { detail: active.hold, receivedAt: Date.now() } : null);
			setCredits({ left: active.cancelsLeft, nextAt: active.nextCancelCreditAt });
			return active.hold;
		} catch {
			return null;
		}
	}, [token]);

	// 새로고침해도 카운트다운이 이어지도록, 열자마자 진행 중인 찜을 서버에 묻는다.
	useEffect(() => {
		void loadActiveHold();
	}, [loadActiveHold]);

	useEffect(() => {
		if (productId !== null) {
			// eslint-disable-next-line react/set-state-in-effect
			void loadDetail(productId);
		}
	}, [productId, loadDetail]);

	useEffect(() => {
		if (!hold || hold.detail.status !== "HOLDING") {
			return;
		}
		const timer = window.setInterval(() => setTick(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [hold]);

	const remainingMs = hold
		? new Date(hold.detail.expiresAt).getTime() -
			(new Date(hold.detail.serverTime).getTime() + (tick - hold.receivedAt))
		: 0;

	const activeHold = hold && hold.detail.status === "HOLDING" ? hold.detail : null;
	const heldQtyOfProduct =
		activeHold && detail
			? (activeHold.items.find((item) => item.productId === detail.id)?.qty ?? 0)
			: 0;
	const maxQty = detail
		? Math.min(detail.availableQty, MAX_QTY_PER_PRODUCT - heldQtyOfProduct)
		: MAX_QTY_PER_PRODUCT;

	async function requestTestToken() {
		setIssuing(true);
		setTokenError(null);
		try {
			const issued = await issueTestToken("CONSUMER");
			storeConsumerToken(issued.accessToken);
			setToken(issued.accessToken);
			setIdentity({ userId: issued.userId, nickname: issued.nickname });
			setHoldError(null);
		} catch (caught) {
			setTokenError(asError(caught));
		} finally {
			setIssuing(false);
		}
	}

	function forgetToken() {
		clearConsumerToken();
		setToken(null);
		setIdentity(null);
		setHold(null);
	}

	function selectProduct(id: number) {
		setProductId(id);
		setSheetOpen(false);
		setQty(1);
		setHoldError(null);
	}

	function openSheet() {
		setHoldError(null);
		setQty(1);
		setSheetOpen(true);
	}

	async function submitHold() {
		if (!token || productId === null) {
			return;
		}
		setSubmitting(true);
		setHoldError(null);
		try {
			setHold({ detail: await addToHold(productId, qty, token), receivedAt: Date.now() });
			setSheetOpen(false);
			setProductsReload((count) => count + 1);
			await loadDetail(productId);
			await loadActiveHold();
		} catch (caught) {
			setHoldError(asError(caught));
			await loadDetail(productId);
		} finally {
			setSubmitting(false);
		}
	}

	async function cancelCurrentHold() {
		if (!hold || !token) {
			return;
		}
		setCanceling(true);
		setHoldError(null);
		try {
			const canceled = await cancelHold(hold.detail.id, token);
			setProductsReload((count) => count + 1);
			await loadActiveHold();
			setHold({ detail: canceled, receivedAt: Date.now() });
		} catch (caught) {
			setHoldError(asError(caught));
		} finally {
			setCanceling(false);
			if (productId !== null) {
				await loadDetail(productId);
			}
		}
	}

	async function refreshFromServer() {
		setRefreshing(true);
		try {
			await loadActiveHold();
			setProductsReload((count) => count + 1);
			if (productId !== null) {
				await loadDetail(productId);
			}
		} finally {
			setRefreshing(false);
		}
	}

	function openHeldProduct() {
		if (activeHold && activeHold.items.length > 0) {
			selectProduct(activeHold.items[0].productId);
		}
	}

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">찜 API 테스트</h1>
				<span className="page-count">
					{activeHold ? `진행 중 · ${activeHold.store.name}` : "진행 중인 찜 없음"}
				</span>
			</div>

			<p className="notice">
				찜은 <strong>한 가게에서의 한 번의 픽업</strong>입니다 — 같은 가게 상품은 같은 찜에 더
				담기고, 진행 중인 찜은 계정당 하나뿐입니다. 카운트다운은 서버가 준{" "}
				<code>expiresAt</code>·<code>serverTime</code>으로 화면이 셉니다(폴링 없음). 배치가
				정리한 결과는 <strong>서버 상태 확인</strong>으로 봅니다.
			</p>

			<div className="hold-lab">
				<div className="hold-lab__side">
					<section className="panel">
						<h2 className="panel__title">소비자 토큰</h2>
						{token ? (
							<>
								<div className="phone__row">
									<strong>{identity ? identity.nickname : "저장된 토큰"}</strong>
									{identity ? `#${identity.userId}` : "이 브라우저에 남아 있던 토큰"}
								</div>
								<pre className="token-box" style={{ margin: 0 }}>
									{`${token.slice(0, 20)}…${token.slice(-10)}`}
								</pre>
								<div className="row-actions">
									<button
										className="button button--small"
										type="button"
										disabled={issuing}
										onClick={requestTestToken}
									>
										{issuing ? "발급 중…" : "다시 발급"}
									</button>
									<button className="button button--small" type="button" onClick={forgetToken}>
										지우기
									</button>
								</div>
							</>
						) : (
							<>
								<p className="field__hint" style={{ margin: 0 }}>
									로컬 백엔드가 테스트용 소비자 계정을 만들어 access 토큰을 내려줍니다
									(<code>POST /dev/test-token</code>).
								</p>
								<button
									className="button button--primary"
									type="button"
									disabled={issuing}
									onClick={requestTestToken}
								>
									{issuing ? "발급 중…" : "테스트 소비자 토큰 발급"}
								</button>
							</>
						)}
						{tokenError && <ErrorView error={tokenError} />}
					</section>

					<section className="panel">
						<h2 className="panel__title">기준 위치</h2>
						<div className="filters" style={{ marginBottom: 0 }}>
							{PRESETS.map((preset) => (
								<button
									key={preset.label}
									type="button"
									className={preset.lat === lat ? "chip chip--active" : "chip"}
									onClick={() => setPosition(preset)}
								>
									{preset.label}
								</button>
							))}
						</div>
						<p className="field__hint" style={{ margin: 0 }}>
							상세의 거리·도보 시간이 이 좌표 기준으로 계산됩니다.
						</p>
					</section>

					{credits && (
						<section className="panel">
							<h2 className="panel__title">취소 가능 횟수</h2>
							<div className="credits">
								{Array.from({ length: MAX_CANCEL_CREDITS }, (_, index) => (
									<span
										key={index}
										className={index < credits.left ? "credits__dot credits__dot--left" : "credits__dot"}
									/>
								))}
								<strong>{credits.left}회 남음</strong>
							</div>
							<p className="field__hint" style={{ margin: 0 }}>
								{credits.nextAt
									? `하루에 1회씩 최대 ${MAX_CANCEL_CREDITS}회까지 충전됩니다. 다음 충전 ${new Date(
											credits.nextAt,
										).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
									: `가득 차 있습니다. 취소하거나 노쇼가 확정되면 한 칸씩 줄어듭니다.`}
							</p>
						</section>
					)}

					{activeHold && (
						<section className="panel">
							<h2 className="panel__title">진행 중인 찜 · GET /holds/active</h2>
							<div className="phone__row">
								<strong>{activeHold.store.name}</strong>
								찜 #{activeHold.id} · {activeHold.totalQty}개 · {won(activeHold.totalPrice)}
							</div>
							<div className="phone__row">
								<strong>가게</strong>
								{activeHold.store.businessOpenTime.slice(0, 5)} ~{" "}
								{activeHold.store.businessCloseTime.slice(0, 5)}
								{activeHold.store.openNow ? " · 영업 중" : " · 영업 종료"}
							</div>
							{activeHold.items.map((item) => (
								<button
									key={item.productId}
									type="button"
									className={
										item.productId === productId
											? "picker__item picker__item--active"
											: "picker__item"
									}
									onClick={() => selectProduct(item.productId)}
								>
									<img className="picker__thumb" src={item.photoUrl} alt="" />
									<span className="picker__name">
										{item.name}
										<br />
										<span className="table__muted">
											{item.qty}개 · {won(item.lineTotal)}
										</span>
									</span>
								</button>
							))}
							<p className="field__hint" style={{ margin: 0 }}>
								같은 가게 상품만 이 찜에 더 담을 수 있습니다.
							</p>
						</section>
					)}

					<section className="panel">
						<div className="tabs">
							<button
								type="button"
								className={sideTab === "picker" ? "tabs__tab tabs__tab--active" : "tabs__tab"}
								onClick={() => setSideTab("picker")}
							>
								상품 선택
							</button>
							<button
								type="button"
								className={sideTab === "history" ? "tabs__tab tabs__tab--active" : "tabs__tab"}
								onClick={() => setSideTab("history")}
							>
								찜 내역 · GET /holds
							</button>
						</div>
						{sideTab === "history" && token && (
							<HoldHistoryPanel token={token} reloadKey={productsReload} />
						)}
						{sideTab === "history" && !token && (
							<div className="state">토큰을 발급하면 내역을 불러옵니다.</div>
						)}
						{sideTab === "picker" && (
						<>
						{nearby.loading && <div className="state">불러오는 중…</div>}
						{nearby.error && <ErrorView error={nearby.error} />}
						{!nearby.loading && !nearby.error && productCount === 0 && (
							<div className="state">반경 1km 안에 판매 중인 상품이 없습니다.</div>
						)}
						<div className="picker">
							{storeGroups.map((store) => (
								<div className="picker__group" key={store.storeId}>
									<div className="picker__store">
										<strong>{store.storeName}</strong>
										<span className="table__muted">
											{store.distanceMeters}m · 도보 {store.walkingMinutes}분 ·{" "}
											{store.productCount}개
										</span>
									</div>
									{store.products.map((item) => (
										<button
											key={item.id}
											type="button"
											className={
												item.id === productId
													? "picker__item picker__item--active"
													: "picker__item"
											}
											onClick={() => selectProduct(item.id)}
										>
											<img className="picker__thumb" src={item.photoUrl} alt="" />
											<span className="picker__name">
												{item.name}
												<br />
												<span className="table__muted">
													{item.availableQty}개 · {item.discountRate}%
												</span>
											</span>
										</button>
									))}
								</div>
							))}
						</div>
						</>
						)}
					</section>
				</div>

				<div>
					{productId === null && <div className="state">왼쪽에서 상품을 고르세요.</div>}
					{detailError && <ErrorView error={detailError} />}
					{detail && (
						<div className="phone">
							<div className="phone__hero">
								{detail.photoUrls[0] && <img src={detail.photoUrls[0]} alt="" />}
								<span className="phone__discount">{detail.discountRate}%</span>
							</div>

							<div className="phone__body">
								<div className="phone__tags">
									{detail.tags.map((tag) => (
										<span className="phone__tag" key={tag}>
											#{tag}
										</span>
									))}
								</div>

								<h2 className="phone__name">{detail.name}</h2>

								<div className="phone__price">
									<span className="phone__rate">{detail.discountRate}%</span>
									<span className="phone__sale">{won(detail.salePrice)}</span>
									<s>{won(detail.originalPrice)}</s>
								</div>

								<div className="phone__rows">
									<div className="phone__row">
										<strong>픽업</strong>
										{timeLabel(detail.pickupStartAt)} ~ {timeLabel(detail.pickupEndAt)}
									</div>
									<div className="phone__row">
										<strong>남은 수량</strong>
										{detail.availableQty}개 · {detail.status}
									</div>
									<div className="phone__row">
										<strong>{detail.store.name}</strong>
										{detail.store.distanceMeters === null
											? detail.store.address
											: `${detail.store.distanceMeters}m · 도보 ${detail.store.walkingMinutes}분`}
									</div>
									<div className="phone__row">
										<strong>영업</strong>
										{detail.store.businessOpenTime.slice(0, 5)} ~{" "}
										{detail.store.businessCloseTime.slice(0, 5)}
										{detail.store.openNow ? " · 영업 중" : " · 영업 종료"}
									</div>
								</div>

								{detail.recipes.length > 0 && (
									<div>
										<div className="panel__title" style={{ marginBottom: 4 }}>
											이 재료로 만들 수 있어요
										</div>
										{detail.recipes.map((recipe) => (
											<div className="recipe-row" key={recipe.id}>
												{recipe.imageThumbUrl && (
													<img className="recipe-row__thumb" src={recipe.imageThumbUrl} alt="" />
												)}
												<span className="picker__name">
													{recipe.title}
													<br />
													<span className="table__muted">
														{recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes}분 · ` : ""}
														{recipe.ingredientNames.slice(0, 3).join(", ")}
													</span>
												</span>
											</div>
										))}
									</div>
								)}

								{holdError && <ErrorView error={holdError} />}

								{sheetOpen ? (
									<div className="sheet">
										<div className="stepper">
											<span>수량</span>
											<div className="stepper__controls">
												<button
													className="stepper__button"
													type="button"
													disabled={qty <= 1}
													onClick={() => setQty(qty - 1)}
												>
													−
												</button>
												<strong>{qty}</strong>
												<button
													className="stepper__button"
													type="button"
													disabled={qty >= maxQty}
													onClick={() => setQty(qty + 1)}
												>
													+
												</button>
											</div>
										</div>
										<div className="phone__row">
											<strong>이 상품 금액</strong>
											{won(detail.salePrice * qty)}
										</div>
										<p className="field__hint" style={{ margin: 0 }}>
											{activeHold
												? `기존 찜(${activeHold.store.name})에 더 담깁니다. 만료 시각은 ${clockLabel(
														remainingMs,
													)} 그대로예요.`
												: "찜은 최대 15분 유지되며(픽업 마감이 더 이르면 그때까지), 지나면 자동 취소됩니다."}{" "}
											상품당 최대 {MAX_QTY_PER_PRODUCT}개
											{heldQtyOfProduct > 0 ? ` (이미 ${heldQtyOfProduct}개 담음)` : ""}.
										</p>
										<button
											className="phone__cta phone__cta--confirm"
											type="button"
											disabled={submitting || !token || maxQty < 1}
											onClick={submitHold}
										>
											{submitting ? "요청 중…" : activeHold ? `${qty}개 더 담기` : `${qty}개 찜하기`}
										</button>
									</div>
								) : (
									<button
										className="phone__cta"
										type="button"
										disabled={
											!token ||
											(detail.holdButton !== "AVAILABLE" &&
												!(detail.holdButton === "ALREADY_HOLDING" && maxQty > 0))
										}
										onClick={openSheet}
									>
										{!token
											? "소비자 토큰을 먼저 발급하세요"
											: detail.holdButton === "ALREADY_HOLDING" && maxQty > 0
												? `더 담기 (이미 ${heldQtyOfProduct}개)`
												: CTA_LABEL[detail.holdButton]}
									</button>
								)}

								{detail.holdButton === "OTHER_STORE" && activeHold && (
									<button className="button button--small" type="button" onClick={openHeldProduct}>
										진행 중인 찜 보기 ({activeHold.store.name})
									</button>
								)}

								{hold && (
									<div className="sheet">
										{hold.detail.status === "HOLDING" ? (
											<>
												<div
													className={
														remainingMs <= 0
															? "countdown countdown--done"
															: remainingMs < 5 * 60 * 1000
																? "countdown countdown--hurry"
																: "countdown countdown--calm"
													}
												>
													<div className="countdown__clock">{clockLabel(remainingMs)}</div>
													<div className="countdown__caption">
														{remainingMs > 0
															? `찜 #${hold.detail.id} · ${hold.detail.store.name} · ${hold.detail.totalQty}개 · ${won(hold.detail.totalPrice)}`
															: "시간이 지나 자동 취소됐어요 — 재고 복원은 만료 배치가 합니다"}
													</div>
												</div>
												<div className="row-actions" style={{ justifyContent: "center" }}>
													{remainingMs > 0 ? (
														<button
															className="phone__cta phone__cta--ghost"
															type="button"
															disabled={canceling}
															onClick={cancelCurrentHold}
														>
															{canceling ? "취소 중…" : "찜 취소 (전체)"}
														</button>
													) : (
														<button
															className="button button--small"
															type="button"
															disabled={refreshing}
															onClick={refreshFromServer}
														>
															{refreshing ? "확인 중…" : "서버 상태 확인"}
														</button>
													)}
												</div>
											</>
										) : (
											<div className="countdown countdown--done">
												<div className="countdown__clock">{settledLabel(hold.detail).clock}</div>
												<div className="countdown__caption">
													{`찜 #${hold.detail.id} · ${settledLabel(hold.detail).caption}`}
												</div>
												<button
													className="button button--small"
													type="button"
													onClick={() => {
														setHold(null);
														setProductsReload((count) => count + 1);
													}}
												>
													다시 담아보기
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
