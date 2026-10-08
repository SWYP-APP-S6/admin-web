export interface ApiResponse<T> {
	status: number;
	code: string;
	message: string;
	data: T;
}

export interface ErrorBody {
	status: number;
	code: string;
	message: string;
	fieldErrors: Record<string, string> | null;
	/** 다시 시도할 수 있는 시각. 취소 가능 횟수를 다 썼을 때만 온다. */
	retryAt?: string | null;
}

export interface PageResponse<T> {
	content: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
	last: boolean;
}

export interface TokenResponse {
	accessToken: string;
	refreshToken: string;
}

export interface RecipeSummary {
	id: number;
	title: string;
	category: string | null;
	cookTimeMinutes: number | null;
	imageThumbUrl: string | null;
	viewCount: number;
	likeCount: number;
}

export interface RecipeStep {
	seq: number;
	content: string;
	imageUrl: string | null;
}

export interface RecipeIngredient {
	seq: number;
	groupName: string | null;
	ingredientName: string | null;
	amount: string | null;
	unit: string | null;
	rawText: string | null;
}

export interface RecipeNutrition {
	basis: string;
	servingWeightG: string | null;
	calories: string | null;
	carbsG: string | null;
	proteinG: string | null;
	fatG: string | null;
	sodiumMg: string | null;
}

export interface RecipeDetail {
	id: number;
	title: string;
	category: string | null;
	cookMethod: string | null;
	cookTimeMinutes: number | null;
	servings: number;
	imageUrl: string | null;
	imageThumbUrl: string | null;
	sourceUrl: string | null;
	viewCount: number;
	likeCount: number;
	steps: RecipeStep[];
	ingredients: RecipeIngredient[];
	nutrition: RecipeNutrition | null;
	tags: string[];
}

export type UserRole = "CONSUMER" | "OWNER";

/** 서버가 남기는 행동 로그의 종류(backend DomainEventType). *_VIEW · APP_OPEN 은 앱 몫이라 서버엔 안 쌓인다. */
export type DomainEventType =
	| "APP_OPEN"
	| "PRODUCT_LIST_VIEW"
	| "PRODUCT_DETAIL_VIEW"
	| "RECIPE_IMPRESSION"
	| "HOLD_CREATE"
	| "HOLD_FAIL"
	| "NOTIFICATION_PERMISSION_RESULT"
	| "HOLD_CANCEL"
	| "HOLD_EXPIRE"
	| "PICKUP_COMPLETE"
	| "STOCK_RECONFIRM_TRIGGER"
	| "STOCK_RECONFIRM_YES"
	| "STOCK_RECONFIRM_NO"
	| "STOCK_RECONFIRM_DEFER"
	| "STOCK_ADJUST"
	| "OVERSELL_DETECTED"
	| "RECIPE_VIEW"
	| "RECIPE_FEEDBACK"
	| "PRODUCT_REGISTER"
	| "PRODUCT_SOLD_OUT"
	| "STORE_REGISTER";

export type CancelCreditReason = "CANCEL" | "NO_SHOW" | "REFILL" | "GIVE_BACK" | "ADMIN_ADJUST";

export interface CancelCreditBalance {
	credits: number;
	max: number;
	/** 가득 차 있으면 null. */
	nextRefillAt: string | null;
}

export type PushState = "PENDING" | "SENT" | "SKIPPED" | "FAILED";

export type TermsType =
	| "SERVICE"
	| "PRIVACY_COLLECTION"
	| "LOCATION"
	| "THIRD_PARTY"
	| "MARKETING"
	| "PRIVACY_POLICY";

