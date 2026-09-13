import { fetchNearbyProducts, fetchNearbyStores, fetchStoreProducts } from "../api/browse";
import { issueTestToken } from "../api/devToken";
import { fetchHold, fetchHoldHistory, fetchProductDetail } from "../api/holds";
import { fetchRecipes, fetchRecipe } from "../api/recipes";
import type { ScreenSpec } from "./spec";

/** 점검 기준 좌표. test_data_1.sql 의 기준점이라 시드를 넣었으면 항상 잡힌다. */
const ORIGIN = { lat: 37.5069, lng: 127.0365 };

export interface Probe {
	accessToken: string;
	storeId: number | null;
	productId: number | null;
	holdId: number | null;
	completedHoldId: number | null;
	recipeId: number | null;
	/** 점검을 시작조차 못하게 만든 것 */
	blocker: string | null;
}

/**
 * 화면을 호출하려면 먼저 id 가 필요하다 -- 어느 상품, 어느 찜, 어느 레시피인지. 시드 데이터에서
 * 하나씩 집어 온다. 찜은 **만들지 않는다**: 재고가 움직이고 취소권이 깎이므로, 이미 있는 것만 쓴다.
 */
export async function prepare(): Promise<Probe> {
	const accessToken = (await issueTestToken("CONSUMER")).accessToken;
	const probe: Probe = {
		accessToken,
		storeId: null,
		productId: null,
		holdId: null,
		completedHoldId: null,
		recipeId: null,
		blocker: null,
	};

	const nearby = await fetchNearbyProducts(
		{ ...ORIGIN, sort: "DISTANCE", radiusMeters: 5000, page: 0, size: 20 },
		accessToken,
	);
	const group = nearby.stores.content[0];
	if (!group) {
		probe.blocker =
			"반경 5km 안에 판매중인 상품이 없습니다. test_data_1.sql 을 다시 넣으면 픽업 시각이 갱신됩니다.";
	} else {
		probe.storeId = group.storeId;
		probe.productId = group.products[0]?.id ?? null;
	}

	const history = await fetchHoldHistory({ page: 0, size: 20 }, accessToken);
	probe.holdId = history.holds.content[0]?.id ?? null;
	probe.completedHoldId =
		history.holds.content.find((entry) => entry.status === "COMPLETED")?.id ?? null;

	const recipes = await fetchRecipes({ page: 0, size: 1 });
	probe.recipeId = recipes.content[0]?.id ?? null;

	return probe;
}

export interface ScreenResult {
	status: "ok" | "skipped" | "failed";
	/** 건너뛰거나 실패한 이유 */
	reason?: string;
	payload?: unknown;
}

export async function run(screen: ScreenSpec, probe: Probe): Promise<ScreenResult> {
	try {
		switch (screen.probe) {
			case "nearbyStores": {
				const span = 3000 / 111320;
				return {
					status: "ok",
					payload: await fetchNearbyStores(
						{
							minLat: ORIGIN.lat - span,
							maxLat: ORIGIN.lat + span,
							minLng: ORIGIN.lng - span,
							maxLng: ORIGIN.lng + span,
						},
						probe.accessToken,
					),
				};
			}
			case "storeProducts":
				if (probe.storeId === null) {
					return { status: "skipped", reason: "판매중인 매장이 없습니다" };
				}
				return {
					status: "ok",
					payload: await fetchStoreProducts(probe.storeId, ORIGIN.lat, ORIGIN.lng),
				};
			case "nearbyProducts":
				return {
					status: "ok",
					payload: await fetchNearbyProducts(
						{ ...ORIGIN, sort: "DISTANCE", radiusMeters: 5000, page: 0, size: 20 },
						probe.accessToken,
					),
				};
			case "productDetail":
				if (probe.productId === null) {
					return { status: "skipped", reason: "판매중인 상품이 없습니다" };
				}
				return {
					status: "ok",
					payload: await fetchProductDetail(
						probe.productId,
						probe.accessToken,
						ORIGIN.lat,
						ORIGIN.lng,
					),
				};
			case "holdDetail":
				if (probe.holdId === null) {
					return {
						status: "skipped",
						reason: "찜 기록이 없습니다 — /app 에서 하나 만들면 이 화면까지 점검됩니다",
					};
				}
				return { status: "ok", payload: await fetchHold(probe.holdId, probe.accessToken) };
			case "holdHistory":
				return {
					status: "ok",
					payload: await fetchHoldHistory({ page: 0, size: 10 }, probe.accessToken),
				};
			case "completedHold":
				if (probe.completedHoldId === null) {
					return {
						status: "skipped",
						reason: "수령 완료된 찜이 없습니다 — 점주 API(O-040)로 완료 처리하면 점검됩니다",
					};
				}
				return {
					status: "ok",
					payload: await fetchHold(probe.completedHoldId, probe.accessToken),
				};
			case "recipeDetail":
				if (probe.recipeId === null) {
					return { status: "skipped", reason: "레시피 데이터가 없습니다 (init_data_1.sql)" };
				}
				return { status: "ok", payload: await fetchRecipe(probe.recipeId) };
			default:
				return { status: "skipped", reason: "쓰기 API 라 점검에서 부르지 않습니다" };
		}
	} catch (caught) {
		return {
			status: "failed",
			reason: caught instanceof Error ? caught.message : "알 수 없는 오류",
		};
	}
}
