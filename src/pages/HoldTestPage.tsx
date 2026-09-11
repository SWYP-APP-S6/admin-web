import { useCallback, useEffect, useState } from "react";
import { fetchNearbyProducts } from "../api/browse";
import { ApiError } from "../api/client";
import { issueTestToken } from "../api/devToken";
import { cancelHold, createHold, fetchProductDetail } from "../api/holds";
import { clearConsumerToken, getConsumerToken, storeConsumerToken } from "../auth/consumerToken";
import { useAsync } from "../hooks/useAsync";
import type { HoldButtonState, ProductBrowseDetail, HoldDetail } from "../types";

// 서버 정책(hold.user-qty-limit)과 같은 값. 화면은 보기 좋으라고 막아둘 뿐이고, 초과 요청의
// 최종 판정은 서버가 한다 — 값을 바꿔 400 HOLD_LIMIT_EXCEEDED 를 직접 확인할 수 있다.
const MAX_QTY = 3;

const PRESETS = [
	{ label: "매장 3곳", lat: 37.5069, lng: 127.0365 },
	{ label: "2곳", lat: 37.5006, lng: 127.0365 },
	{ label: "1곳", lat: 37.495, lng: 127.0365 },
];

const HOLD_BUTTON_LABEL: Record<HoldButtonState, string> = {
	AVAILABLE: "찜하기",
	ALREADY_HOLDING: "이미 찜한 상품이에요",
	SOLD_OUT: "품절되었어요",
	CLOSED: "픽업이 마감되었어요",
};

function won(value: number): string {
	return `${value.toLocaleString()}원`;
}