/** GET /admin/users/{id}. 문의 대응 한 화면에 필요한 것을 모은다. */
export interface AdminUserDetail {
	id: number;
	role: UserRole;
	nickname: string;
	phone: string | null;
	oauthProvider: string | null;
	oauthProviderId: string | null;
	marketingOptIn: boolean;
	/** 관리자가 테스트를 허가했다(실제 계정만). 허가하면 테스트 모드도 함께 켜진다. */
	testerAllowed: boolean;
	/** 테스트 모드 — 카카오로 로그인하면 테스트 계정으로 들어간다. */
	testMode: boolean;
	/** 이 행이 테스트 계정이다(같은 카카오 계정의 별도 행, 만들 때 정해지고 바뀌지 않음). */
	tester: boolean;
	termsAgreedAt: string;
	createdAt: string;
	location: {
		regionName: string;
		latitude: number;
		longitude: number;
		updatedAt: string;
	} | null;
	store: { id: number; name: string; status: StoreStatus; createdAt: string } | null;
	cancelCredits: CancelCreditBalance & {
		events: {
			id: number;
			reason: CancelCreditReason;
			delta: number;
			holdId: number | null;
			createdAt: string;
		}[];
	};
	/** 저장된 상태 기준이라 만료 시각이 지난 HOLDING 도 holding 에 센다. */
	holds: {
		holding: number;
		completed: number;
		expired: number;
		canceledByUser: number;
		canceledByOwner: number;
	};
	notifications: {
		unreadCount: number;
		recent: {
			id: number;
			type: NotificationType | "STORE_APPROVED" | "STORE_REJECTED";
			title: string;
			body: string;
			readAt: string | null;
			pushState: PushState;
			pushAttempts: number;
			pushedAt: string | null;
			createdAt: string;
		}[];
	};
	deviceTokens: {
		id: number;
		platform: DevicePlatform;
		tokenSuffix: string;
		lastUsedAt: string;
		createdAt: string;
	}[];
	termsAgreements: { type: TermsType; version: number; title: string; agreedAt: string }[];
}

export type AdminNotificationType = NotificationType | "STORE_APPROVED" | "STORE_REJECTED";

/** GET /admin/notifications 의 한 줄. */
export interface AdminNotification {
	id: number;
	user: { id: number; nickname: string };
	type: AdminNotificationType;
	title: string;
	body: string;
	deepLink: string | null;
	readAt: string | null;
	pushState: PushState;
	pushAttempts: number;
	pushedAt: string | null;
	createdAt: string;
}

export interface PushStateCounts {
	pending: number;
	sent: number;
	skipped: number;
	failed: number;
}

/** GET /admin/notifications/push-summary. pushEnabled 가 false 면 FCM 키가 없어 발송만 꺼진 상태다. */
export interface PushOutboxSummary {
	pushEnabled: boolean;
	allTime: PushStateCounts;
	last24Hours: PushStateCounts;
	/** 가장 오래 기다리는 PENDING 의 생성 시각. 배치가 멈추면 이 값이 과거로 남는다. */
	oldestPendingAt: string | null;
}

export type AdminProductFilter = "ALL" | "ON_SALE" | "SOLD_OUT" | "CLOSED" | "HIDDEN";

/** 소비자 조회 조건을 뒤집은 것. 하나라도 있으면 소비자 화면에 안 뜬다. */
export type VisibilityIssue =
	| "STORE_NOT_APPROVED"
	| "STORE_CLOSED_TODAY"
	| "STORE_LOCATION_OUT_OF_RANGE"
	| "PRODUCT_CLOSED"
	| "PICKUP_ENDED"
	| "NO_STOCK";

/** GET /admin/products 의 한 줄. status 는 배치 전이라도 픽업 마감이 지났으면 CLOSED 다. */
export interface AdminProduct {
	id: number;
	name: string;
	category: ProductCategory;
	photoUrl: string;
	store: { id: number; name: string; status: StoreStatus };
	initialQty: number;
	stockQty: number;
	heldQty: number;
	availableQty: number;
	originalPrice: number;
	salePrice: number;
	discountRate: number;
	pickupStartAt: string;
	pickupEndAt: string;
	status: ProductStatus;
	reconfirmPending: boolean;
	stockConfirmedAt: string | null;
	visibleToConsumers: boolean;
	hiddenReasons: VisibilityIssue[];
	createdAt: string;
}

