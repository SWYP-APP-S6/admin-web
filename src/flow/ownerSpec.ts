/**
 * 피그마 「점주용 플로우」(O-0xx)의 화면을 그대로 옮긴 점검표.
 *
 * 소비자 쪽(spec.ts)과 다른 점은 **미구현 화면까지 적어 둔다**는 것이다. 서버가 아직 그 화면을
 * 그릴 수 없다면 무엇이 없어서인지(`missing`)를 남긴다 -- 구현된 화면은 실제로 호출해서 응답에
 * 값이 들어 있는지 확인한다.
 */

import type { FieldSpec } from "./spec";

export type OwnerProbe =
	| "myStore"
	| "ownerHome"
	| "ownerProduct"
	| "ownerHolds"
	| "ownerHoldDetail"
	| "notifications"
	| "none";

export interface OwnerScreenSpec {
	id: string;
	name: string;
	frame: string;
	/** 이 화면을 그리는 엔드포인트. */
	apis: string[];
	probe?: OwnerProbe;
	fields?: FieldSpec[];
	/** 이 화면에 필요한데 **서버에 아직 없는 것**. 하나라도 있으면 화면은 미구현으로 표시된다. */
	missing?: string[];
	/** 값은 오지만 화면과 어긋나는 것 */
	gaps?: string[];
	notes?: string[];
}

export const OWNER_FRAMES = [
	"온보딩 & 홈",
	"상품 등록",
	"상품 관리",
	"찜 현황",
	"알림",
] as const;

