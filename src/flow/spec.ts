/**
 * 피그마 「소비자용 플로우」의 화면을 그대로 옮긴 점검표.
 *
 * 각 화면이 어느 API 로 그려지는지, 그 응답에 화면이 필요로 하는 값이 실제로 들어 있는지를
 * 호출해서 확인한다. 앱이 할 일(딥링크·클립보드·지도 렌더·푸시 수신)은 여기 없다 -- 서버가
 * 값을 주는지만 본다.
 */

export type Stage = "ready" | "partial" | "missing";

export interface FieldSpec {
	/** 화면에서 보이는 이름 */
	label: string;
	/** 응답 안의 경로. `a.b[0].c` 형태를 지원한다. */
	path: string;
	/** 값이 비어 있어도(=null) 화면이 성립하면 true */
	optional?: boolean;
}

export interface ScreenSpec {
	id: string;
	name: string;
	frame: string;
	/** 이 화면을 그리는 엔드포인트. 첫 번째가 점검에 쓰인다. */
	apis: string[];
	probe?: "nearbyStores" | "storeProducts" | "nearbyProducts" | "productDetail"
		| "holdDetail" | "holdHistory" | "completedHold" | "recipeDetail" | "none";
	fields?: FieldSpec[];
	/** 서버가 아직 못 주는 것 */
	gaps?: string[];
	/** 정책이 갈리는 지점 */
	notes?: string[];
}

export const FRAMES = [
	"홈 지도 & 목록",
	"거래/찜",
	"찜 완료 카운트다운",
	"찜 내역",
	"수령 · 레시피",
] as const;

