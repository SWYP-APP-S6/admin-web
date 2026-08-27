import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCategories, fetchRecipes } from "../api/recipes";
import { useAsync } from "../hooks/useAsync";

const PAGE_SIZE = 20;

export function RecipeListPage() {
	// 페이지·필터를 URL 에 둔다. 새로고침과 뒤로가기가 그대로 동작하고 링크로 공유된다.
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const category = searchParams.get("category") ?? "";

	const categories = useAsync(fetchCategories, []);
	const recipes = useAsync(
		useCallback(
			() => fetchRecipes({ page, size: PAGE_SIZE, category: category || undefined }),
			[page, category],
		),
		[page, category],
	);

	function selectCategory(next: string) {
		const params = new URLSearchParams();
		if (next) {
			params.set("category", next);
		}
		setSearchParams(params);
	}

	function goToPage(next: number) {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(next));
		setSearchParams(params);
	}

	return (
		<section>
			<div className="page-head">
				<h1 className="page-title">레시피</h1>
				{recipes.data && (
					<span className="page-count">총 {recipes.data.totalElements.toLocaleString()}건</span>
				)}
			</div>

			<div className="filters">
				<button
					type="button"
					className={category === "" ? "chip chip--active" : "chip"}
					onClick={() => selectCategory("")}
				>
					전체
				</button>
				{categories.data?.map((name) => (
					<button
						key={name}
						type="button"
						className={category === name ? "chip chip--active" : "chip"}
						onClick={() => selectCategory(name)}
					>
						{name}
					</button>
				))}
			</div>

			{recipes.loading && <p className="state">불러오는 중…</p>}
			{recipes.error && <p className="state state--error">{recipes.error.message}</p>}

			{recipes.data && (
				<>
					<div className="grid">
						{recipes.data.content.map((recipe) => (
							<Link key={recipe.id} to={`/recipes/${recipe.id}`} className="card">
								{recipe.imageThumbUrl ? (
									<img className="card__image" src={recipe.imageThumbUrl} alt="" loading="lazy" />
								) : (
									<div className="card__image card__image--empty" />
								)}
								<div className="card__body">
									<span className="card__title">{recipe.title}</span>
									<span className="card__meta">
										{recipe.category ?? "미분류"} · 조회 {recipe.viewCount}
									</span>
								</div>
							</Link>
						))}
					</div>

					{recipes.data.content.length === 0 && <p className="state">결과가 없습니다.</p>}

					<div className="pager">
						<button
							type="button"
							className="button"
							disabled={page <= 0}
							onClick={() => goToPage(page - 1)}
						>
							이전
						</button>
						<span className="pager__status">
							{recipes.data.page + 1} / {Math.max(recipes.data.totalPages, 1)}
						</span>
						<button
							type="button"
							className="button"
							disabled={recipes.data.last}
							onClick={() => goToPage(page + 1)}
						>
							다음
						</button>
					</div>
				</>
			)}
		</section>
	);
}