/** GET /admin/holds 의 한 줄. status 는 만료 시각이 지난 HOLDING 을 배치 전이라도 EXPIRED 로 준다. */
export interface AdminHold {
	id: number;
	groupId: number;
	status: HoldStatus;
	user: { id: number; name: string };
	store: { id: number; name: string };
	product: { id: number; name: string };
	qty: number;
	salePrice: number;
	lineTotal: number;
	heldAt: string;
	expiresAt: string;
	completedAt: string | null;
	canceledAt: string | null;
	canceledBy: "USER" | "OWNER" | null;
	cancelReason: string | null;
	noShowChargedAt: string | null;
}

/** GET /admin/events 의 한 줄. 차원 id 는 그 이벤트에 해당하는 것만 채워지고 나머지는 null. */
export interface DomainEvent {
	id: number;
	eventType: DomainEventType;
	userId: number | null;
	storeId: number | null;
	productId: number | null;
	holdId: number | null;
	recipeId: number | null;
	/** 기록 시점의 이름(nickname · storeName · productName)과 이벤트별 값. 키는 이벤트마다 다르다. */
	payload: Record<string, unknown>;
	createdAt: string;
}

export interface KakaoLoginResult {
	registered: boolean;
	accessToken: string | null;
	refreshToken: string | null;
	signupToken: string | null;
}

export interface UserTokenResponse {
	accessToken: string;
	refreshToken: string;
}

export interface UserSignupPayload {
	signupToken: string;
	serviceTermsAgreed: boolean;
	privacyTermsAgreed: boolean;
	locationTermsAgreed: boolean;
	thirdPartyTermsAgreed: boolean;
	marketingOptIn: boolean;
}

export interface UserSummary {
	id: number;
	role: UserRole;
	nickname: string;
	phone: string | null;
	oauthProvider: string | null;
	/** 사용자가 설정한 기본 동네. 위치 권한을 거부했을 때의 탐색 기준이며, 미설정이면 null. */
	regionName: string | null;
	marketingOptIn: boolean;
	testerAllowed: boolean;
	testMode: boolean;
	tester: boolean;
	termsAgreedAt: string;
	createdAt: string;
	/** 판매자가 등록한 가게. 소비자이거나 아직 가게를 등록하지 않았으면 null. */
	store: {
		id: number;
		name: string;
		status: StoreStatus;
	} | null;
}

export type StoreStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface StoreSummary {
	id: number;
	name: string;
	status: StoreStatus;
	address: string;
	addressDetail: string | null;
	phone: string;
	businessOpenTime: string;
	businessCloseTime: string;
	owner: {
		id: number;
		nickname: string;
		phone: string | null;
	};
	createdAt: string;
}

export interface StoreDetail extends StoreSummary {
	categories: StoreCategory[];
	postalCode: string | null;
	businessDays: DayOfWeek[];
	businessRegistrationNumber: string | null;
	applicationNote: string | null;
}

export type ProductCategory =
	| "VEGETABLE"
	| "FRUIT"
	| "MEAT"
	| "SEAFOOD"
	| "DAIRY_EGG"
	| "BAKERY"
	| "SIDE_DISH"
	| "ETC";

export type NearbyProductSort = "DISTANCE" | "PICKUP_DEADLINE" | "DISCOUNT_RATE";

export interface NearbyProduct {
	id: number;
	name: string;
	photoUrl: string;
	category: ProductCategory;
	originalPrice: number;
	salePrice: number;
	discountRate: number;
	availableQty: number;
	pickupEndAt: string;
}

export interface NearbyStoreGroup {
	storeId: number;
	storeName: string;
	distanceMeters: number;
	walkingMinutes: number;
	productCount: number;
	hasMoreProducts: boolean;
	earliestPickupEndAt: string;
	products: NearbyProduct[];
}

export interface NearbyProducts {
	totalProductCount: number;
	stores: PageResponse<NearbyStoreGroup>;
}

export interface NearbyStoreMarker {
	storeId: number;
	name: string;
	latitude: number;
	longitude: number;
	sellableProductCount: number;
}

