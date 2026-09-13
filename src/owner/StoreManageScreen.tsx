import { useCallback, useEffect, useState } from "react";
import { completePickup, fetchOwnerHolds } from "../api/owner";
import { ErrorNote, Loading, asError, clockLabel, momentLabel, won } from "../app/shared";
import { PRODUCT_CATEGORY_LABEL } from "./session";
import type { OwnerHoldList, OwnerHoldStatus, OwnerHome } from "../types";

type Tab = "products" | "holds";

const FILTERS: { status: OwnerHoldStatus | null; label: string; count: (list: OwnerHoldList) => number }[] = [
	{ status: null, label: "전체", count: (list) => list.counts.all },
	{ status: "HOLDING", label: "찜 진행중", count: (list) => list.counts.holding },
	{ status: "COMPLETED", label: "픽업완료", count: (list) => list.counts.completed },
	{ status: "EXPIRED", label: "픽업불가(만료)", count: (list) => list.counts.expired },
	{ status: "CANCELED_BY_OWNER", label: "점주 취소", count: (list) => list.counts.canceledByOwner },
	{ status: "CANCELED_BY_USER", label: "손님 취소", count: (list) => list.counts.canceledByUser },
];

const STATUS_TAG: Record<OwnerHoldStatus, string> = {
	HOLDING: "tag tag--pending",
	COMPLETED: "tag tag--completed",
	EXPIRED: "tag tag--expired",
	CANCELED_BY_OWNER: "tag tag--rejected",
	CANCELED_BY_USER: "tag tag--rejected",
};

const STATUS_LABEL: Record<OwnerHoldStatus, string> = {
	HOLDING: "찜 진행중",
	COMPLETED: "픽업 완료",
	EXPIRED: "만료",
	CANCELED_BY_OWNER: "점주 취소",
	CANCELED_BY_USER: "손님 취소",
};

interface Props {
	home: OwnerHome;
	accessToken: string;
	onOpenProduct: (productId: number) => void;
	onOpenHold: (holdId: number) => void;
	onChanged: () => void;
	initialTab?: Tab;
}

/** O-040 점포 관리. 탭 둘 -- 등록된 상품, 찜 현황. */
export function StoreManageScreen({
	home,
	accessToken,
	onOpenProduct,
	onOpenHold,
	onChanged,
	initialTab = "products",
}: Props) {
	const [tab, setTab] = useState<Tab>(initialTab);
	const [filter, setFilter] = useState<OwnerHoldStatus | null>(null);
	const [list, setList] = useState<OwnerHoldList | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [busy, setBusy] = useState<number | null>(null);
	const [tick, setTick] = useState(() => Date.now());

	const load = useCallback(async () => {
		try {
			setList(await fetchOwnerHolds({ status: filter, page: 0, size: 30 }, accessToken));
			setError(null);
		} catch (caught) {
			setError(asError(caught));
		}
	}, [accessToken, filter]);

	useEffect(() => {
		if (tab === "holds") {
			void load();
		}
	}, [tab, load]);

	useEffect(() => {
		const timer = window.setInterval(() => setTick(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	async function complete(holdId: number) {
		setBusy(holdId);
		try {
			await completePickup(holdId, accessToken);
			await load();
			onChanged();
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="app-screen">
			<div className="tabs">
				<button
					type="button"
					className={tab === "products" ? "tabs__tab tabs__tab--active" : "tabs__tab"}
					onClick={() => setTab("products")}
				>
					등록된 상품 {home.products.length}
				</button>
				<button
					type="button"
					className={tab === "holds" ? "tabs__tab tabs__tab--active" : "tabs__tab"}
					onClick={() => setTab("holds")}
				>
					찜 현황 {list ? list.counts.all : ""}
				</button>
			</div>

			{tab === "products" && (
				<>
					<p className="notice" style={{ margin: "0 0 12px" }}>
						<code>GET /owner/products</code>(내 상품 목록)가 아직 없어 <code>/owner/home</code> 의
						<strong> 판매중 상품</strong>만 보여줍니다 — 마감·품절된 지난 상품은 이 목록에
						나오지 않습니다.
					</p>
					{home.products.length === 0 && <p className="state">판매 중인 상품이 없습니다.</p>}
					{home.products.map((product) => (
						<button
							className="owner-product"
							type="button"
							key={product.id}
							onClick={() => onOpenProduct(product.id)}
						>
							<img className="app-item__thumb" src={product.photoUrl} alt="" />
							<span className="app-item__body">
								<span className="app-item__name">
									{product.name}
									<span className="phone__tag">{PRODUCT_CATEGORY_LABEL[product.category]}</span>
								</span>
								<span className="app-item__price">
									<b>{won(product.salePrice)}</b>
								</span>
								<span className="app-item__meta">
									남은 수량 {product.availableQty}개 · 방문 예정 {product.activeHoldQty}개
								</span>
							</span>
						</button>
					))}
				</>
			)}

			{tab === "holds" && (
				<>
					<div className="filters">
						{FILTERS.map((item) => (
							<button
								key={item.label}
								type="button"
								className={filter === item.status ? "chip chip--active" : "chip"}
								onClick={() => setFilter(item.status)}
							>
								{item.label}
								{list ? ` ${item.count(list)}` : ""}
							</button>
						))}
					</div>

					{error && <ErrorNote error={error} />}
					{!list && !error && <Loading />}

					{list?.holds.content.length === 0 && <p className="state">해당되는 찜이 없어요.</p>}

					{list?.holds.content.map((hold) => {
						const remaining = new Date(hold.expiresAt).getTime() - tick;
						const completable = hold.status === "HOLDING" || hold.status === "EXPIRED";
						return (
							<article className="owner-hold" key={hold.id}>
								<button
									className="owner-hold__head"
									type="button"
									onClick={() => onOpenHold(hold.id)}
								>
									<span>
										<span className="table__muted">{momentLabel(hold.heldAt)}</span>
										<strong> {hold.nickname} 님 ›</strong>
									</span>
									<span className={STATUS_TAG[hold.status]}>{STATUS_LABEL[hold.status]}</span>
								</button>
								<p className="owner-hold__items">
									{hold.items.map((item) => `${item.productName} * ${item.qty}`).join(", ")}
								</p>
								<div className="owner-hold__foot">
									<span className="table__muted">
										{hold.status === "HOLDING"
											? `${clockLabel(remaining)} 남음`
											: `${momentLabel(hold.expiresAt)} 만료`}
									</span>
									<button
										className="button button--small"
										type="button"
										disabled={!completable || busy === hold.id}
										onClick={() => complete(hold.id)}
									>
										{hold.status === "COMPLETED" ? "픽업 완료된 찜" : "픽업 완료했어요"}
									</button>
								</div>
							</article>
						);
					})}

					<p className="app-hint">
						만료된 찜도 <code>hold.no-show-grace</code>(30분) 안에는 수령 완료를 받아줍니다 — 그
						경우 재고에서 다시 차감하고, 남은 게 없으면 <code>PRODUCT_STOCK_GONE</code> 입니다.
					</p>
				</>
			)}
		</div>
	);
}
