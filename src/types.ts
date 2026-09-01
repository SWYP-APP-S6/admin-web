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

// --- 숏폼 생성 파이프라인 (shorts_maker) --------------------------------------
// 이 백엔드가 프록시하는 별도 서비스의 응답이다. 스키마 소유자가 우리가 아니라서
// 화면이 실제로 쓰는 필드만 좁게 선언한다 — 전부 흉내내면 저쪽이 바뀔 때마다 깨진다.

export interface ShortsHealth {
	ok: boolean;
	schema: number;
	geminiKey: boolean;
	whisperModel: string;
	languages: Record<string, string>;
	activeJob: ShortsJob | null;
}

export interface ShortsJob {
	id: string;
	createdAt: string;
	kind: string;
	target: string;
	status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
	error: string | null;
}

export interface ShortsSource {
	id: number;
	title: string;
	content_type: string;
	language: string | null;
	duration_sec: number | null;
	origin: string | null;
	status: string;
}

export interface ShortsSegment {
	id: number;
	idx: number;
	start_sec: number;
	end_sec: number;
	description: string | null;
	excluded_by: string | null;
	excluded_reason: string | null;
}

export interface ShortsChunk {
	id: number;
	idx: number;
	start_sec: number;
	end_sec: number;
	utteranceCount: number;
	segments: ShortsSegment[];
}

export interface ShortsRun {
	id: number;
	status: string;
	criteria_prompt: string | null;
	error: string | null;
	ranked: {
		ranked?: { idx: number; score: number; reason: string }[];
		excluded?: { idx: number; reason: string }[];
	} | null;
}

export interface ShortsClipReview {
	id: number;
	verdict: "OK" | "NG";
	note: string | null;
}

export interface ShortsClip {
	id: number;
	segment_id: number;
	start_sec: number;
	end_sec: number;
	score: number | null;
	reason: string | null;
	rendered: number;
	description: string | null;
	reviews: ShortsClipReview[];
}

export interface ShortsStageCall {
	id: number;
	stage: string;
	model: string | null;
	input_tokens: number | null;
	output_tokens: number | null;
	thinking_tokens: number | null;
	latency_ms: number | null;
	error: string | null;
}

export interface ShortsUtterance {
	idx: number;
	start_sec: number;
	end_sec: number;
	text: string;
	avg_logprob: number | null;
}

export interface ShortsCost {
	llmCalls: number;
	inputTokens: number;
	outputTokens: number;
	thinkingTokens: number;
	billedOutputTokens: number;
	usd: number;
	krw: number;
	rate: {
		inputUsdPer1M: number;
		outputUsdPer1M: number;
		usdKrw: number;
		model: string;
	};
}

export interface ShortsMediaItem {
	name: string;
	sizeBytes: number;
	sourceId: number | null;
	title: string | null;
	durationSec: number | null;
}

export interface ShortsDisk {
	totalBytes: number;
	usedBytes: number;
	freeBytes: number;
	sourcesBytes: number;
	workBytes: number;
}

export interface ShortsMediaList {
	items: ShortsMediaItem[];
	disk: ShortsDisk;
}

export interface ShortsRemoval {
	removed: string[];
	freedBytes: number;
	sourceId: number | null;
}

export interface ShortsSourceDetail {
	source: ShortsSource;
	chunks: ShortsChunk[];
	runs: ShortsRun[];
	clips: ShortsClip[];
	cost: ShortsCost;
	stageCalls: ShortsStageCall[];
}