export interface NearbyStores {
	totalStoreCount: number;
	truncated: boolean;
	stores: NearbyStoreMarker[];
}

export interface StoreProducts {
	storeId: number;
	name: string;
	latitude: number;
	longitude: number;
	/** 위치를 넘기지 않으면 null. */
	distanceMeters: number | null;
	walkingMinutes: number | null;
	businessCloseTime: string;
	earliestPickupEndAt: string | null;
	productCount: number;
	products: NearbyProduct[];
}

export type HoldButtonState =
	| "AVAILABLE"
	| "ALREADY_HOLDING"
	| "OTHER_STORE"
	| "SOLD_OUT"
	| "CLOSED";

export type ProductStatus = "ON_SALE" | "SOLD_OUT" | "CLOSED";

export type HoldStatus = "HOLDING" | "COMPLETED" | "CANCELED" | "EXPIRED";

export interface RecipeSuggestion {
	id: number;
	title: string;
	imageThumbUrl: string | null;
	cookTimeMinutes: number | null;
	ingredientNames: string[];
}

export interface ProductBrowseDetail {
	id: number;
	name: string;
	category: ProductCategory;
	tags: string[];
	photoUrls: string[];
	originalPrice: number;
	salePrice: number;
	discountRate: number;
	availableQty: number;
	pickupStartAt: string;
	pickupEndAt: string;
	status: ProductStatus;
	holdButton: HoldButtonState;
	/** 이 상품이 담긴 내 찜. 아니면 null. */
	myHoldId: number | null;
	store: {
		id: number;
		name: string;
		address: string;
		addressDetail: string | null;
		phone: string;
		latitude: number;
		longitude: number;
		distanceMeters: number | null;
		walkingMinutes: number | null;
		businessOpenTime: string;
		businessCloseTime: string;
		openNow: boolean;
	};
	recipes: RecipeSuggestion[];
}

export interface HoldItem {
	holdId: number;
	productId: number;
	name: string;
	photoUrl: string;
	originalPrice: number;
	salePrice: number;
	discountRate: number;
	status: ProductStatus;
	qty: number;
	lineTotal: number;
}

/** 찜 = 한 가게에서의 한 번의 픽업. 상품이 여러 개 담긴다. */
export interface HoldDetail {
	/** 이 응답이 매달린 찜. 묶음 조회에서는 묶음의 첫 찜이다. */
	id: number;
	/** 한 번의 방문. 같은 가게에서 이어 담은 찜들이 이 키를 공유한다. */
	groupId: number;
	status: HoldStatus;
	totalQty: number;
	totalPrice: number;
	heldAt: string;
	expiresAt: string;
	/** 서버 기준 현재 시각. 카운트다운은 이 오프셋으로 앱이 센다. */
	serverTime: string;
	completedAt: string | null;
	canceledAt: string | null;
	canceledBy: "USER" | "OWNER" | null;
	cancelReason: string | null;
	store: {
		id: number;
		name: string;
		address: string;
		addressDetail: string | null;
		phone: string;
		latitude: number;
		longitude: number;
		businessOpenTime: string;
		businessCloseTime: string;
		/** 지금이 영업 요일·영업 시간 안인지. 서버가 Asia/Seoul 기준으로 판정한다. */
		openNow: boolean;
	};
	items: HoldItem[];
}

export interface ActiveHoldResponse {
	hold: HoldDetail | null;
	/** 남은 취소 가능 횟수. 취소·노쇼로 깎이고 하루에 하나씩 최대치까지 찬다. */
	cancelsLeft: number;
	/** 다음 1회가 충전되는 시각. 가득 차 있으면 null. */
	nextCancelCreditAt: string | null;
}

