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