export const OWNER_SCREENS: OwnerScreenSpec[] = [
	{
		id: "O-001",
		name: "로그인",
		frame: "온보딩 & 홈",
		apis: ["POST /auth/owner/kakao", "POST /auth/owner/kakao/exchange"],
		probe: "none",
		notes: [
			"점주 앱은 소비자 앱과 **별개의 카카오 앱**이다 — 서버가 access_token_info 로 app_id 를 확인하므로 소비자 앱 토큰으로는 이 엔드포인트를 통과하지 못한다",
			"유저 식별자가 (provider, provider_id, role)이라 같은 사람이 소비자 계정과 점주 계정을 따로 가진다",
			"admin-web 에서 카카오 버튼을 쓰려면 .env.local 에 VITE_KAKAO_OWNER_JS_KEY 가 있어야 한다(없으면 테스트 토큰으로 들어간다)",
			"테스트 토큰(POST /dev/test-token)은 관리자 토큰을 요구한다 — 이 페이지에 관리자로 로그인해 있으면 그대로 통과한다",
		],
	},
	{
		id: "O-002",
		name: "약관 동의",
		frame: "온보딩 & 홈",
		apis: ["POST /auth/signup"],
		probe: "none",
		notes: [
			"가입은 2단계다 — 첫 카카오 로그인은 users 행을 만들지 않고 signupToken 만 주고, 약관 동의가 계정을 만든다",
			"필수 약관은 SignupRequest 의 @AssertTrue 가 강제한다. 스키마에는 terms_agreed_at 한 건만 남아 항목별 이력은 없다",
		],
	},
	{
		id: "O-003",
		name: "상점 정보 등록 (Step1 · Step2)",
		frame: "온보딩 & 홈",
		apis: ["POST /owner/stores", "GET /owner/stores/me"],
		probe: "myStore",
		fields: [
			{ label: "상호", path: "name" },
			{ label: "심사 상태", path: "status" },
			{ label: "가게 종류", path: "categories[0]" },
			{ label: "우편번호", path: "postalCode", optional: true },
			{ label: "주소", path: "address" },
			{ label: "연락처", path: "phone" },
			{ label: "영업 시작", path: "businessOpenTime" },
			{ label: "영업 종료", path: "businessCloseTime" },
			{ label: "영업 요일", path: "businessDays[0]" },
		],
		gaps: [
			"가게 정보를 **수정**하는 API 가 없다 — 등록과 조회뿐이라 한 번 잘못 넣으면 되돌릴 방법이 앱에 없다",
		],
		notes: [
			"우편번호 검색은 클라이언트(Daum 우편번호 서비스)가 하고, 서버는 주소 문자열을 받아 카카오 로컬 API 로 좌표를 찍는다 — KAKAO_LOCAL_REST_API_KEY 가 없으면 등록이 전부 거부된다",
			"등록 직후 상태는 PENDING 이다. 관리자 화면(가게 탭)에서 승인해야 소비자 탐색에 잡힌다",
			"점주 API 는 승인 여부를 보지 않는다 — PENDING 이어도 상품 등록·찜 관리는 그대로 된다",
		],
	},
	{
		id: "O-010",
		name: "홈 (최초접근 · 디폴트 · 리스트)",
		frame: "온보딩 & 홈",
		apis: ["GET /owner/home"],
		probe: "ownerHome",
		fields: [
			{ label: "상점명", path: "store.name" },
			{ label: "심사 상태", path: "store.status" },
			{ label: "방문 예정", path: "summary.upcomingVisitCount" },
			{ label: "픽업 완료", path: "summary.completedTodayCount" },
			{ label: "판매중 수량", path: "summary.onSaleQty" },
			{ label: "오늘 만료된 찜", path: "issues.expiredTodayCount" },
			{ label: "읽지 않은 알림", path: "unreadNotificationCount" },
			{ label: "상품 등록 이력", path: "hasRegisteredProduct" },
			{ label: "곧 방문 · 닉네임", path: "upcomingVisits[0].nickname" },
			{ label: "곧 방문 · 만료 시각", path: "upcomingVisits[0].expiresAt" },
			{ label: "판매중 · 이름", path: "products[0].name" },
			{ label: "판매중 · 사진", path: "products[0].photoUrl" },
			{ label: "판매중 · 남은 수량", path: "products[0].availableQty" },
			{ label: "판매중 · 방문 예정 수량", path: "products[0].activeHoldQty" },
		],
		missing: [
			"`N명은 제품 구매가 불가능해요` 의 **인원 수**는 없다 — 부족분 수량은 issues.shortfallQty·productsShortOfStock 과 카드별 shortfallQty 로 오지만, 그게 몇 명의 찜인지는 세지 않는다",
		],
		gaps: [
			"`곧 방문해요`의 카운트다운 기준 시각이 없다 — 응답에 serverTime 이 없어 단말 시계로 세야 한다(찜 상세에는 있다)",
		],
		notes: [
			"화면 셋(최초접근 · 디폴트 · 리스트)은 hasRegisteredProduct 와 products 의 길이로 갈린다",
			"products 는 **지금 판매중인 것만** 온다(findSellingNowOfStore) — 마감·품절 상품은 빠진다",
			"상단 `새로운 찜이 생겼어요` 배너의 재료는 있다 — HoldService 가 NEW_HOLD_RECEIVED 알림 행을 만든다(#48). 다만 **새 픽업이 열릴 때만** 보내므로 같은 손님이 이어 담은 건에는 알림이 없다",
		],
	},

	{
		id: "O-020-1",
		name: "상품 등록 Step1 (사진 · 품목명)",
		frame: "상품 등록",
		apis: ["POST /owner/products/photos", "POST /owner/products"],
		probe: "none",
		notes: [
			"업로드가 먼저다 — 파일을 올리면 URL 이 돌아오고, 등록·미리보기는 그 URL 을 받는다. 서버는 **자기가 저장한 URL 만** 받아들인다(그 밖은 400 INVALID_PHOTO_URL)",
			"받는 것은 jpg · png 뿐이고, 확장자가 아니라 파일 헤더로 판별한다. 상한 10MB(초과 시 413 IMAGE_TOO_LARGE)",
			"피그마는 최대 5장이지만 스키마는 products.photo_url 한 칸이다 — 사진 1장으로 확정(2026-09-13)",
			"품목명은 30자 상한이다(@Size(max=30))",
		],
	},
	{
		id: "O-020-2",
		name: "상품 등록 Step2 (수량 · 가격)",
		frame: "상품 등록",
		apis: ["POST /owner/products"],
		probe: "none",
		notes: [
			"할인율은 앱이 보내지 않는다 — 서버가 (정가−할인가)/정가 로 계산해 저장한다",
			"할인가 ≥ 정가면 INVALID_PRICE, 수량 < 1 이면 검증 실패다",
		],
	},
	{
		id: "O-020-3",
		name: "상품 등록 Step3 (픽업 종료 · 식자재 태그)",
		frame: "상품 등록",
		apis: ["POST /owner/products"],
		probe: "none",
		missing: [
			"식자재 태그를 **이름으로 찾는 API 가 없다** — 서버는 ingredients 의 id(정수)만 받는데, 앱이 그 id 를 알 방법이 없다",
		],
		notes: [
			"픽업 종료시간을 비우면 서버가 가게 영업 종료 시각으로 채운다(이미 지났으면 다음 날)",
			"지금부터 24시간을 넘기면 INVALID_PICKUP_WINDOW 다",
		],
	},
	{
		id: "O-021",
		name: "상품 미리보기 (Bottom Sheet)",
		frame: "상품 등록",
		apis: ["POST /owner/products/preview"],
		probe: "none",
		notes: [
			"서버가 등록과 **같은 규칙**으로 할인율·픽업 창을 계산해 돌려준다(저장하지 않는다) — 앱이 따로 계산하면 등록된 값과 어긋날 수 있다",
			"가격·재료 id 검증도 여기서 먼저 걸린다. 쓰기 모양의 요청이라 점검에서는 부르지 않고 /owner 에서 눌러 확인한다",
		],
	},

	{
		id: "O-040-1",
		name: "점포 관리 · 등록된 상품",
		frame: "상품 관리",
		apis: ["GET /owner/home (대체)"],
		probe: "ownerHome",
		fields: [
			{ label: "상품 이름", path: "products[0].name" },
			{ label: "판매가", path: "products[0].salePrice" },
			{ label: "남은 수량", path: "products[0].availableQty" },
			{ label: "방문 예정 수량", path: "products[0].activeHoldQty" },
		],
		missing: [
			"`GET /owner/products`(내 상품 목록 · 페이지네이션)가 없다 — 홈의 판매중 목록으로 대신하고 있어 마감·품절된 지난 상품은 어디서도 볼 수 없다(피그마의 `등록된 상품 99` 탭)",
		],
	},
	{
		id: "O-030",
		name: "상품 관리 상세",
		frame: "상품 관리",
		apis: ["GET /owner/products/{id}", "PATCH /owner/products/{id}/available-qty"],
		probe: "ownerProduct",
		fields: [
			{ label: "이름", path: "name" },
			{ label: "최초 등록", path: "initialQty" },
			{ label: "방문 예정", path: "heldQty" },
			{ label: "픽업 완료", path: "completedQty" },
			{ label: "남은 수량", path: "availableQty" },
			{ label: "정가", path: "originalPrice" },
			{ label: "할인가", path: "salePrice" },
			{ label: "할인율", path: "discountRate" },
			{ label: "픽업 종료시간", path: "pickupEndAt" },
			{ label: "상태", path: "status" },
			{ label: "선반 총 수량", path: "stockQty" },
			{ label: "부족분", path: "shortfallQty" },
			{ label: "스테퍼 하한", path: "minAdjustableQty" },
			{ label: "수정 가능", path: "stockEditable" },
			{ label: "재확인 대기", path: "reconfirmPending" },
			{ label: "식자재 태그", path: "ingredientTags[0]", optional: true },
		],
		gaps: [
			"식자재 태그가 **id 숫자만** 온다 — 화면의 `복숭아(대표) · 청과` 처럼 이름을 보여줄 수 없다",
			"가격 · 픽업 종료시간을 고치는 API 가 없다 — 이 화면에서 바꿀 수 있는 것은 수량뿐이다",
		],
		notes: [
			"점주가 적는 수는 **선반에 있는 총 수량**(찜 포함)이다 — 손님에게 보이는 availableQty 는 서버가 거기서 찜을 뺀 값이고, 모자란 만큼이 shortfallQty 로 온다",
			"stockEditable 은 서버가 거부하는 조건(확정 잠금 · 마감)과 같은 식으로 계산된다 — 화면이 따로 판단하지 않는다",
		],
	},
	{
		id: "O-030-BS",
		name: "수량 확인 Bottom Sheet",
		frame: "상품 관리",
		apis: ["PATCH /owner/products/{id}/available-qty"],
		probe: "none",
		notes: [
			"찜이 적은 수량을 넘으면 `cancelOverflow` 가 정한다 — true 면 **먼저 찜한 순으로 배정하고 넘치는 찜만** 취소하며 손님에게 알림 행을 만들고, false 면 수량만 저장되고 찜은 남는다(BR-015)",
			"선반을 0 으로 내리면서 cancelOverflow 를 켜는 것이 예전 CANCEL_ALL 이다",
			"점검이 실제로 수량을 바꾸지는 않는다 — 재고가 움직인다. /owner 에서 눌러 확인한다",
		],
	},
	{
		id: "O-050 · O-051",
		name: "재고 재확인 모달 · 수량 직접 입력",
		frame: "상품 관리",
		apis: [
			"POST /owner/products/{id}/stock-reconfirm",
			"PATCH /owner/products/{id}/stock (아니요 → 수량 직접 입력)",
		],
		probe: "none",
		notes: [
			"요청은 찜이 최초 등록의 60% 에 닿는 순간 서버가 **한 번만** 보낸다(HoldService, STOCK_RECONFIRM_REQUEST). 상품 상세의 reconfirmPending 이 그 신호다",
			"`네, 맞아요`는 픽업 마감까지 수량을 잠근다(이후 409 STOCK_LOCKED). 마감이 지나면 다시 열린다",
			"찜이 이미 선반보다 많은 상태에서 `네`는 거절된다(409 STOCK_SHORT_OF_HOLDS) — 부족분을 먼저 처리해야 한다",
			"한 번 답하면 다시 답할 수 없다(409 RECONFIRM_NOT_REQUESTED)",
		]
	},

	{
		id: "O-040-2",
		name: "점포 관리 · 찜 현황",
		frame: "찜 현황",
		apis: ["GET /owner/holds?status="],
		probe: "ownerHolds",
		fields: [
			{ label: "전체", path: "counts.all" },
			{ label: "진행중", path: "counts.holding" },
			{ label: "픽업 완료", path: "counts.completed" },
			{ label: "만료", path: "counts.expired" },
			{ label: "점주 취소", path: "counts.canceledByOwner" },
			{ label: "손님 취소", path: "counts.canceledByUser" },
			{ label: "총 건수", path: "holds.totalElements" },
			{ label: "닉네임", path: "holds.content[0].nickname" },
			{ label: "상태", path: "holds.content[0].status" },
			{ label: "찜한 시각", path: "holds.content[0].heldAt" },
			{ label: "만료 시각", path: "holds.content[0].expiresAt" },
			{ label: "상품명", path: "holds.content[0].items[0].productName" },
		],
		gaps: [
			"목록 응답에 serverTime 이 없다 — 남은 시간을 단말 시계로 세게 된다(상세 응답에는 있다)",
		],
		notes: [
			"소비자의 CANCELED 가 점주에게는 취소 주체로 갈라진다(CANCELED_BY_OWNER / CANCELED_BY_USER)",
			"피그마의 `픽업불가` 탭은 EXPIRED 로 본다 — 서버에 그 이름의 상태는 없다",
		],
	},
	{
		id: "O-040",
		name: "찜 상세 · 픽업 완료",
		frame: "찜 현황",
		apis: ["GET /owner/holds/{id}", "POST /owner/holds/{id}/complete"],
		probe: "ownerHoldDetail",
		fields: [
			{ label: "상태", path: "status" },
			{ label: "닉네임", path: "nickname" },
			{ label: "상점명", path: "storeName" },
			{ label: "합계 수량", path: "totalQty" },
			{ label: "합계 금액", path: "totalPrice" },
			{ label: "서버 시각", path: "serverTime" },
			{ label: "만료 시각", path: "expiresAt" },
			{ label: "상품명", path: "items[0].productName" },
			{ label: "상품 사진", path: "items[0].photoUrl" },
			{ label: "품목 합계", path: "items[0].lineTotal" },
			{ label: "수령 시각", path: "completedAt", optional: true },
		],
		notes: [
			"만료된 찜도 hold.no-show-grace(30분) 안이면 수령 완료를 받아준다 — 그때는 재고에서 다시 차감하고, 남은 게 없으면 PRODUCT_STOCK_GONE 이다",
			"노쇼로 깎였던 취소권은 뒤늦은 수령 완료로 되돌려준다",
		],
	},
	{
		id: "O-042",
		name: "찜 취소하기 (선별 취소)",
		frame: "찜 현황",
		apis: [],
		probe: "none",
		missing: [
			"**취소 대상 목록을 보여줄 API 가 없다** — 선착순 배정과 취소 자체는 `PATCH /stock` 의 cancelOverflow 안에서 일어나므로, 화면이 `어느 찜이 취소되는지`를 미리 체크박스로 보여줄 수 없다",
		],
		notes: [
			"먼저 찜한 순으로 배정하고 넘치는 찜만 취소하는 계산은 서버에 있다(createdAt, id 순) — 없는 것은 그 결과를 **미리 보여주는** 경로뿐이다",
		],
	},
	{
		id: "O-043",
		name: "취소 안내 미리보기 (Bottom Sheet)",
		frame: "찜 현황",
		apis: [],
		probe: "none",
		missing: [
			"안내 문구를 미리 보여주는 API 가 없다 — cancelOverflow 가 서버에 하드코딩된 문구로 알림 행을 만든다(`… 재고가 모자라 찜이 취소됐어요. 결제된 금액은 없어요.`)",
		],
		notes: ["피그마의 문구는 매장명·연락처가 들어간 SMS 형식이다 — 지금 알림 본문과 형태가 다르다"],
	},

	{
		id: "O-010-N",
		name: "알림함",
		frame: "알림",
		apis: ["GET /notifications", "PATCH /notifications/{id}/read", "POST /notifications/read-all"],
		probe: "notifications",
		fields: [
			{ label: "읽지 않음", path: "unreadCount" },
			{ label: "종류", path: "notifications.content[0].type" },
			{ label: "제목", path: "notifications.content[0].title" },
			{ label: "본문", path: "notifications.content[0].body" },
			{ label: "받은 시각", path: "notifications.content[0].notifiedAt" },
		],
		notes: [
			"알림함 엔드포인트 자체는 소비자·점주 공용이다(REALM_USER 면 열린다)",
			"점주 앞으로 가는 알림은 NEW_HOLD_RECEIVED 하나다 — 재고 재확인(STOCK_RECONFIRM_REQUEST)은 아직 아무도 만들지 않는다",
		],
	},
	{
		id: "O-0NN",
		name: "기기 토큰 등록 · 해제",
		frame: "알림",
		apis: ["POST /notifications/device-tokens", "DELETE /notifications/device-tokens"],
		probe: "none",
		notes: [
			"푸시 수신처다. 앱은 로그인 직후 등록하고 **로그아웃 때 지운다** — 지우지 않으면 그 기기를 이어 쓰는 다음 사람이 남의 푸시를 받는다",
			"발송은 알림 행을 만드는 자리가 아니라 아웃박스 배치(push_state='PENDING')가 커밋 뒤에 맡는다. FCM 키가 없으면 발송만 꺼지고 알림함은 그대로다",
			"쓰기라 점검에서는 부르지 않는다 — 점주 앱 테스트의 설정 탭(소비자는 마이)에서 눌러 확인한다",
		],
	},
];