export const SCREENS: ScreenSpec[] = [
	{
		id: "C-010",
		name: "홈 · 지도",
		frame: "홈 지도 & 목록",
		apis: ["GET /stores/nearby", "GET /holds/active", "GET/PUT /users/me/location"],
		probe: "nearbyStores",
		fields: [
			{ label: "매장 수", path: "totalStoreCount" },
			{ label: "마커 상한 초과", path: "truncated" },
			{ label: "매장명", path: "stores[0].name" },
			{ label: "좌표", path: "stores[0].latitude" },
			{ label: "판매중 개수 배지", path: "stores[0].sellableProductCount" },
		],
		gaps: ["판매중 0개 매장의 회색 `0` 마커 -- 지금은 0개 매장을 응답에서 아예 뺀다"],
		notes: [
			"위치 권한을 거부하면 S-001 이 권한 안내만 띄우고 조회하지 않는다 -- 기본 동네로 대신 조회하는 경로는 없다(2026-09-13 확정)",
			"헤더의 동네 이름은 /users/me/location 이 오간다. 좌표 → 행정동 변환은 앱이 하고 서버는 이름을 받아 둔다",
		],
	},
	{
		id: "C-010-05",
		name: "핀 탭 · 매장 미리보기",
		frame: "홈 지도 & 목록",
		apis: ["GET /stores/{storeId}/products"],
		probe: "storeProducts",
		fields: [
			{ label: "매장명", path: "name" },
			{ label: "거리", path: "distanceMeters" },
			{ label: "도보 시간", path: "walkingMinutes" },
			{ label: "마감 시간", path: "businessCloseTime" },
			{ label: "가장 이른 마감", path: "earliestPickupEndAt", optional: true },
			{ label: "상품", path: "products[0].name" },
		],
	},
	{
		id: "C-011",
		name: "홈 · 목록 (거리순 / 마감임박순)",
		frame: "홈 지도 & 목록",
		apis: ["GET /products/nearby"],
		probe: "nearbyProducts",
		fields: [
			{ label: "총 개수", path: "totalProductCount" },
			{ label: "매장명", path: "stores.content[0].storeName" },
			{ label: "도보 시간", path: "stores.content[0].walkingMinutes" },
			{ label: "매장 상품 수", path: "stores.content[0].productCount" },
			{ label: "매장 마감 배지", path: "stores.content[0].earliestPickupEndAt" },
			{ label: "할인율", path: "stores.content[0].products[0].discountRate" },
			{ label: "정가", path: "stores.content[0].products[0].originalPrice" },
			{ label: "남은 수량", path: "stores.content[0].products[0].availableQty" },
			{ label: "상품 마감", path: "stores.content[0].products[0].pickupEndAt" },
		],
		gaps: [
			"상품 카드의 `과채류` 배지 -- products.category 는 6종(VEGETABLE/FRUIT/…)뿐이고 소분류가 없다",
			"지도에서 누른 상점을 목록 맨 위로 올리는 정렬",
		],
		notes: [
			"정렬은 셋 다 받는다(거리순·마감임박순·할인율순). 할인율순은 그 매장의 최대 할인으로 매장을 줄 세우고, 카드 안 상품도 같은 기준으로 정렬한다",
			"카테고리는 칩과 같은 여덟이다(V0022) -- 채소·과일·육류·수산·유제품·베이커리·반찬·기타",
		],
	},
	{
		id: "C-020",
		name: "상품 상세",
		frame: "거래/찜",
		apis: ["GET /products/{productId}"],
		probe: "productDetail",
		fields: [
			{ label: "이미지", path: "photoUrls[0]" },
			{ label: "해시태그", path: "tags[0]", optional: true },
			{ label: "할인율", path: "discountRate" },
			{ label: "남은 수량", path: "availableQty" },
			{ label: "찜 버튼 상태", path: "holdButton" },
			{ label: "판매처", path: "store.name" },
			{ label: "주소", path: "store.address" },
			{ label: "내 위치로부터", path: "store.distanceMeters" },
			{ label: "도보 시간", path: "store.walkingMinutes" },
			{ label: "운영시간", path: "store.businessCloseTime" },
			{ label: "영업중", path: "store.openNow" },
			{ label: "추천 레시피", path: "recipes[0].title", optional: true },
			{ label: "레시피 조리시간", path: "recipes[0].cookTimeMinutes", optional: true },
		],
		gaps: [
			"추천 레시피의 `난이도 하/중` -- recipes 에 난이도 컬럼이 없다",
			"`20분 소요` -- cook_time_minutes 컬럼은 있으나 1,156건 전부 비어 있다",
		],
		notes: [
			"해시태그(`#꿀복` `#달콤`)는 지금 재료명이 올라간다. 마케팅 태그가 따로면 별도 저장이 필요하다",
			"사진은 상품당 1장으로 확정됐다(2026-09-13) -- photoUrls 가 길이 1인 것이 맞다",
		],
	},
	{
		id: "C-021",
		name: "수량 선택 · 찜 확인 시트",
		frame: "거래/찜",
		apis: ["POST /holds"],
		probe: "none",
		fields: [],
		notes: [
			"점검이 실제로 찜을 만들지는 않는다 -- 재고가 움직이고 취소권이 깎인다. /app 에서 눌러 확인한다",
			"수량 상한은 서버가 hold.user-qty-limit(3)으로 강제한다. 15분은 hold.ttl",
		],
	},
	{
		id: "C-022",
		name: "찜 완료 · 카운트다운",
		frame: "찜 완료 카운트다운",
		apis: ["GET /holds/{holdId}", "POST /holds/{holdId}/cancel"],
		probe: "holdDetail",
		fields: [
			{ label: "상태", path: "status" },
			{ label: "찜한 시각(진행바 시작)", path: "heldAt" },
			{ label: "만료 시각", path: "expiresAt" },
			{ label: "서버 시각(시계 보정)", path: "serverTime" },
			{ label: "합계 수량", path: "totalQty" },
			{ label: "합계 금액", path: "totalPrice" },
			{ label: "매장명", path: "store.name" },
			{ label: "주소(복사)", path: "store.address" },
			{ label: "전화", path: "store.phone" },
			{ label: "좌표(길찾기)", path: "store.latitude" },
			{ label: "영업중", path: "store.openNow" },
			{ label: "찜한 상품", path: "items[0].name" },
			{ label: "취소 주체", path: "canceledBy", optional: true },
			{ label: "취소 사유", path: "cancelReason", optional: true },
		],
		gaps: ["매장 정보 카드의 매장 사진 -- stores 에 사진 컬럼이 없다(지도 썸네일이면 서버 변경 없음)"],
		notes: [
			"만료 뒤 `다시 찜하기`는 열려 있다. 배치 전이라도 지연 만료로 EXPIRED 를 내리고 재찜을 받는다",
			"피그마의 `취소로 끝난 건 다시 찜하기 불가`는 초기 정책이다 -- 지금은 상품 단위 차단 대신 계정당 취소권(최대 3, 하루 1개 충전)으로 간다",
		],
	},
	{
		id: "C-030",
		name: "찜 내역 (진행 중 / 지난 내역)",
		frame: "찜 내역",
		apis: ["GET /holds"],
		probe: "holdHistory",
		fields: [
			{ label: "서버 시각", path: "serverTime" },
			{ label: "총 건수", path: "holds.totalElements" },
			{ label: "상태 배지", path: "holds.content[0].status" },
			{ label: "매장명", path: "holds.content[0].storeName" },
			{ label: "수량", path: "holds.content[0].totalQty" },
			{ label: "금액", path: "holds.content[0].totalPrice" },
			{ label: "찜한 시각", path: "holds.content[0].heldAt" },
			{ label: "상품", path: "holds.content[0].items[0].name" },
		],
		notes: ["`어제`·`3일 전` 같은 상대 표기는 앱이 만든다 -- 서버는 절대시각만 준다"],
	},
	{
		id: "C-031",
		name: "찜 상세",
		frame: "찜 내역",
		apis: ["GET /holds/{holdId}"],
		probe: "holdDetail",
		fields: [
			{ label: "찜한 시각", path: "heldAt" },
			{ label: "만료 시각", path: "expiresAt" },
			{ label: "상태", path: "status" },
			{ label: "상점", path: "store.name" },
			{ label: "상품", path: "items[0].name" },
			{ label: "수량", path: "items[0].qty" },
		],
		notes: ["사진은 상품당 1장으로 확정됐다(2026-09-13) -- 캐러셀은 화면에서 빠진다"],
	},
	{
		id: "C-040",
		name: "수령 완료",
		frame: "수령 · 레시피",
		apis: ["GET /holds/{holdId}"],
		probe: "completedHold",
		fields: [
			{ label: "상태", path: "status" },
			{ label: "수령 시각(날짜)", path: "completedAt" },
			{ label: "상점", path: "store.name" },
			{ label: "품목", path: "items[0].name" },
			{ label: "구매 수량", path: "items[0].qty" },
			{ label: "가격", path: "totalPrice" },
		],
		gaps: ["이 화면의 추천 레시피 -- 찜 응답에는 레시피가 없어 앱이 상품 상세를 한 번 더 불러야 한다"],
		notes: ["점주가 O-040 에서 수령 완료를 누르면 이 응답이 COMPLETED 로 바뀐다"],
	},
	{
		id: "C-041",
		name: "레시피 상세",
		frame: "수령 · 레시피",
		apis: ["GET /recipes/{id}"],
		probe: "recipeDetail",
		fields: [
			{ label: "제목", path: "title" },
			{ label: "이미지", path: "imageUrl", optional: true },
			{ label: "조리시간", path: "cookTimeMinutes", optional: true },
			{ label: "준비 재료", path: "ingredients[0].rawText" },
			{ label: "조리순서", path: "steps[0].content" },
			{ label: "열량", path: "nutrition.calories", optional: true },
			{ label: "탄수화물", path: "nutrition.carbsG", optional: true },
			{ label: "단백질", path: "nutrition.proteinG", optional: true },
			{ label: "지방", path: "nutrition.fatG", optional: true },
			{ label: "나트륨", path: "nutrition.sodiumMg", optional: true },
		],
		gaps: [
			"`난이도 하` 배지 -- recipes 에 난이도 컬럼이 없다",
			"`20분 소요` -- 컬럼은 있으나 값이 비어 있다(1,156건 전부)",
		],
	},
];

export type Lookup =
	/** 값이 들어 있다 */
	| { kind: "value"; value: unknown }
	/** 경로는 맞는데 값이 비어 있다(Jackson 이 null 을 지우므로 "없음"과 구분되지 않는다) */
	| { kind: "blank" }
	/** 목록이 비어 있어 확인할 행이 없다 -- 서버 문제가 아니라 데이터 문제다 */
	| { kind: "noRows" };

/** `a.b[0].c` 를 따라간다. */
export function lookUp(source: unknown, path: string): Lookup {
	let node: unknown = source;
	for (const key of path.replace(/\[(\d+)\]/g, ".$1").split(".")) {
		if (Array.isArray(node) && node.length === 0) {
			return { kind: "noRows" };
		}
		if (node === null || node === undefined || typeof node !== "object") {
			return { kind: "blank" };
		}
		node = (node as Record<string, unknown>)[key];
	}
	if (node === null || node === undefined) {
		return { kind: "blank" };
	}
	if (Array.isArray(node) && node.length === 0) {
		return { kind: "noRows" };
	}
	return { kind: "value", value: node };
}
