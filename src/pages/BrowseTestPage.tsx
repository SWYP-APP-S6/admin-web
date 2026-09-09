import { useCallback, useState } from "react";
import { ApiError } from "../api/client";
import {
	fetchNearbyProducts,
	fetchNearbyStores,
	fetchStoreProducts,
	nearbyProductsPath,
	nearbyStoresPath,
	storeProductsPath,
} from "../api/browse";
import { useAsync } from "../hooks/useAsync";
import type { NearbyProduct, NearbyProductSort, ProductCategory, StoreProducts } from "../types";

const PAGE_SIZE = 20;

// 목록 반경이 1km 로 고정이라, 데모 가게 3곳을 남북으로 700m 씩 벌려두고 기준 위치만 옮기면
// 3 → 2 → 1 → 0 곳으로 줄어드는 것을 눈으로 확인할 수 있다.
const PRESETS = [
	{ label: "매장 3곳", lat: 37.5069, lng: 127.0365 },
	{ label: "2곳", lat: 37.5006, lng: 127.0365 },
	{ label: "1곳", lat: 37.495, lng: 127.0365 },
	{ label: "0곳", lat: 37.485, lng: 127.0365 },
];

const CATEGORIES: { value: "" | ProductCategory; label: string }[] = [
	{ value: "", label: "전체" },
	{ value: "VEGETABLE", label: "채소" },
	{ value: "FRUIT", label: "과일" },
	{ value: "MEAT", label: "육류" },
	{ value: "SEAFOOD", label: "수산" },
];

const SORTS: { value: NearbyProductSort; label: string }[] = [
	{ value: "DISTANCE", label: "거리순" },
	{ value: "PICKUP_DEADLINE", label: "마감임박순" },
];

const VIEWPORTS = [500, 1000, 3000, 10000];

function boundsAround(lat: number, lng: number, meters: number) {
	const latDelta = meters / 111320;
	const lngDelta = meters / (111320 * Math.cos((lat * Math.PI) / 180));
	return {
		minLat: lat - latDelta,
		maxLat: lat + latDelta,
		minLng: lng - lngDelta,
		maxLng: lng + lngDelta,
	};
}

// 서버는 절대 시각만 내려준다. "30분 뒤 마감" 같은 상대 표현은 화면이 만든다.
function deadlineLabel(pickupEndAt: string): string {
	const minutes = Math.round((new Date(pickupEndAt).getTime() - Date.now()) / 60000);
	if (minutes <= 0) return "마감";
	if (minutes < 60) return `${minutes}분 뒤 마감`;
	return `${Math.floor(minutes / 60)}시간 뒤 마감`;
}

function won(value: number): string {
	return `${value.toLocaleString()}원`;
}

