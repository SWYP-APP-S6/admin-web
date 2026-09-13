import { useCallback, useEffect, useState } from "react";
import { fetchNearbyProducts, fetchNearbyStores } from "../api/browse";
import { fetchMyLocation, setMyLocation } from "../api/myLocation";
import { useAsync } from "../hooks/useAsync";
import type { NearbyProductSort, ProductCategory } from "../types";
import { ErrorNote, Loading, deadlineLabel, won } from "../app/shared";

/** 서버가 받는 범위는 100~5000m. 안 보내면 browse.nearby-radius-meters(1km). */
const RADII = [500, 1000, 2000, 5000];

const CATEGORIES: { value: "" | ProductCategory; label: string }[] = [
	{ value: "", label: "전체" },
	{ value: "VEGETABLE", label: "채소" },
	{ value: "FRUIT", label: "과일" },
	{ value: "MEAT", label: "육류" },
	{ value: "SEAFOOD", label: "수산" },
	{ value: "DAIRY_EGG", label: "유제품" },
	{ value: "BAKERY", label: "베이커리" },
	{ value: "SIDE_DISH", label: "반찬" },
	{ value: "ETC", label: "기타" },
];

const SORTS: { value: NearbyProductSort; label: string }[] = [
	{ value: "DISTANCE", label: "거리순" },
	{ value: "PICKUP_DEADLINE", label: "마감임박순" },
	{ value: "DISCOUNT_RATE", label: "할인율순" },
];

export interface Position {
	label: string;
	lat: number;
	lng: number;
}

// 실제 앱은 GPS 를 쓴다. 여기서는 시드 데이터의 거리 구간을 눌러 볼 수 있게 프리셋으로 대신한다.
export const POSITIONS: Position[] = [
	{ label: "역삼역", lat: 37.5069, lng: 127.0365 },
	{ label: "600m 남쪽", lat: 37.5015, lng: 127.0365 },
	{ label: "1.2km 남쪽", lat: 37.4961, lng: 127.0365 },
	{ label: "도곡", lat: 37.5204, lng: 127.0365 },
];

function bounds(position: Position, meters: number) {
	const lat = meters / 111320;
	const lng = meters / (111320 * Math.cos((position.lat * Math.PI) / 180));
	return {
		minLat: position.lat - lat,
		maxLat: position.lat + lat,
		minLng: position.lng - lng,
		maxLng: position.lng + lng,
	};
}

interface Props {
	position: Position;
	accessToken: string;
	onChangePosition: (position: Position) => void;
	onOpenProduct: (productId: number) => void;
}

