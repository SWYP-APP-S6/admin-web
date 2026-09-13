import { useEffect, useState } from "react";
import { clockLabel, won } from "../app/shared";
import { PRODUCT_CATEGORY_LABEL, STORE_CATEGORY_LABEL, STORE_STATUS_LABEL } from "./session";
import type { OwnerHome } from "../types";

interface Props {
	home: OwnerHome;
	onOpenProduct: (productId: number) => void;
	onOpenHold: (holdId: number) => void;
	onRegisterProduct: () => void;
	onOpenHolds: () => void;
}

/**
 * O-010. 홈은 상태가 셋이다 -- 상품을 한 번도 등록하지 않았을 때(최초 접근), 등록했지만 지금
 * 판매중이 없을 때(디폴트), 판매중이 있을 때(리스트). 서버의 hasRegisteredProduct 와
 * products 의 길이가 그 셋을 가른다.
 */
export function OwnerHomeScreen({
	home,
	onOpenProduct,
	onOpenHold,
	onRegisterProduct,
	onOpenHolds,
}: Props) {
	const [tick, setTick] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setTick(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	const issueCount = home.issues.expiredTodayCount + home.reconfirmPendingCount;

	if (!home.hasRegisteredProduct) {
		return (
			<div className="app-screen app-screen--center">
				<h2 className="app-title">안녕하세요, 사장님!</h2>
				<p className="app-sub">맹그로에서 오늘 남은 상품을 판매해보세요.</p>
				<p className="app-hint">상품 사진과 가격만 입력하면 근처 손님에게 바로 보여줄 수 있어요!</p>
				<button className="phone__cta" type="button" onClick={onRegisterProduct}>
					첫 상품 등록하러 가기
				</button>
			</div>
		);
	}

	return (
		<div className="app-screen">
			<h2 className="app-title">사장님, 오늘도 좋은 하루 되세요!</h2>
			<p className="app-sub">
				{issueCount === 0 ? "지금 확인해야 할 문제는 없어요." : `확인이 필요한 일이 ${issueCount}건 있어요.`}
			</p>

			<div className="owner-store-line">
				<strong>🏪 {home.store.name}</strong>
				{home.store.categories.map((category) => (
					<span className="phone__tag" key={category}>
						{STORE_CATEGORY_LABEL[category]}
					</span>
				))}
				<span className={home.store.status === "APPROVED" ? "tag tag--completed" : "tag tag--pending"}>
					{STORE_STATUS_LABEL[home.store.status]}
				</span>
			</div>

			{home.store.status !== "APPROVED" && (
				<p className="notice" style={{ margin: "0 0 12px" }}>
					가게가 아직 승인되지 않아 <strong>소비자 화면에는 보이지 않습니다</strong>. 관리자
					메뉴의 <code>가게</code> 탭에서 승인하면 <code>/products/nearby</code> 에 잡힙니다.
				</p>
			)}

			<div className="owner-stats">
				<div className="owner-stat">
					<span className="owner-stat__icon">❤️</span>
					<span className="owner-stat__label">방문 예정</span>
					<strong>{home.summary.upcomingVisitCount}건</strong>
				</div>
				<div className="owner-stat owner-stat--amber">
					<span className="owner-stat__icon">🛍️</span>
					<span className="owner-stat__label">픽업 완료</span>
					<strong>{home.summary.completedTodayCount}건</strong>
				</div>
				<div className="owner-stat owner-stat--green">
					<span className="owner-stat__icon">🥬</span>
					<span className="owner-stat__label">판매중</span>
					<strong>{home.summary.onSaleQty}개</strong>
				</div>
			</div>

			{issueCount > 0 && (
				<section className="owner-issue">
					<strong>❗ 확인이 필요한 문제가 있어요.</strong>
					{home.issues.expiredTodayCount > 0 && (
						<button className="owner-issue__row" type="button" onClick={onOpenHolds}>
							오늘 만료된 찜이 {home.issues.expiredTodayCount}건 있어요. 수령 여부를
							확인해주세요. <span>›</span>
						</button>
					)}
					{home.reconfirmPendingCount > 0 && (
						<span className="owner-issue__row owner-issue__row--flat">
							재고 재확인 요청에 답하지 않은 상품이 {home.reconfirmPendingCount}개 있어요
							(O-050 응답 API 미구현)
						</span>
					)}
				</section>
			)}

			<h3 className="owner-section">
				곧 방문해요
				<button className="owner-section__more" type="button" onClick={onOpenHolds}>
					전체 보기 ›
				</button>
			</h3>
			{home.upcomingVisits.length === 0 ? (
				<p className="state">지금은 방문 예정인 손님이 없어요.</p>
			) : (
				<div className="owner-visits">
					{home.upcomingVisits.map((visit) => (
						<button
							className="owner-visit"
							type="button"
							key={visit.holdId}
							onClick={() => onOpenHold(visit.holdId)}
						>
							<strong>{visit.nickname} 님</strong>
							<span className="table__muted">
								{visit.summary} · {visit.totalQty}개
							</span>
							<span className="owner-visit__clock">
								{clockLabel(new Date(visit.expiresAt).getTime() - tick)} 남음
							</span>
						</button>
					))}
				</div>
			)}

			<h3 className="owner-section">오늘 판매중</h3>
			{home.products.length === 0 ? (
				<>
					<p className="state">아직 판매 중인 상품이 없어요. 첫 상품을 등록하고 시작해보세요.</p>
					<button className="phone__cta phone__cta--ghost" type="button" onClick={onRegisterProduct}>
						상품 등록하기
					</button>
				</>
			) : (
				home.products.map((product) => (
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
								{product.status !== "ON_SALE" && ` · ${product.status}`}
							</span>
							{product.activeHoldQty > product.availableQty && (
								<span className="owner-product__warn">
									❗ 찜이 남은 수량보다 많아요 (초과 {product.activeHoldQty - product.availableQty}개)
								</span>
							)}
						</span>
					</button>
				))
			)}

			<button className="phone__cta" type="button" onClick={onRegisterProduct}>
				+ 상품 등록
			</button>
		</div>
	);
}
