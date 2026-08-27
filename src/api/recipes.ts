import { request } from "./client";
import type { PageResponse, RecipeDetail, RecipeSummary } from "../types";

export function fetchRecipes(params: {
	page: number;
	size: number;
	category?: string;
}): Promise<PageResponse<RecipeSummary>> {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});
	if (params.category) {
		query.set("category", params.category);
	}
	return request<PageResponse<RecipeSummary>>(`/recipes?${query}`);
}

export function fetchRecipe(id: number): Promise<RecipeDetail> {
	return request<RecipeDetail>(`/recipes/${id}`);
}

export function fetchCategories(): Promise<string[]> {
	return request<string[]>("/recipes/categories");
}