/** 찜 내역의 한 줄. 찜 하나가 상품 하나라 항목 배열 대신 그 상품이 바로 들어 있다. */
export interface HoldSummary {
	id: number;
	status: HoldStatus;
	storeId: number;
	storeName: string;
	productId: number;
	productName: string;
	photoUrl: string;
	qty: number;
	totalPrice: number;
	/** 이 찜이 취소권을 실제로 깎았는지. 유예 안의 취소와 잔액 0 에서의 노쇼는 false. */
	cancelCreditUsed: boolean;
	heldAt: string;
	expiresAt: string;
	completedAt: string | null;
	canceledAt: string | null;
	canceledBy: "USER" | "OWNER" | null;
}

export interface HoldHistory {
	/** 목록의 status 도 지연 만료로 판정되므로 카운트다운은 이 시각을 기준으로 센다. */
	serverTime: string;
	holds: PageResponse<HoldSummary>;
}

export type NotificationType =
	| "HOLD_CREATED"
	| "HOLD_EXPIRING_SOON"
	| "HOLD_EXPIRED"
	| "PICKUP_COMPLETED"
	| "HOLD_UNCONFIRMED"
	| "HOLD_CANCELED_BY_OWNER"
	| "NEARBY_PRODUCT_REGISTERED"
	| "STOCK_RECONFIRM_REQUEST"
	| "NEW_HOLD_RECEIVED";

export interface AppNotification {
	id: number;
	type: NotificationType;
	title: string;
	body: string;
	deepLink: string | null;
	/** 읽지 않았으면 null. */
	readAt: string | null;
	notifiedAt: string;
}

export interface NotificationInbox {
	unreadCount: number;
	notifications: PageResponse<AppNotification>;
}

export interface NotificationsReadResult {
	markedCount: number;
}

/** GET /users/me — 소비자·점주 공용. 약관은 스키마가 항목별로 남기지 않아 시각 한 건뿐이다. */
export interface Me {
	id: number;
	role: UserRole;
	nickname: string;
	phone: string | null;
	marketingOptIn: boolean;
	termsAgreedAt: string;
	joinedAt: string;
}

/** 기본 동네. 한 번도 정한 적이 없으면 location 이 null 이다(404 가 아니다). */
export interface MyLocation {
	location: {
		regionName: string;
		latitude: number;
		longitude: number;
		updatedAt: string;
	} | null;
}

export type StoreCategory =
	| "VEGETABLE"
	| "FRUIT"
	| "MEAT"
	| "SEAFOOD"
	| "DAIRY_EGG"
	| "BAKERY"
	| "PREPARED_FOOD"
	| "ETC";

export type DayOfWeek =
	| "MONDAY"
	| "TUESDAY"
	| "WEDNESDAY"
	| "THURSDAY"
	| "FRIDAY"
	| "SATURDAY"
	| "SUNDAY";

/** O-003. 주소 → 좌표 변환은 서버가 카카오 로컬 API 로 한다 — 앱은 주소 문자열만 보낸다. */
export interface StoreRegisterPayload {
	name: string;
	categories: StoreCategory[];
	postalCode: string | null;
	address: string;
	addressDetail: string | null;
	phone: string;
	businessOpenTime: string;
	businessCloseTime: string;
	businessDays: DayOfWeek[];
	businessRegistrationNumber: string | null;
	applicationNote: string | null;
}

/** O-020. 사진은 URL 문자열 하나다 — 업로드 엔드포인트는 아직 없다. */
export interface ProductRegisterPayload {
	name: string;
	category: ProductCategory;
	initialQty: number;
	originalPrice: number;
	salePrice: number;
	photoUrl: string;
	ingredientTags: number[];
	/** 미입력이면 서버가 가게 영업 종료 시각으로 채운다. */
	pickupEndAt: string | null;
}