function ErrorView({ error }: { error: Error }) {
	const fieldErrors = error instanceof ApiError ? error.fieldErrors : null;
	const code = error instanceof ApiError ? error.code : null;
	return (
		<div className="state state--error" style={{ textAlign: "left", padding: "16px 0" }}>
			<strong>
				{code ? `${code} — ` : ""}
				{error.message}
			</strong>
			{fieldErrors && (
				<ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
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

function ProductTable({ products }: { products: NearbyProduct[] }) {
	return (
		<table className="table">
			<tbody>
				{products.map((product) => (
					<tr key={product.id}>
						<td style={{ width: 52 }}>
							<span className="tag tag--rejected">{product.discountRate}%</span>
						</td>
						<td>{product.name}</td>
						<td>
							<strong>{won(product.salePrice)}</strong>{" "}
							<s className="table__muted">{won(product.originalPrice)}</s>
						</td>
						<td className="table__muted">{product.availableQty}개 남음</td>
						<td className="table__muted">{deadlineLabel(product.pickupEndAt)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export function BrowseTestPage() {
	const [position, setPosition] = useState({ lat: PRESETS[0].lat, lng: PRESETS[0].lng });
	const [latInput, setLatInput] = useState(String(PRESETS[0].lat));
	const [lngInput, setLngInput] = useState(String(PRESETS[0].lng));
	const [category, setCategory] = useState<"" | ProductCategory>("");
	const [sort, setSort] = useState<NearbyProductSort>("DISTANCE");
	const [viewportMeters, setViewportMeters] = useState(1000);
	const [sheet, setSheet] = useState<StoreProducts | null>(null);
	const [sheetError, setSheetError] = useState<Error | null>(null);

	const { lat, lng } = position;
	const bounds = boundsAround(lat, lng, viewportMeters);

	const products = useAsync(
		useCallback(
			() =>
				fetchNearbyProducts({
					lat,
					lng,
					category: category || undefined,
					sort,
					page: 0,
					size: PAGE_SIZE,
				}),
			[lat, lng, category, sort],
		),
		[lat, lng, category, sort],
	);

	const stores = useAsync(
		useCallback(
			() => fetchNearbyStores(boundsAround(lat, lng, viewportMeters)),
			[lat, lng, viewportMeters],
		),
		[lat, lng, viewportMeters],
	);

	function moveTo(nextLat: number, nextLng: number) {
		setLatInput(String(nextLat));
		setLngInput(String(nextLng));
		setPosition({ lat: nextLat, lng: nextLng });
		setSheet(null);
		setSheetError(null);
	}

	function applyTypedPosition() {
		const nextLat = Number(latInput);
		const nextLng = Number(lngInput);
		if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
			moveTo(nextLat, nextLng);
		}
	}

	async function openSheet(storeId: number) {
		setSheetError(null);
		try {
			setSheet(await fetchStoreProducts(storeId, lat, lng));
		} catch (caught) {
			setSheet(null);
			setSheetError(caught instanceof Error ? caught : new Error("불러오지 못했습니다."));
		}
	}

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">탐색 API 테스트</h1>
				<span className="page-count">
					기준 위치 {lat}, {lng}
				</span>
			</div>

			<p className="notice">
				데모 가게 3곳이 남북으로 700m 간격입니다. 목록은 <strong>반경 1km 고정</strong>이라
				기준 위치를 내리면 3 → 2 → 1 → 0곳으로 줄어듭니다. 지도는 반경이 아니라 아래에서 고른{" "}
				<strong>뷰포트(bbox)</strong>를 씁니다.
			</p>

			<div className="form-card" style={{ marginBottom: 24 }}>
				<div>
					<div className="field__label" style={{ marginBottom: 6 }}>
						기준 위치 프리셋
					</div>
					<div className="filters" style={{ marginBottom: 0 }}>
						{PRESETS.map((preset) => (
							<button
								key={preset.label}
								type="button"
								className={
									lat === preset.lat && lng === preset.lng ? "chip chip--active" : "chip"
								}
								onClick={() => moveTo(preset.lat, preset.lng)}
							>
								{preset.label}
							</button>
						))}
					</div>
				</div>

				<div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
					<label className="field" style={{ flex: 1 }}>
						<span className="field__label">위도</span>
						<input
							className="field__input"
							value={latInput}
							onChange={(event) => setLatInput(event.target.value)}
						/>
					</label>
					<label className="field" style={{ flex: 1 }}>
						<span className="field__label">경도</span>
						<input
							className="field__input"
							value={lngInput}
							onChange={(event) => setLngInput(event.target.value)}
						/>
					</label>
					<button className="button" type="button" onClick={applyTypedPosition}>
						적용
					</button>
				</div>
			</div>

			<h2 className="section-title">① GET /products/nearby — 홈 목록</h2>
			<p className="token-box" style={{ marginBottom: 12 }}>
				{nearbyProductsPath({
					lat,
					lng,
					category: category || undefined,
					sort,
					page: 0,
					size: PAGE_SIZE,
				})}
			</p>

			<div className="filters" style={{ marginBottom: 8 }}>
				{CATEGORIES.map((item) => (
					<button
						key={item.value}
						type="button"
						className={category === item.value ? "chip chip--active" : "chip"}
						onClick={() => setCategory(item.value)}
					>
						{item.label}
					</button>
				))}
			</div>
			<div className="filters">
				{SORTS.map((item) => (
					<button
						key={item.value}
						type="button"
						className={sort === item.value ? "chip chip--active" : "chip"}
						onClick={() => setSort(item.value)}
					>
						{item.label}
					</button>
				))}
			</div>

			{products.loading && <p className="state">불러오는 중…</p>}
			{products.error && <ErrorView error={products.error} />}
			{products.data && (
				<div style={{ display: "grid", gap: 12 }}>
					<p className="page-count" style={{ margin: 0 }}>
						총 {products.data.totalProductCount}개 · 매장 {products.data.stores.totalElements}곳
					</p>
					{products.data.stores.content.length === 0 && (
						<p className="state">반경 1km 안에 판매중인 상품이 없습니다.</p>
					)}
					{products.data.stores.content.map((group) => (
						<div className="card" key={group.storeId}>
							<div className="card__body">
								<div className="card__title">
									{group.storeName}{" "}
									<span className="table__muted" style={{ fontWeight: 400 }}>
										도보 {group.walkingMinutes}분 · {group.distanceMeters}m · 총{" "}
										{group.productCount}개
									</span>{" "}
									<span className="tag tag--pending">
										{deadlineLabel(group.earliestPickupEndAt)}
									</span>
								</div>
								<ProductTable products={group.products} />
								{group.hasMoreProducts && (
									<div className="row-actions">
										<button
											className="button button--small"
											type="button"
											onClick={() => openSheet(group.storeId)}
										>
											더보기
										</button>
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			<h2 className="section-title">② GET /stores/nearby — 지도 마커</h2>
			<div className="filters" style={{ marginBottom: 8 }}>
				{VIEWPORTS.map((meters) => (
					<button
						key={meters}
						type="button"
						className={viewportMeters === meters ? "chip chip--active" : "chip"}
						onClick={() => setViewportMeters(meters)}
					>
						뷰포트 ±{meters >= 1000 ? `${meters / 1000}km` : `${meters}m`}
					</button>
				))}
			</div>
			<p className="token-box" style={{ marginBottom: 12 }}>
				{nearbyStoresPath(bounds)}
			</p>

			{stores.loading && <p className="state">불러오는 중…</p>}
			{stores.error && <ErrorView error={stores.error} />}
			{stores.data && (
				<>
					<p className="page-count">
						총 {stores.data.totalStoreCount}곳
						{stores.data.truncated && " · 상한 초과로 일부만 표시 (truncated)"}
					</p>
					{stores.data.stores.length === 0 ? (
						<p className="state">이 뷰포트 안에 판매중인 매장이 없습니다.</p>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th style={{ textAlign: "left", padding: "9px 16px" }}>매장</th>
										<th style={{ textAlign: "left", padding: "9px 16px" }}>좌표</th>
										<th style={{ textAlign: "left", padding: "9px 16px" }}>판매중</th>
										<th />
									</tr>
								</thead>
								<tbody>
									{stores.data.stores.map((marker) => (
										<tr key={marker.storeId}>
											<td style={{ padding: "9px 16px" }}>{marker.name}</td>
											<td className="table__muted" style={{ padding: "9px 16px" }}>
												{marker.latitude}, {marker.longitude}
											</td>
											<td style={{ padding: "9px 16px" }}>
												{marker.sellableProductCount}개
											</td>
											<td style={{ padding: "9px 16px" }}>
												<button
													className="button button--small"
													type="button"
													onClick={() => openSheet(marker.storeId)}
												>
													상품 보기
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</>
			)}

			<h2 className="section-title">③ GET /stores/&#123;id&#125;/products — 하단 시트</h2>
			{sheetError && <ErrorView error={sheetError} />}
			{!sheet && !sheetError && <p className="state">위 표에서 "상품 보기"를 누르세요.</p>}
			{sheet && (
				<>
					<p className="token-box" style={{ marginBottom: 12 }}>
						{storeProductsPath(sheet.storeId, lat, lng)}
					</p>
					<div className="card">
						<div className="card__body">
							<div className="card__title">
								{sheet.name}{" "}
								<span className="table__muted" style={{ fontWeight: 400 }}>
									{sheet.walkingMinutes === null
										? "위치 미지정"
										: `도보 ${sheet.walkingMinutes}분 · ${sheet.distanceMeters}m`}{" "}
									· {sheet.businessCloseTime.slice(0, 5)} 영업종료 · 총 {sheet.productCount}개
								</span>{" "}
								{sheet.earliestPickupEndAt && (
									<span className="tag tag--pending">
										{deadlineLabel(sheet.earliestPickupEndAt)}
									</span>
								)}
							</div>
							<ProductTable products={sheet.products} />
						</div>
					</div>
				</>
			)}
		</>
	);
}
