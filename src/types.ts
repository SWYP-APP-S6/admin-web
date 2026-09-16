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
	/** 수량 스테퍼의 하한. 재확인 전에는 최초 등록의 일부, 그 뒤로는 0. */
	minAdjustableQty: number;
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
	status: ProductStatus;
	reconfirmPending: boolean;
}

/** O-010. 점주 홈 한 화면을 위한 조합 응답(com.swyp.backend.home). */
export interface OwnerHome {
	store: {
		id: number;
		name: string;
		status: StoreStatus;
		categories: StoreCategory[];
	};
	summary: {
		upcomingVisitCount: number;
		completedTodayCount: number;
		onSaleQty: number;
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

/** 점주가 보는 찜 상태. 소비자의 CANCELED 가 취소 주체로 갈라진다. */
export type OwnerHoldStatus =
	| "HOLDING"
	| "COMPLETED"
	| "EXPIRED"
	| "CANCELED_BY_OWNER"
	| "CANCELED_BY_USER";

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

export interface OwnerHoldCounts {
	all: number;
	holding: number;
	completed: number;
	expired: number;
	canceledByOwner: number;
	canceledByUser: number;
}

export interface OwnerHoldList {
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
