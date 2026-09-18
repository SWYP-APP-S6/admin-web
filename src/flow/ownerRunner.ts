import { issueTestToken } from "../api/devToken";
import { fetchNotifications } from "../api/notifications";
import {
	fetchMyStore,
	fetchOwnerHold,
	fetchOwnerHolds,
	fetchOwnerHome,
	fetchOwnerProduct,
	fetchOwnerProducts,
} from "../api/owner";
import { ApiError } from "../api/client";
import type { OwnerScreenSpec } from "./ownerSpec";

export interface OwnerProbe {
	accessToken: string;
	hasStore: boolean;
	productId: number | null;
	holdId: number | null;
	/** 점검을 시작조차 못하게 만든 것 */
	blocker: string | null;
}

/**
 * 테스트 점주 계정((dev, test-owner) 한 건)으로 훑는다. 쓰기 API 는 **부르지 않는다** --
 * 상품을 등록하거나 수량을 바꾸면 소비자 쪽 재고가 함께 움직인다.
 */
export async function prepareOwner(): Promise<OwnerProbe> {
	const accessToken = (await issueTestToken("OWNER")).accessToken;
	const probe: OwnerProbe = {
		accessToken,
		hasStore: false,
		productId: null,
		holdId: null,
		blocker: null,
	};

	try {
		await fetchMyStore(accessToken);
		probe.hasStore = true;
	} catch (caught) {
		if (caught instanceof ApiError && caught.code === "STORE_NOT_REGISTERED") {
			probe.blocker =
				"테스트 점주 계정에 아직 가게가 없습니다 — 「점주 앱 테스트」에서 O-003 을 한 번 마치면 이 점검이 끝까지 돕니다.";
			return probe;
		}
		throw caught;
	}

	const home = await fetchOwnerHome(accessToken);
	probe.productId = home.products[0]?.id ?? null;

	const holds = await fetchOwnerHolds({ page: 0, size: 20 }, accessToken);
	probe.holdId = holds.holds.content[0]?.id ?? null;

	return probe;
}

export interface OwnerScreenResult {
	status: "ok" | "skipped" | "failed";
	reason?: string;
	payload?: unknown;
}

export async function runOwner(
	screen: OwnerScreenSpec,
	probe: OwnerProbe,
): Promise<OwnerScreenResult> {
	if (!probe.hasStore && screen.probe && screen.probe !== "none") {
		return { status: "skipped", reason: "가게가 없어 점주 API 를 부를 수 없습니다" };
	}
	try {
		switch (screen.probe) {
			case "myStore":
				return { status: "ok", payload: await fetchMyStore(probe.accessToken) };
			case "ownerHome":
				return { status: "ok", payload: await fetchOwnerHome(probe.accessToken) };
			case "ownerProduct":
				if (probe.productId === null) {
					return {
						status: "skipped",
						reason: "판매중인 상품이 없습니다 — 「점주 앱 테스트」에서 하나 등록하면 점검됩니다",
					};
				}
				return {
					status: "ok",
					payload: await fetchOwnerProduct(probe.productId, probe.accessToken),
				};
			case "ownerProducts":
				return {
					status: "ok",
					payload: await fetchOwnerProducts({ page: 0, size: 10 }, probe.accessToken),
				};
			case "ownerHolds":
				return {
					status: "ok",
					payload: await fetchOwnerHolds({ page: 0, size: 10 }, probe.accessToken),
				};
			case "ownerHoldDetail":
				if (probe.holdId === null) {
					return {
						status: "skipped",
						reason: "이 가게에 찜이 없습니다 — 소비자 앱 테스트(/app)에서 하나 만들면 점검됩니다",
					};
				}
				return { status: "ok", payload: await fetchOwnerHold(probe.holdId, probe.accessToken) };
			case "notifications":
				return {
					status: "ok",
					payload: await fetchNotifications({ page: 0, size: 10 }, probe.accessToken),
				};
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
