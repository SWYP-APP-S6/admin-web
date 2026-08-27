import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchRecipe } from "../api/recipes";
import { useAsync } from "../hooks/useAsync";

export function RecipeDetailPage() {
	const { id } = useParams<{ id: string }>();
	const recipeId = Number(id);

	const { data, loading, error } = useAsync(
		useCallback(() => fetchRecipe(recipeId), [recipeId]),
		[recipeId],
	);

	if (loading) {
		return <p className="state">불러오는 중…</p>;
	}
	if (error) {
		return <p className="state state--error">{error.message}</p>;
	}
	if (!data) {
		return null;
	}

	return (
		<article className="detail">
			<Link to="/recipes" className="detail__back">
				← 목록
			</Link>

			<div className="page-head">
				<h1 className="page-title">{data.title}</h1>
				<span className="page-count">#{data.id}</span>
			</div>

			<dl className="facts">
				<div className="facts__item">
					<dt>분류</dt>
					<dd>{data.category ?? "-"}</dd>
				</div>
				<div className="facts__item">
					<dt>조리법</dt>
					<dd>{data.cookMethod ?? "-"}</dd>
				</div>
				<div className="facts__item">
					<dt>조리시간</dt>
					<dd>{data.cookTimeMinutes ? `${data.cookTimeMinutes}분` : "-"}</dd>
				</div>
				<div className="facts__item">
					<dt>인분</dt>
					<dd>{data.servings}</dd>
				</div>
			</dl>

			{data.imageUrl && <img className="detail__image" src={data.imageUrl} alt="" />}

			<h2 className="section-title">재료 ({data.ingredients.length})</h2>
			<ul className="ingredients">
				{data.ingredients.map((ingredient) => (
					<li key={ingredient.seq} className="ingredients__item">
						<span>{ingredient.ingredientName ?? ingredient.rawText ?? "-"}</span>
						<span className="ingredients__amount">
							{ingredient.amount ? `${ingredient.amount}${ingredient.unit ?? ""}` : ""}
						</span>
					</li>
				))}
			</ul>

			<h2 className="section-title">조리 순서 ({data.steps.length})</h2>
			<ol className="steps">
				{data.steps.map((step) => (
					<li key={step.seq} className="steps__item">
						<p className="steps__text">{step.content}</p>
						{step.imageUrl && <img className="steps__image" src={step.imageUrl} alt="" loading="lazy" />}
					</li>
				))}
			</ol>

			{data.nutrition && (
				<>
					<h2 className="section-title">영양 정보 ({data.nutrition.basis})</h2>
					<dl className="facts">
						<div className="facts__item">
							<dt>열량</dt>
							<dd>{data.nutrition.calories ?? "-"}</dd>
						</div>
						<div className="facts__item">
							<dt>탄수화물</dt>
							<dd>{data.nutrition.carbsG ?? "-"}</dd>
						</div>
						<div className="facts__item">
							<dt>단백질</dt>
							<dd>{data.nutrition.proteinG ?? "-"}</dd>
						</div>
						<div className="facts__item">
							<dt>지방</dt>
							<dd>{data.nutrition.fatG ?? "-"}</dd>
						</div>
						<div className="facts__item">
							<dt>나트륨</dt>
							<dd>{data.nutrition.sodiumMg ?? "-"}</dd>
						</div>
					</dl>
				</>
			)}
		</article>
	);
}
