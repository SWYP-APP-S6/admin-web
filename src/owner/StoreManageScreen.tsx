import { useCallback, useEffect, useState } from "react";
import { completePickup, fetchOwnerHolds, fetchOwnerProducts } from "../api/owner";
import { ErrorNote, Loading, asError, clockLabel, momentLabel, won } from "../app/shared";
import { PRODUCT_CATEGORY_LABEL } from "./session";
import type {
	OwnerHoldFilter,
	OwnerHoldList,
	OwnerHoldStatus,
	OwnerHome,
	OwnerProductFilter,
	OwnerProductList,
} from "../types";

type Tab = "products" | "holds";

const PRODUCT_PAGE_SIZE = 20;

const PRODUCT_FILTERS: { filter: OwnerProductFilter | null; label: string }[] = [
	{ filter: null, label: "전체" },
	{ filter: "RUNNING_LOW", label: "품절 임박" },
	{ filter: "SOLD_OUT", label: "판매완료" },
];

const PRODUCT_STATUS_TAG: Record<string, string> = {
	ON_SALE: "tag tag--pending",
	SOLD_OUT: "tag tag--completed",
	CLOSED: "tag tag--expired",
};

const PRODUCT_STATUS_LABEL: Record<string, string> = {
	ON_SALE: "판매중",
	SOLD_OUT: "판매완료",
	CLOSED: "마감",
};

const FILTERS: { status: OwnerHoldFilter | null; label: string; count: (list: OwnerHoldList) => number }[] = [
	{ status: null, label: "전체", count: (list) => list.counts.all },
	{ status: "HOLDING", label: "찜 진행중", count: (list) => list.counts.holding },
	{ status: "COMPLETED", label: "픽업 완료", count: (list) => list.counts.completed },
	{ status: "CANCELED_BY_OWNER", label: "픽업불가", count: (list) => list.counts.canceledByOwner },
	{ status: "CANCELED_BY_USER", label: "찜 취소", count: (list) => list.counts.canceledByUser },
	{ status: "EXPIRED", label: "만료된 찜", count: (list) => list.counts.expired },
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
	EXPIRED: "만료된 찜",
	CANCELED_BY_OWNER: "픽업불가",
	CANCELED_BY_USER: "찜 취소",
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
	const [filter, setFilter] = useState<OwnerHoldFilter | null>(null);
	const [list, setList] = useState<OwnerHoldList | null>(null);
	const [productFilter, setProductFilter] = useState<OwnerProductFilter | null>(null);
	const [productPage, setProductPage] = useState(0);
	const [products, setProducts] = useState<OwnerProductList | null>(null);
	const [productError, setProductError] = useState<Error | null>(null);
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

	const loadProducts = useCallback(async () => {
		try {
			setProducts(
				await fetchOwnerProducts(
					{ filter: productFilter, page: productPage, size: PRODUCT_PAGE_SIZE },
					accessToken,
				),
			);
			setProductError(null);
		} catch (caught) {
			setProductError(asError(caught));
		}
	}, [accessToken, productFilter, productPage]);

	useEffect(() => {
		if (tab === "holds") {
			void load();
		}
	}, [tab, load]);

	useEffect(() => {
		if (tab === "products") {
			void loadProducts();
		}
	}, [tab, loadProducts]);

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
					등록된 상품 {products ? products.products.totalElements : home.products.length}
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
					<div className="filters">
						{PRODUCT_FILTERS.map((item) => (
							<button
								key={item.label}
								type="button"
								className={productFilter === item.filter ? "chip chip--active" : "chip"}
								onClick={() => {
									setProductFilter(item.filter);
									setProductPage(0);
								}}
							>
								{item.label}
							</button>
						))}
					</div>

					{productError && <ErrorNote error={productError} />}
					{!products && !productError && <Loading />}

					{products && (
						<p className="table__muted" style={{ margin: "0 0 12px" }}>
							해당 상품 {products.products.totalElements}개
						</p>
					)}

					{products?.products.content.length === 0 && (
						<p className="state">해당되는 상품이 없어요.</p>
					)}

					{products?.products.content.map((product) => (
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
									<span className={PRODUCT_STATUS_TAG[product.status]}>
										{PRODUCT_STATUS_LABEL[product.status]}
									</span>
								</span>
								<span className="app-item__price">
									<b>{won(product.salePrice)}</b>
								</span>
								<span className="app-item__meta">
									남은 수량 {product.availableQty}개 · 방문 예정 {product.activeHoldQty}개
									{product.shortfallCustomerCount > 0 && (
										<strong>
											{" "}
											· {product.shortfallCustomerCount}명은 제품 구매가 불가능해요
											<span className="table__muted"> ({product.shortfallQty}개 부족)</span>
										</strong>
									)}
									{product.reconfirmPending && <span className="phone__tag">재고 재확인</span>}
								</span>
							</span>
						</button>
					))}

					{products && products.products.totalPages > 1 && (
						<div className="owner-hold__foot">
							<button
								className="button button--small"
								type="button"
								disabled={products.products.page === 0}
								onClick={() => setProductPage((page) => page - 1)}
							>
								이전
							</button>
							<span className="table__muted">
								{products.products.page + 1} / {products.products.totalPages}
							</span>
							<button
								className="button button--small"
								type="button"
								disabled={products.products.last}
								onClick={() => setProductPage((page) => page + 1)}
							>
								다음
							</button>
						</div>
					)}

					<p className="app-hint">
						홈의 판매중 목록과 달리 <strong>마감 · 품절된 지난 상품까지</strong> 옵니다.
						「판매완료」는 상태가 아니라 <code>availableQty = 0</code> 이라, 마감된 상품도 전량이
						찜된 상품도 담깁니다.
					</p>
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
									{hold.productName} * {hold.qty}
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