export function HomeScreen({ position, accessToken, onChangePosition, onOpenProduct }: Props) {
	const [view, setView] = useState<"list" | "map">("list");
	const [regionName, setRegionName] = useState<string | null>(null);
	const [radiusMeters, setRadiusMeters] = useState(1000);
	const [category, setCategory] = useState<"" | ProductCategory>("");
	const [sort, setSort] = useState<NearbyProductSort>("DISTANCE");

	// 헤더에 찍히는 동네 이름. 비회원은 저장할 곳이 없어 403 이 오므로 조용히 넘긴다.
	useEffect(() => {
		let active = true;
		fetchMyLocation(accessToken)
			.then((mine) => {
				if (active) {
					setRegionName(mine.location?.regionName ?? null);
				}
			})
			.catch(() => undefined);
		return () => {
			active = false;
		};
	}, [accessToken]);

	const moveTo = useCallback(
		(next: Position) => {
			onChangePosition(next);
			setMyLocation(
				{ regionName: next.label, latitude: next.lat, longitude: next.lng },
				accessToken,
			)
				.then((mine) => setRegionName(mine.location?.regionName ?? null))
				.catch(() => undefined);
		},
		[accessToken, onChangePosition],
	);

	// 탐색도 소비자·비회원 토큰으로 부른다. 토큰을 안 넘기면 관리자 토큰이 대신 쓰여, 앱에는
	// 없는 권한으로 조회하게 되고 소비자 토큰이 만료돼도 홈만 멀쩡해 보인다.
	const products = useAsync(
		() =>
			fetchNearbyProducts(
				{
					lat: position.lat,
					lng: position.lng,
					category: category || undefined,
					sort,
					radiusMeters,
					page: 0,
					size: 20,
				},
				accessToken,
			),
		[position.lat, position.lng, category, sort, radiusMeters, accessToken],
	);

	const markers = useAsync(
		() => fetchNearbyStores(bounds(position, radiusMeters), accessToken),
		[position.lat, position.lng, radiusMeters, accessToken],
	);

	return (
		<div className="app-screen">
			<div className="app-place">
				<span className="app-place__region">📍 {regionName ?? position.label}</span>
				<select
					className="app-place__select"
					value={position.label}
					onChange={(event) =>
						moveTo(POSITIONS.find((item) => item.label === event.target.value) ?? POSITIONS[0])
					}
				>
					{POSITIONS.map((item) => (
						<option key={item.label} value={item.label}>
							{item.label}
						</option>
					))}
				</select>
				<div className="app-toggle">
					{(["list", "map"] as const).map((item) => (
						<button
							key={item}
							type="button"
							className={view === item ? "app-toggle__tab app-toggle__tab--on" : "app-toggle__tab"}
							onClick={() => setView(item)}
						>
							{item === "list" ? "목록" : "지도"}
						</button>
					))}
				</div>
			</div>

			<div className="filters">
				{CATEGORIES.map((item) => (
					<button
						key={item.label}
						type="button"
						className={category === item.value ? "chip chip--active" : "chip"}
						onClick={() => setCategory(item.value)}
					>
						{item.label}
					</button>
				))}
			</div>
			<div className="filters">
				{RADII.map((meters) => (
					<button
						key={meters}
						type="button"
						className={radiusMeters === meters ? "chip chip--active" : "chip"}
						onClick={() => setRadiusMeters(meters)}
					>
						{meters >= 1000 ? `${meters / 1000}km` : `${meters}m`}
					</button>
				))}
				{view === "list" &&
					SORTS.map((item) => (
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

			{view === "list" ? (
				<>
					{products.loading && <Loading />}
					{products.error && <ErrorNote error={products.error} />}
					{products.data && (
						<>
							<p className="app-count">
								총 {products.data.totalProductCount}개 · 매장{" "}
								{products.data.stores.totalElements}곳
							</p>
							{products.data.stores.content.length === 0 && (
								<p className="state">
									이 반경에 오늘 영업하는 가게의 판매중인 상품이 없습니다.
								</p>
							)}
							{products.data.stores.content.map((group) => (
								<section className="app-store" key={group.storeId}>
									<header className="app-store__head">
										<strong>{group.storeName}</strong>
										<span>
											도보 {group.walkingMinutes}분 · {group.distanceMeters}m · 총{" "}
											{group.productCount}개
										</span>
									</header>
									{group.products.map((item) => (
										<button
											className="app-item"
											type="button"
											key={item.id}
											onClick={() => onOpenProduct(item.id)}
										>
											<img className="app-item__thumb" src={item.photoUrl} alt="" />
											<span className="app-item__body">
												<span className="app-item__name">{item.name}</span>
												<span className="app-item__price">
													<b>{item.discountRate}%</b> {won(item.salePrice)}{" "}
													<s>{won(item.originalPrice)}</s>
												</span>
												<span className="app-item__meta">
													{item.availableQty}개 남음 · {deadlineLabel(item.pickupEndAt)}
												</span>
											</span>
										</button>
									))}
								</section>
							))}
						</>
					)}
				</>
			) : (
				<>
					{markers.loading && <Loading />}
					{markers.error && <ErrorNote error={markers.error} />}
					{markers.data && (
						<>
							<p className="app-count">
								뷰포트 안 {markers.data.totalStoreCount}곳
								{markers.data.truncated && " · 마커 상한 초과"}
							</p>
							{/* 실제 앱은 지도 위에 핀을 찍는다. 여기서는 같은 응답을 핀 목록으로 그린다. */}
							<div className="app-pins">
								{markers.data.stores.map((store) => (
									<div className="app-pin" key={store.storeId}>
										<span className="app-pin__badge">{store.sellableProductCount}</span>
										<span className="app-pin__body">
											<strong>{store.name}</strong>
											<span className="app-item__meta">
												{store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
											</span>
										</span>
									</div>
								))}
								{markers.data.stores.length === 0 && (
									<p className="state">이 화면 범위에 표시할 가게가 없습니다.</p>
								)}
							</div>
						</>
					)}
				</>
			)}
		</div>
	);
}