/** O-030. 소비자용 상품 상세와 달리 재고 원장(최초 등록 · 방문 예정 · 픽업 완료)이 들어 있다. */
export interface OwnerProductDetail {
	id: number;
	name: string;
	category: ProductCategory;
	initialQty: number;
	availableQty: number;
	heldQty: number;
	completedQty: number;
	originalPrice: number;
	salePrice: number;
	discountRate: number;
	pickupStartAt: string;
	pickupEndAt: string;
	photoUrl: string;
	/** 재료 id 만 온다 — 이름을 주는 API 가 없어 화면에 숫자가 그대로 보인다. */
	ingredientTags: number[];
	status: ProductStatus;
	reconfirmSentAt: string | null;
	reconfirmAnsweredAt: string | null;
	/** 재고 재확인 모달(O-050)을 띄워야 하는지. 보낸 뒤 아직 답하지 않은 상태. */
	reconfirmPending: boolean;
	/** 「네, 맞아요」로 확정한 상품은 픽업 마감까지 못 고친다. 마감된 상품도 false. */
	stockEditable: boolean;
	activeHoldQty: number;
	/** 찜이 선반 수량을 넘는 만큼. 선착순 취소 대상 수량이다. */
	shortfallQty: number;
	/** 매장에 실제로 있는 총 수량(찜 포함). 점주가 O-030 에서 적는 값. */
	stockQty: number;
	createdAt: string;
}

export interface OwnerHomeVisit {
	holdId: number;
	nickname: string;
	summary: string;
	totalQty: number;
	expiresAt: string;
}

export interface OwnerHomeProductCard {
	id: number;
	name: string;
	category: ProductCategory;
	photoUrl: string;
	salePrice: number;
	availableQty: number;
	activeHoldQty: number;
	shortfallQty: number;
	/** 선반이 감당 못 하는 찜의 **임자 수**. 「N명은 제품 구매가 불가능해요」는 이 값이다. */
	shortfallCustomerCount: number;
	status: ProductStatus;
	reconfirmPending: boolean;
}

/** O-010. 점주 홈 한 화면을 위한 조합 응답(com.swyp.backend.home). */
export interface OwnerHome {
	/** 카운트다운 기준 시각. 단말 시계 대신 이걸 쓴다. */
	serverTime: string;
	store: {
		id: number;
		name: string;
		status: StoreStatus;
		categories: StoreCategory[];
	};
	summary: {
		upcomingVisitCount: number;
		completedTodayCount: number;
		onSaleProductCount: number;
	};
	issues: {
		expiredTodayCount: number;
		/** 찜이 선반보다 많은 상품의 수. */
		productsShortOfStock: number;
		/** 그 상품들의 부족분 합계. */
		shortfallQty: number;
	};
	unreadNotificationCount: number;
	reconfirmPendingCount: number;
	hasRegisteredProduct: boolean;
	upcomingVisits: OwnerHomeVisit[];
	/** 지금 판매중인 것만 온다 — 종료 · 품절 상품은 이 목록에 없다. */
	products: OwnerHomeProductCard[];
}

/**
 * O-040-1 「등록된 상품」 탭의 칩. 생략하면 전체다.
 *
 * `SOLD_OUT` 은 상태 컬럼이 아니라 **남은 수량 0** 을 묻는다 — 마감된 상품도 담기고, 전량이 찜된
 * (아직 아무도 안 가져간) 상품도 담긴다. 서버가 모르는 값을 보내면 빈 목록이 아니라 400 이다.
 */
export type OwnerProductFilter = "ALL" | "ON_SALE" | "RUNNING_LOW" | "SOLD_OUT" | "CLOSED";

export interface OwnerProductSummary {
	id: number;
	name: string;
	category: ProductCategory;
	photoUrl: string;
	initialQty: number;
	availableQty: number;
	activeHoldQty: number;
	/** 찜이 선반보다 많을 때 모자란 수량. **개수이지 사람 수가 아니다.** */
	shortfallQty: number;
	/** 선반이 감당 못 하는 찜의 **임자 수**. 「N명은 제품 구매가 불가능해요」는 이 값이다. */
	shortfallCustomerCount: number;
	originalPrice: number;
	salePrice: number;
	discountRate: number;
	pickupEndAt: string;
	status: ProductStatus;
	reconfirmPending: boolean;
	createdAt: string;
}