function clockLabel(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	const minutes = String(Math.floor(total / 60)).padStart(2, "0");
	const seconds = String(total % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

function timeLabel(isoLocalDateTime: string): string {
	return isoLocalDateTime.slice(11, 16);
}

function asError(caught: unknown): Error {
	return caught instanceof Error ? caught : new Error(String(caught));
}

function ErrorView({ error }: { error: Error }) {
	const code = error instanceof ApiError ? error.code : null;
	const fieldErrors = error instanceof ApiError ? error.fieldErrors : null;
	return (
		<div className="state state--error" style={{ textAlign: "left", padding: "10px 0" }}>
			<strong>
				{code ? `${code} — ` : ""}
				{error.message}
			</strong>
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
	const [holdError, setHoldError] = useState<Error | null>(null);
	// 서버 시각 기준으로 카운트다운하려고 응답을 받은 로컬 시각을 함께 들고 있는다.
	const [hold, setHold] = useState<{ detail: HoldDetail; receivedAt: number } | null>(null);
	const [tick, setTick] = useState(() => Date.now());
	// 찜이 재고를 줄이므로 왼쪽 목록의 "N개"도 같이 다시 불러야 한다.
	const [productsReload, setProductsReload] = useState(0);

	const { lat, lng } = position;

	// 상품 목록은 관리자 토큰으로 부른다 — 탐색 API 는 ADMIN 에게도 열려 있고, 여기서는
	// "어떤 상품을 테스트할지" 고르는 용도라 소비자 신원이 필요 없다.
	const nearby = useAsync(
		useCallback(
			() => fetchNearbyProducts({ lat, lng, sort: "DISTANCE", page: 0, size: 50 }),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[lat, lng, productsReload],
		),
		[lat, lng, productsReload],
	);

	// 목록 API 가 매장 단위로 묶어 내려주므로(NearbyStoreGroup) 화면도 그 구조를 유지한다.
	const storeGroups = nearby.data?.stores.content ?? [];
	const productCount = storeGroups.reduce((sum, store) => sum + store.products.length, 0);

	// 상세는 소비자 토큰으로 부른다 — holdButton·myHoldId 는 "보는 사람이 누구인가"에 따라
	// 달라지고, 관리자·게스트 토큰의 주체 id 는 users 의 누구도 가리키지 않는다.
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

	useEffect(() => {
		if (productId !== null) {
			// 상태 변경은 await 뒤, 즉 서버 응답이 온 다음에만 일어난다 — 렌더 연쇄가 아니라
			// 외부 시스템 동기화다.
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

	// 만료 배치가 찜을 풀고 재고를 돌려놓는 것을 화면에서 보려면 상세를 다시 불러야 한다.
	useEffect(() => {
		if (!hold || hold.detail.status !== "HOLDING" || productId === null) {
			return;
		}
		const timer = window.setInterval(() => void loadDetail(productId), 5000);
		return () => window.clearInterval(timer);
	}, [hold, productId, loadDetail]);

	const remainingMs = hold
		? new Date(hold.detail.expiresAt).getTime() -
			(new Date(hold.detail.serverTime).getTime() + (tick - hold.receivedAt))
		: 0;

	function selectProduct(id: number) {
		setProductId(id);
		setSheetOpen(false);
		setQty(1);
		setHold(null);
		setHoldError(null);
	}

	async function requestTestToken() {
		setIssuing(true);
		setTokenError(null);
		try {
			const issued = await issueTestToken("CONSUMER");
			storeConsumerToken(issued.accessToken);
			setToken(issued.accessToken);
			setIdentity({ userId: issued.userId, nickname: issued.nickname });
			setHold(null);
			setHoldError(null);
			if (productId !== null) {
				await loadDetail(productId);
			}
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
			const created = await createHold(productId, qty, token);
			setHold({ detail: created, receivedAt: Date.now() });
			setTick(Date.now());
			setSheetOpen(false);
			setProductsReload((count) => count + 1);
			await loadDetail(productId);
		} catch (caught) {
			setHoldError(asError(caught));
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
			setHold({ detail: await cancelHold(hold.detail.id, token), receivedAt: Date.now() });
			setProductsReload((count) => count + 1);
		} catch (caught) {
			setHoldError(asError(caught));
		} finally {
			setCanceling(false);
			// 성공이든 409 든 상세를 다시 읽는다 — 재고와 holdButton 은 서버가 정한다.
			if (productId !== null) {
				await loadDetail(productId);
			}
		}
	}

	function backToProduct() {
		setHold(null);
		setHoldError(null);
		setProductsReload((count) => count + 1);
	}

	const maxQty = detail ? Math.min(detail.availableQty, MAX_QTY) : MAX_QTY;

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">찜 API 테스트</h1>
				<span className="page-count">
					{productId === null ? "상품 미선택" : `상품 #${productId}`}
				</span>
			</div>

			<p className="notice">
				소비자 화면(상품 상세 → 수량 선택 → 찜 카운트다운)을 그대로 재현합니다. 찜은{" "}
				<strong>소비자 토큰</strong>이 있어야 해서(관리자 토큰으로는 403) 왼쪽에서 테스트용
				토큰을 발급받아 씁니다. 찜을 걸어두면 상세를 5초마다 다시 불러, 만료 배치가 찜을
				정리하고 재고가 돌아오는 것까지 화면에서 볼 수 있습니다.
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
									(<code>POST /dev/test-token</code>). 카카오 로그인은 필요 없습니다.
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

					<section className="panel">
						<h2 className="panel__title">상품 선택</h2>
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
									{store.products.map((product) => (
										<button
											key={product.id}
											type="button"
											className={
												product.id === productId
													? "picker__item picker__item--active"
													: "picker__item"
											}
											onClick={() => selectProduct(product.id)}
										>
											<img className="picker__thumb" src={product.photoUrl} alt="" />
											<span className="picker__name">
												{product.name}
												<br />
												<span className="table__muted">
													{product.availableQty}개 · {product.discountRate}%
												</span>
											</span>
										</button>
									))}
								</div>
							))}
						</div>
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

								{hold && hold.detail.status === "HOLDING" ? (
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
													? `찜 #${hold.detail.id} · ${hold.detail.qty}개 · ${won(hold.detail.totalPrice)} 픽업 대기`
													: detail.myHoldId === hold.detail.id
														? `만료 시각이 지났습니다 — 배치가 찜 #${hold.detail.id}를 정리하면 재고가 돌아옵니다`
														: `배치가 찜 #${hold.detail.id}를 정리했습니다 — 재고가 ${detail.availableQty}개로 돌아왔습니다`}
											</div>
											{remainingMs <= 0 && detail.myHoldId !== hold.detail.id && (
												<button className="button button--small" type="button" onClick={backToProduct}>
													다시 찜해보기
												</button>
											)}
										</div>
										{detail.myHoldId === hold.detail.id && (
											<button
												className="phone__cta phone__cta--ghost"
												type="button"
												disabled={canceling}
												onClick={cancelCurrentHold}
											>
												{canceling ? "취소 중…" : "찜 취소"}
											</button>
										)}
									</>
								) : hold ? (
									<div className="countdown countdown--done">
										<div className="countdown__clock">
											{hold.detail.status === "CANCELED" ? "취소됨" : hold.detail.status}
										</div>
										<div className="countdown__caption">
											{`찜 #${hold.detail.id} · ${
												hold.detail.canceledBy === "OWNER" ? "점주가 취소" : "내가 취소"
											} · 재고가 ${detail.availableQty}개로 돌아왔습니다`}
										</div>
										<button className="button button--small" type="button" onClick={backToProduct}>
											다시 찜해보기
										</button>
									</div>
								) : sheetOpen ? (
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
											<strong>결제 예정 금액</strong>
											{won(detail.salePrice * qty)}
										</div>
										<p className="field__hint" style={{ margin: 0 }}>
											찜은 15분 동안 유지되며(픽업 마감이 더 이르면 그때까지), 시간이 지나면
											자동으로 취소됩니다. 1인 최대 {MAX_QTY}개.
										</p>
										<button
											className="phone__cta phone__cta--confirm"
											type="button"
											disabled={submitting || !token}
											onClick={submitHold}
										>
											{submitting ? "요청 중…" : `${qty}개 찜하기`}
										</button>
									</div>
								) : (
									<button
										className="phone__cta"
										type="button"
										disabled={detail.holdButton !== "AVAILABLE" || !token}
										onClick={openSheet}
									>
										{token ? HOLD_BUTTON_LABEL[detail.holdButton] : "소비자 토큰을 먼저 발급하세요"}
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
