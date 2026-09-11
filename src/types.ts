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

export type HoldButtonState = "AVAILABLE" | "ALREADY_HOLDING" | "SOLD_OUT" | "CLOSED";

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
	/** 내가 진행 중인 찜. 없으면 null. */
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

export interface HoldDetail {
	id: number;
	status: HoldStatus;
	qty: number;
	unitPrice: number;
	totalPrice: number;
	heldAt: string;
	expiresAt: string;
	/** 서버 기준 현재 시각. 클라이언트 시계가 틀어져도 카운트다운이 맞도록 쓴다. */
	serverTime: string;
	completedAt: string | null;
	canceledAt: string | null;
	canceledBy: "USER" | "OWNER" | null;
	cancelReason: string | null;
	product: {
		id: number;
		name: string;
		photoUrl: string;
		originalPrice: number;
		salePrice: number;
		discountRate: number;
		status: ProductStatus;
	};
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
	};
}
