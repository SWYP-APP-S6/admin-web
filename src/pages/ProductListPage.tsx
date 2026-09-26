import { Link, useSearchParams } from "react-router-dom";
import { fetchAdminProducts } from "../api/adminProducts";
import { IdFilters } from "../components/IdFilters";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime } from "../lib/format";
import type { AdminProductFilter, ProductStatus, StoreStatus, VisibilityIssue } from "../types";

const PAGE_SIZE = 20;

const TAB_FILTERS: { value: AdminProductFilter; label: string }[] = [
	{ value: "ALL", label: "전체" },
	{ value: "ON_SALE", label: "판매중" },
	{ value: "SOLD_OUT", label: "품절" },
	{ value: "CLOSED", label: "종료" },
	{ value: "HIDDEN", label: "소비자에게 안 보임" },
];

const STATUS_LABEL: Record<ProductStatus, string> = {
	ON_SALE: "판매중",
	SOLD_OUT: "품절",
	CLOSED: "종료",
};

const STATUS_CLASS: Record<ProductStatus, string> = {
	ON_SALE: "tag tag--owner",
	SOLD_OUT: "tag tag--pending",
	CLOSED: "tag tag--expired",
};

const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
	PENDING: "심사 대기",
	APPROVED: "승인",
	REJECTED: "반려",
};

const ISSUE_LABEL: Record<VisibilityIssue, string> = {
	STORE_NOT_APPROVED: "가게 미승인",
	STORE_CLOSED_TODAY: "오늘 휴무",
	STORE_LOCATION_OUT_OF_RANGE: "가게 좌표 이상",
	PRODUCT_CLOSED: "상품 종료",
	PICKUP_ENDED: "픽업 마감 지남",
	NO_STOCK: "남은 수량 0",
};

export function ProductListPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const filter = (searchParams.get("filter") ?? "ALL") as AdminProductFilter;
	const storeId = searchParams.get("storeId") ?? "";

	const products = useAsync(
		() =>
			fetchAdminProducts({
				page,
				size: PAGE_SIZE,
				filter,
				storeId: storeId ? Number(storeId) : undefined,
			}),
		[searchParams.toString()],
	);

	function update(next: { filter?: AdminProductFilter; storeId?: string }) {
		const params = new URLSearchParams();
		const nextFilter = next.filter ?? filter;
		const nextStoreId = next.storeId ?? storeId;
		if (nextFilter !== "ALL") {
			params.set("filter", nextFilter);
		}
		if (nextStoreId) {
			params.set("storeId", nextStoreId);
		}
		setSearchParams(params);
	}

	function goToPage(next: number) {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(next));
		setSearchParams(params);
	}

	return (
		<section>
			<div className="page-head">
				<h1 className="page-title">상품</h1>
				{products.data && (
					<span className="page-count">총 {products.data.totalElements.toLocaleString()}개</span>
				)}
			</div>

			<div className="filters">
				{TAB_FILTERS.map((tab) => (
					<button
						key={tab.value}
						type="button"
						className={filter === tab.value ? "chip chip--active" : "chip"}
						onClick={() => update({ filter: tab.value })}
					>
						{tab.label}
					</button>
				))}
			</div>

			<IdFilters
				key={searchParams.toString()}
				fields={[{ key: "storeId", label: "가게 id" }]}
				initial={{ storeId }}
				onApply={(values) => update({ storeId: values.storeId })}
			/>

			{products.loading && <p className="state">불러오는 중…</p>}
			{products.error && <p className="state state--error">{products.error.message}</p>}

			{products.data && (
				<>
					{products.data.content.length === 0 ? (
						<p className="state">조건에 맞는 상품이 없습니다.</p>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th>상품</th>
										<th>가게</th>
										<th>상태</th>
										<th>재고 / 찜 / 남음</th>
										<th>가격</th>
										<th>픽업 마감</th>
										<th>소비자 노출</th>
										<th>등록</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{products.data.content.map((product) => (
										<tr key={product.id}>
											<td>
												<div className="product-cell">
													<img className="product-cell__thumb" src={product.photoUrl} alt="" />
													<div>
														{product.name}
														<span className="table__muted"> #{product.id}</span>
														{product.reconfirmPending && (
															<div className="table__muted">재고 재확인 대기</div>
														)}
													</div>
												</div>
											</td>
											<td>
												<button
													type="button"
													className="link-button"
													title="이 가게로 좁히기"
													onClick={() => update({ storeId: String(product.store.id) })}
												>
													{product.store.name}
													<span className="table__muted"> #{product.store.id}</span>
												</button>
												{product.store.status !== "APPROVED" && (
													<div className="tag tag--pending">{STORE_STATUS_LABEL[product.store.status]}</div>
												)}
											</td>
											<td>
												<span className={STATUS_CLASS[product.status]}>{STATUS_LABEL[product.status]}</span>
											</td>
											<td className="table__nowrap">
												{product.stockQty} / {product.heldQty} / <strong>{product.availableQty}</strong>
											</td>
											<td className="table__nowrap">
												{product.salePrice.toLocaleString()}원
												<span className="table__muted"> ({product.discountRate}% ↓)</span>
											</td>
											<td className="table__muted table__nowrap">{formatDateTime(product.pickupEndAt)}</td>
											<td>
												{product.visibleToConsumers ? (
													<span className="tag tag--owner">보임</span>
												) : (
													<div className="issue-list">
														{product.hiddenReasons.map((issue) => (
															<span key={issue} className="tag tag--rejected">
																{ISSUE_LABEL[issue]}
															</span>
														))}
													</div>
												)}
											</td>
											<td className="table__muted table__nowrap">{formatDateTime(product.createdAt)}</td>
											<td>
												<Link className="button button--small" to={`/holds?productId=${product.id}`}>
													찜
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					<div className="pager">
						<button type="button" className="button" disabled={page <= 0} onClick={() => goToPage(page - 1)}>
							이전
						</button>
						<span className="pager__status">
							{products.data.page + 1} / {Math.max(products.data.totalPages, 1)}
						</span>
						<button
							type="button"
							className="button"
							disabled={products.data.last}
							onClick={() => goToPage(page + 1)}
						>
							다음
						</button>
					</div>
				</>
			)}
		</section>
	);
}
