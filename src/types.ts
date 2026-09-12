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
	businessRegistrationNumber: string | null;
	applicationNote: string | null;
}

export type ProductCategory =
	| "VEGETABLE"
	| "FRUIT"
	| "MEAT"
	| "SEAFOOD"
	| "SIDE_DISH"
	| "ETC";

export type NearbyProductSort = "DISTANCE" | "PICKUP_DEADLINE";

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
	id: number;
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

export interface HoldSummaryItem {
	productId: number;
	name: string;
	photoUrl: string;
	qty: number;
	lineTotal: number;
}

/** 찜 내역의 한 줄. 상세(HoldDetail)와 달리 가게 블록 대신 이름만 들고 온다. */
export interface HoldSummary {
	id: number;
	status: HoldStatus;
	storeId: number;
	storeName: string;
	totalQty: number;
	totalPrice: number;
	items: HoldSummaryItem[];
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