/** O-040-1. 홈과 달리 **마감 · 품절된 지난 상품까지** 온다. */
export interface OwnerProductList {
	serverTime: string;
	products: PageResponse<OwnerProductSummary>;
}

/** 점주가 보는 찜 상태. 소비자의 CANCELED 가 취소 주체로 갈라진다. */
export type OwnerHoldStatus =
	| "HOLDING"
	| "COMPLETED"
	| "EXPIRED"
	| "CANCELED_BY_OWNER"
	| "CANCELED_BY_USER";

/**
 * 목록을 거를 때 보내는 값. 응답의 `status` 보다 하나 많다 — `CANCELED` 는 **물어볼 수만 있고**
 * 찜이 그 상태로 돌아오지는 않는다(언제나 주체로 갈려서 온다).
 */
export type OwnerHoldFilter = OwnerHoldStatus | "CANCELED";

export interface OwnerHoldSummary {
	id: number;
	groupId: number;
	status: OwnerHoldStatus;
	nickname: string;
	productId: number;
	productName: string;
	qty: number;
	heldAt: string;
	expiresAt: string;
}

/** O-042. 선반이 감당 못 하는 찜 중 **어느 것을 취소할지** 고르기 위한 목록. */
export interface OwnerHoldCancelCandidates {
	/** 재고가 부족한 상품의 수. */
	productsShortOfStock: number;
	/** 서버가 먼저 골라 둔(`suggested`) 찜의 수. */
	suggestedCancelCount: number;
	/** O-043 바텀시트에 그대로 보여줄 안내 문구. 취소된 손님에게 가는 알림 본문과 같다. */
	noticeMessage: string;
	products: OwnerHoldCancelProduct[];
}

export interface OwnerHoldCancelProduct {
	productId: number;
	productName: string;
	stockQty: number;
	heldQty: number;
	shortfallQty: number;
	/** 늦게 찜한 순서로 온다 — 먼저 찜한 사람을 지키기 때문이다. */
	holds: OwnerHoldCancelCandidate[];
}

export interface OwnerHoldCancelCandidate {
	holdId: number;
	/** 이 상품을 몇 번째로 찜했는지(1부터). */
	heldOrder: number;
	heldAt: string;
	nickname: string;
	qty: number;
	lineTotal: number;
	/** 서버가 먼저 고른 것. 선반에 배정하고 남는 찜이다. */
	suggested: boolean;
}

export interface OwnerHoldCounts {
	all: number;
	holding: number;
	completed: number;
	expired: number;
	/** 점주 취소 + 손님 취소. */
	canceled: number;
	canceledByOwner: number;
	canceledByUser: number;
}

export interface OwnerHoldList {
	/** 남은 시간 계산의 기준 시각. */
	serverTime: string;
	counts: OwnerHoldCounts;
	holds: PageResponse<OwnerHoldSummary>;
}

export interface OwnerHoldDetail {
	groupId: number;
	status: OwnerHoldStatus;
	nickname: string;
	storeName: string;
	totalQty: number;
	totalPrice: number;
	items: {
		holdId: number;
		productId: number;
		productName: string;
		photoUrl: string;
		qty: number;
		unitPrice: number;
		lineTotal: number;
	}[];
	heldAt: string;
	expiresAt: string;
	serverTime: string;
	completedAt: string | null;
	canceledAt: string | null;
	cancelReason: string | null;
}

export type DevicePlatform = "ANDROID" | "IOS";

/** 업로드가 돌려주는 것. 이 URL 만 상품 사진으로 등록할 수 있다. */
export interface ProductPhoto {
	photoUrl: string;
}

/** O-021. 등록 전에 서버가 같은 규칙(할인율 · 픽업 창)으로 계산해 돌려주는 미리보기. 저장하지 않는다. */
export interface ProductPreview {
	name: string;
	category: ProductCategory;
	photoUrl: string;
	initialQty: number;
	originalPrice: number;
	salePrice: number;
	discountRate: number;
	pickupStartAt: string;
	pickupEndAt: string;
	ingredientTags: number[];
}
